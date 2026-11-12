import type { GhostMatch, RaidNavigationResult } from "@webgame/types";
import { seopoMapVersion } from "@webgame/types";
import {
  and,
  asc,
  desc,
  eq,
  exists,
  gt,
  gte,
  isNotNull,
  lte,
  ne,
  notInArray,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  ghostSnapshots,
  raidCommands,
  type RaidSession,
  type TransactionClient,
} from "../db";
import { findEnemyNoiseSignals } from "../logic/ghostNoise";
import { patrolsForRaid } from "../logic/ghostPatrols";
import { nodesCloserThan } from "../logic/roadDistances";
import { gameRules } from "../logic/rules";
import { toGhostMatch } from "./ghosts";

export type GhostRoster = NonNullable<RaidSession["ghostRoster"]>;
type Track = GhostRoster["tracks"][number];
interface TimedStep {
  nodeId: string;
  time: number;
}
interface RouteStep extends TimedStep {
  id: string;
}
type TrackedEncounter =
  | { kind: "GHOST"; ghost: GhostMatch }
  | { kind: "NPC_GHOST"; patrolId: string; time: number };
const routeColumns = {
  id: ghostSnapshots.id,
  nodeId: ghostSnapshots.nodeId,
  time: ghostSnapshots.time,
};

export async function loadGhostRoster(
  tx: TransactionClient,
  raid: RaidSession,
) {
  if (raid.ghostRoster) return raid.ghostRoster;

  const defeatedCharacterIds = new Set<string>();
  if (raid.version > 0) {
    // 기존 탐사의 전투 결과에서도 이미 쓰러뜨린 개체를 제외한다.
    const commands = await tx.query.raidCommands.findMany({
      where: and(
        eq(raidCommands.raidId, raid.id),
        eq(raidCommands.kind, "NAVIGATE"),
      ),
      columns: { response: true },
    });
    for (const command of commands) {
      const { battleLog } = command.response as Pick<
        RaidNavigationResult,
        "battleLog"
      >;
      const encounter = battleLog?.encounter;
      if (
        encounter?.kind === "GHOST" &&
        encounter.sourceCharacterId &&
        battleLog?.result.winnerTeamId === "TeamA" &&
        !battleLog.playerDied
      ) {
        defeatedCharacterIds.add(encounter.sourceCharacterId);
      }
    }
  }
  return {
    tracks: [],
    defeatedCharacterIds: [...defeatedCharacterIds],
  } satisfies GhostRoster;
}

export function createGhostTracker(
  tx: TransactionClient,
  roster: GhostRoster,
  userId: string,
  lastTravelTime: number,
  raid: Pick<RaidSession, "id" | "entryNodeId">,
  now = new Date(),
) {
  const { trackedCount, maxAgeDays, rulesVersion, matchWindowMinutes } =
    gameRules.ghost;
  const oldest = new Date(now.getTime() - maxAgeDays * 86400000);
  const eligible = [
    ne(ghostSnapshots.userId, userId),
    eq(ghostSnapshots.rulesVersion, rulesVersion),
    eq(ghostSnapshots.mapVersion, seopoMapVersion),
    gt(ghostSnapshots.hp, 0),
    isNotNull(ghostSnapshots.combatant),
    gte(ghostSnapshots.createdAt, oldest),
    lte(ghostSnapshots.createdAt, now),
  ];
  const laterStep = alias(ghostSnapshots, "later_step");
  const nearby = new Map<string, string[]>();
  const routes = new Map<string, RouteStep[]>();
  const patrols = patrolsForRaid(raid.id, raid.entryNodeId);
  let nextRecruitTime = 0;

  function findClosestStep<T extends TimedStep>(
    steps: T[],
    targetTime: number,
  ) {
    let bestIndex = -1;
    let bestDiff = Infinity;
    for (let index = 0; index < steps.length; index++) {
      const step = steps[index]!;
      if (targetTime > 0 && step.time <= 0) continue;
      const diff = Math.abs(step.time - targetTime);
      if (diff > matchWindowMinutes) continue;
      if (
        diff < bestDiff ||
        (diff === bestDiff &&
          bestIndex !== -1 &&
          step.time <= targetTime &&
          steps[bestIndex]!.time > targetTime) ||
        (diff === bestDiff &&
          bestIndex !== -1 &&
          step.time <= targetTime === steps[bestIndex]!.time <= targetTime)
      ) {
        bestDiff = diff;
        bestIndex = index;
      }
    }
    if (bestIndex === -1) return null;
    return {
      step: steps[bestIndex]!,
      previous: bestIndex > 0 ? steps[bestIndex - 1] : undefined,
    };
  }

  function crosses(
    active: { step: TimedStep; previous?: TimedStep } | null,
    from: number,
    to: number,
  ) {
    if (!active) return false;
    return (
      active.step.nodeId === String(to) ||
      (from !== to &&
        active.step.nodeId === String(from) &&
        active.previous?.nodeId === String(to))
    );
  }

  async function routeFor(track: Track) {
    const cached = routes.get(track.sourceRaidId);
    if (cached) return cached;

    const steps = await tx
      .select(routeColumns)
      .from(ghostSnapshots)
      .where(
        and(
          ...eligible,
          eq(ghostSnapshots.raidId, track.sourceRaidId),
          lte(ghostSnapshots.createdAt, new Date(track.recordedThrough)),
          lte(ghostSnapshots.time, track.lastTime),
        ),
      )
      .orderBy(asc(ghostSnapshots.time), asc(ghostSnapshots.id));
    routes.set(track.sourceRaidId, steps);
    return steps;
  }

  async function fill(time: number, playerNode: number, initial = false) {
    const vacancies = trackedCount - roster.tracks.length;
    if (vacancies <= 0 || (!initial && time < nextRecruitTime)) return;

    const excluded = [
      ...roster.defeatedCharacterIds,
      ...roster.tracks.map((track) => track.characterId),
    ];
    const available = and(
      ...eligible,
      isNotNull(ghostSnapshots.raidId),
      isNotNull(ghostSnapshots.characterId),
      excluded.length > 0
        ? notInArray(ghostSnapshots.characterId, excluded)
        : undefined,
    );
    const minWindowTime = initial ? 0 : Math.max(1, time - matchWindowMinutes);
    const maxWindowTime = initial ? 0 : time + matchWindowMinutes;

    if (!initial) {
      const [next] = await tx
        .select({ time: ghostSnapshots.time })
        .from(ghostSnapshots)
        .where(
          and(
            available,
            gte(ghostSnapshots.time, minWindowTime),
            lte(ghostSnapshots.time, lastTravelTime + matchWindowMinutes),
          ),
        )
        .orderBy(asc(ghostSnapshots.time))
        .limit(1);
      if (!next) {
        nextRecruitTime = lastTravelTime + 1;
        return;
      }
      if (next.time > maxWindowTime) {
        nextRecruitTime = Math.max(0, next.time - matchWindowMinutes);
        return;
      }
    }

    const minimumDistance = initial
      ? gameRules.ghost.minimumEntryDistance
      : gameRules.ghost.minimumRefillDistance;
    const distanceKey = `${playerNode}:${minimumDistance}`;
    let nearbyNodes = nearby.get(distanceKey);
    if (!nearbyNodes) {
      nearbyNodes = nodesCloserThan(playerNode, minimumDistance);
      nearby.set(distanceKey, nearbyNodes);
    }

    const distinct = tx
      .selectDistinctOn([ghostSnapshots.characterId], {
        characterId: ghostSnapshots.characterId,
        sourceRaidId: ghostSnapshots.raidId,
        createdAt: ghostSnapshots.createdAt,
      })
      .from(ghostSnapshots)
      .where(
        and(
          available,
          initial
            ? eq(ghostSnapshots.time, 0)
            : and(
                gte(ghostSnapshots.time, minWindowTime),
                lte(ghostSnapshots.time, maxWindowTime),
              ),
          notInArray(ghostSnapshots.nodeId, nearbyNodes),
          initial
            ? exists(
                tx
                  .select({ id: laterStep.id })
                  .from(laterStep)
                  .where(
                    and(
                      eq(laterStep.raidId, ghostSnapshots.raidId),
                      gt(laterStep.time, 0),
                      eq(laterStep.rulesVersion, rulesVersion),
                      eq(laterStep.mapVersion, seopoMapVersion),
                      gt(laterStep.hp, 0),
                      isNotNull(laterStep.combatant),
                      gte(laterStep.createdAt, oldest),
                      lte(laterStep.createdAt, now),
                    ),
                  ),
              )
            : exists(
                tx
                  .select({ id: laterStep.id })
                  .from(laterStep)
                  .where(
                    and(
                      eq(laterStep.raidId, ghostSnapshots.raidId),
                      gte(laterStep.time, time),
                      eq(laterStep.rulesVersion, rulesVersion),
                      eq(laterStep.mapVersion, seopoMapVersion),
                      gt(laterStep.hp, 0),
                      isNotNull(laterStep.combatant),
                      gte(laterStep.createdAt, oldest),
                      lte(laterStep.createdAt, now),
                    ),
                  ),
              ),
        ),
      )
      .orderBy(
        asc(ghostSnapshots.characterId),
        desc(ghostSnapshots.createdAt),
        asc(ghostSnapshots.id),
      )
      .as("eligible_ghosts");
    const candidates = await tx
      .select()
      .from(distinct)
      .orderBy(desc(distinct.createdAt), asc(distinct.characterId))
      .limit(vacancies);

    for (const candidate of candidates) {
      if (!candidate.sourceRaidId || !candidate.characterId) continue;
      const [last] = await tx
        .select({ time: ghostSnapshots.time })
        .from(ghostSnapshots)
        .where(
          and(...eligible, eq(ghostSnapshots.raidId, candidate.sourceRaidId)),
        )
        .orderBy(desc(ghostSnapshots.time))
        .limit(1);
      if (!last) continue;
      const newTrack: Track = {
        sourceRaidId: candidate.sourceRaidId,
        characterId: candidate.characterId,
        lastTime: last.time,
        recordedThrough: now.toISOString(),
      };
      if (!initial) {
        const steps = await routeFor(newTrack);
        const active = findClosestStep(steps, time);
        if (!active || nearbyNodes.includes(active.step.nodeId)) continue;
      }
      roster.tracks.push(newTrack);
    }
  }

  function activePatrols() {
    const vacancies = trackedCount - roster.tracks.length;
    return patrols
      .filter((patrol) => !roster.defeatedPatrolIds?.includes(patrol.id))
      .slice(0, Math.max(0, vacancies));
  }

  return {
    initialize(entryNodeId: number) {
      return fill(0, entryNodeId, true);
    },
    async match(
      from: number,
      to: number,
      time: number,
      safeArrival: boolean,
    ): Promise<TrackedEncounter | null> {
      roster.tracks = roster.tracks.filter((track) => track.lastTime >= time);
      await fill(time, to);
      if (safeArrival) return null;

      for (const track of roster.tracks) {
        const steps = await routeFor(track);
        const active = findClosestStep(steps, time);
        if (!active || !crosses(active, from, to)) continue;
        const snapshot = await tx.query.ghostSnapshots.findFirst({
          where: eq(ghostSnapshots.id, active.step.id),
        });
        const ghost = snapshot && toGhostMatch(snapshot);
        if (ghost) return { kind: "GHOST", ghost };
      }

      for (const patrol of activePatrols()) {
        const active = findClosestStep(patrol.stepsNear(time), time);
        if (active && crosses(active, from, to))
          return {
            kind: "NPC_GHOST",
            patrolId: patrol.id,
            time: active.step.time,
          };
      }
      return null;
    },
    async noiseSignalsAt(playerNodeId: number, time: number) {
      const positions = new Set<string>();
      for (const track of roster.tracks) {
        const active = findClosestStep(await routeFor(track), time);
        if (active) positions.add(active.step.nodeId);
      }
      for (const patrol of activePatrols()) {
        const active = findClosestStep(patrol.stepsNear(time), time);
        if (active) positions.add(active.step.nodeId);
      }
      return findEnemyNoiseSignals(playerNodeId, positions);
    },
    defeatPatrol(patrolId: string) {
      (roster.defeatedPatrolIds ??= []).push(patrolId);
    },
    defeat(characterId: string) {
      roster.defeatedCharacterIds.push(characterId);
      roster.tracks = roster.tracks.filter(
        (track) => track.characterId !== characterId,
      );
    },
  };
}

import type { RaidNavigationResult } from "@webgame/types";
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
import { nodesCloserThan } from "../logic/roadDistances";
import { gameRules } from "../logic/rules";
import { toGhostMatch } from "./ghosts";

export type GhostRoster = NonNullable<RaidSession["ghostRoster"]>;
type Track = GhostRoster["tracks"][number];
const routeColumns = {
  id: ghostSnapshots.id,
  nodeId: ghostSnapshots.nodeId,
  round: ghostSnapshots.round,
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
  lastTravelRound: number,
  now = new Date(),
) {
  const { trackedCount, maxAgeDays, rulesVersion } = gameRules.ghost;
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
  const routes = new Map<string, Map<number, { id: string; nodeId: string }>>();
  let nextRecruitRound = 0;

  async function fill(round: number, playerNode: number, initial = false) {
    const vacancies = trackedCount - roster.tracks.length;
    if (vacancies <= 0 || (!initial && round < nextRecruitRound)) return;

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
    if (!initial) {
      const [next] = await tx
        .select({ round: ghostSnapshots.round })
        .from(ghostSnapshots)
        .where(
          and(
            available,
            gte(ghostSnapshots.round, round),
            lte(ghostSnapshots.round, lastTravelRound),
          ),
        )
        .orderBy(asc(ghostSnapshots.round))
        .limit(1);
      if (next?.round !== round) {
        nextRecruitRound = next?.round ?? lastTravelRound + 1;
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
          eq(ghostSnapshots.round, round),
          notInArray(ghostSnapshots.nodeId, nearbyNodes),
          initial
            ? exists(
                tx
                  .select({ id: laterStep.id })
                  .from(laterStep)
                  .where(
                    and(
                      eq(laterStep.raidId, ghostSnapshots.raidId),
                      gt(laterStep.round, round),
                      eq(laterStep.rulesVersion, rulesVersion),
                      eq(laterStep.mapVersion, seopoMapVersion),
                      gt(laterStep.hp, 0),
                      isNotNull(laterStep.combatant),
                      gte(laterStep.createdAt, oldest),
                      lte(laterStep.createdAt, now),
                    ),
                  ),
              )
            : undefined,
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
        .select({ round: ghostSnapshots.round })
        .from(ghostSnapshots)
        .where(
          and(...eligible, eq(ghostSnapshots.raidId, candidate.sourceRaidId)),
        )
        .orderBy(desc(ghostSnapshots.round))
        .limit(1);
      if (!last) continue;
      roster.tracks.push({
        sourceRaidId: candidate.sourceRaidId,
        characterId: candidate.characterId,
        lastRound: last.round,
        recordedThrough: now.toISOString(),
      });
    }
  }

  async function routeFor(track: Track, round: number) {
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
          gte(ghostSnapshots.round, round - 1),
          lte(ghostSnapshots.round, Math.min(lastTravelRound, track.lastRound)),
        ),
      )
      .orderBy(asc(ghostSnapshots.round), asc(ghostSnapshots.id));
    const route = new Map(steps.map((step) => [step.round, step]));
    routes.set(track.sourceRaidId, route);
    return route;
  }

  return {
    initialize(entryNodeId: number) {
      return fill(0, entryNodeId, true);
    },
    async match(from: number, to: number, round: number, safeArrival: boolean) {
      roster.tracks = roster.tracks.filter((track) => track.lastRound >= round);
      await fill(round, to);
      if (safeArrival) return null;

      for (const track of roster.tracks) {
        const route = await routeFor(track, round);
        const step = route.get(round);
        if (!step) continue;
        const sameNode = step.nodeId === String(to);
        const oppositeDirection =
          from !== to &&
          step.nodeId === String(from) &&
          route.get(round - 1)?.nodeId === String(to);
        if (!sameNode && !oppositeDirection) continue;
        const snapshot = await tx.query.ghostSnapshots.findFirst({
          where: eq(ghostSnapshots.id, step.id),
        });
        if (snapshot) return toGhostMatch(snapshot);
      }
      return null;
    },
    defeat(characterId: string) {
      roster.defeatedCharacterIds.push(characterId);
      roster.tracks = roster.tracks.filter(
        (track) => track.characterId !== characterId,
      );
    },
  };
}

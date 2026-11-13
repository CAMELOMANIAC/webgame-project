import { randomUUID } from "node:crypto";
import {
  type BuildingActionInput,
  type BuildingActionResult,
  type BuildingEventState,
  calculateEntryDelayMinutes,
  firstMissionNodeId,
  getBuildingDistrict,
  getCatalogItemById,
  getRecipeById,
  type MapBuilding,
  matchesRecipeBase,
  type RaidActionInput,
  type RaidExplorationState,
  type RaidNavigationInput,
  type RaidNavigationResult,
  type RaidNoiseResult,
  type RaidView,
  type RetreatDecisionResult,
  type RetreatResolution,
  seopoMapVersion,
  type StartRaidResult,
} from "@webgame/types";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import mapData from "../../../../packages/types/src/assets/map_graph.json";
import {
  type Character,
  characters,
  characterWeapons,
  type Database,
  raidCommands,
  raidInventoryItems,
  type RaidSession,
  raidSessions,
  type RaidStatus,
  type TransactionClient,
  users,
  weaponMasters,
} from "../db";
import { hanlimNpcs } from "../logic/npcs";
import { hasRoad, pathTravelVisits } from "../logic/roadDistances";
import { type PendingRetreat, retreatChoiceMs, retreatPlaybackLimitMs, sealBattleTimeline } from "../logic/retreat";
import { gameRules } from "../logic/rules";
import {
  applyBattleSettlement,
  type DeferBattle,
  executeGhostBattleInTransaction,
  executeHanlimBattleInTransaction,
  executePatrolGhostBattleInTransaction,
  executeMonsterBattleInTransaction,
} from "./battle";
import {
  createGhostTracker,
  type GhostRoster,
  loadGhostRoster,
} from "./ghostRoster";
import { recordGhosts } from "./ghosts";
import {
  calculateInventoryLoadout,
  calculateInventoryWeight,
  InventoryError,
  mergeIntoStash,
  putInBackpack,
  type SlotsInput,
  SlotsSchema,
  syncLoadoutWithStashInTransaction,
  syncSlotsInTransaction,
  withInventoryTransaction,
} from "./inventory";
import {
  finishMissionRaid,
  missionNeedsRecovery,
  recoverMissionRecord,
} from "./quests";

export const RaidActionSchema = z.object({
  raidId: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
  requestId: z.string().uuid(),
});
export const NavigateSchema = RaidActionSchema.extend({
  path: z
    .array(
      z
        .number()
        .int()
        .min(0)
        .max(mapData.nodes.length - 1),
    )
    .min(1)
    .max(2000),
  destinationBuildingId: z.number().int().nonnegative().optional(),
  equipment: SlotsSchema.shape.equipment.optional(),
  inventory: SlotsSchema.shape.inventory.optional(),
}).refine(
  ({ path, destinationBuildingId }) =>
    path.length > 1 || destinationBuildingId !== undefined,
  { message: "A single-node path requires a destination building" },
).refine(
  (data) => (data.equipment === undefined) === (data.inventory === undefined),
  { message: "Equipment and inventory must be sent together" },
);

export const BuildingActionSchema = RaidActionSchema.extend({
  action: z.enum(["INVESTIGATE", "SEARCH", "CRAFT"]),
  recipeId: z.string().min(1).optional(),
});

export const extractionNodeIds = gameRules.extractionNodeIds;

export function extractRaidExploration(
  encounterTravel: RaidSession["encounterTravel"] | null | undefined,
): RaidExplorationState | undefined {
  if (!encounterTravel) return undefined;
  const lootedBuildingIds = encounterTravel.lootedBuildingIds ?? [];
  const usedCraftBuildingIds = encounterTravel.usedCraftBuildingIds ?? [];
  const buildingEvents = encounterTravel.buildingEvents ?? {};
  if (
    lootedBuildingIds.length === 0 &&
    usedCraftBuildingIds.length === 0 &&
    Object.keys(buildingEvents).length === 0
  ) {
    return undefined;
  }
  return {
    lootedBuildingIds,
    usedCraftBuildingIds,
    buildingEvents,
  };
}

function view(raid: RaidSession): RaidView {
  const exploration = extractRaidExploration(raid.encounterTravel);
  return {
    id: raid.id,
    status: raid.status,
    version: raid.version,
    currentNodeId: raid.currentNodeId,
    currentBuildingId: raid.currentBuildingId,
    time: raid.time,
    ...(exploration ? { exploration } : {}),
  };
}

async function ownedCharacter(
  tx: TransactionClient,
  userId: string,
  characterId: string,
) {
  // 세션 생성의 FK 검사와 활성 세션 갱신이 서로 잠금을 기다리지 않도록 먼저 잠근다.
  await tx.execute(
    sql`SELECT "id" FROM "Character" WHERE "id" = ${characterId} AND "userId" = ${userId} FOR UPDATE`,
  );
  const character = await tx.query.characters.findFirst({
    where: eq(characters.id, characterId),
    with: { activeRaid: true },
  });
  if (!character) throw new InventoryError("Character not found", 404);
  if (character.userId !== userId)
    throw new InventoryError("User does not own this character", 403);
  return character;
}

export async function resetRaidWithoutSession(
  database: Database,
  userId: string,
  characterId: string,
) {
  await withInventoryTransaction(database, async (tx) => {
    const character = await ownedCharacter(tx, userId, characterId);
    if (!character.isRaiding || character.activeRaid?.status === "ACTIVE")
      return;

    const activeSession = await tx.query.raidSessions.findFirst({
      where: and(
        eq(raidSessions.characterId, characterId),
        eq(raidSessions.status, "ACTIVE"),
      ),
      columns: { id: true },
    });
    if (activeSession) return;

    await tx
      .update(characters)
      .set({ isRaiding: false, activeRaidId: null, currentNodeId: 0, time: 0 })
      .where(eq(characters.id, characterId));
  });
}

export async function startRaid(
  database: Database,
  userId: string,
  characterId: string,
  loadout?: SlotsInput,
  entryNodeId = gameRules.startNodeId,
): Promise<StartRaidResult> {
  return withInventoryTransaction(database, async (tx) => {
    await tx.execute(
      sql`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`,
    );
    const character = await ownedCharacter(tx, userId, characterId);
    if (character.activeRaid?.status === "ACTIVE") {
      const ghostRoster = await loadGhostRoster(tx, character.activeRaid);
      const tracker = createGhostTracker(
        tx,
        ghostRoster,
        userId,
        character.activeRaid.time,
        character.activeRaid,
      );
      if (!character.activeRaid.ghostRoster && character.activeRaid.time === 0) {
        await tracker.initialize(character.activeRaid.entryNodeId);
      }
      const noiseSignals = await tracker.noiseSignalsAt(
        character.activeRaid.currentNodeId,
        character.activeRaid.time,
      );
      return {
        status: "success",
        isRaiding: true,
        raid: view(character.activeRaid),
        noiseSignals,
      };
    }
    if (!gameRules.entryNodeIds.includes(entryNodeId))
      throw new InventoryError("선택할 수 없는 진입 지점입니다.");
    const otherActive = await tx.query.characters.findMany({
      where: and(
        eq(characters.userId, userId),
        eq(characters.isRaiding, true),
        ne(characters.id, characterId),
      ),
      columns: { id: true },
    });
    if (otherActive.length > 0)
      throw new InventoryError("Another character is already in a raid", 409);
    const user = await tx.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!user) throw new InventoryError("User not found", 404);
    if (user.selectedCharacterId && user.selectedCharacterId !== characterId)
      throw new InventoryError(
        "Select this character before starting a raid",
        409,
      );
    if (!user.selectedCharacterId)
      await tx
        .update(users)
        .set({ selectedCharacterId: characterId })
        .where(eq(users.id, userId));
    if (character.hp <= 0 || character.isRaiding)
      throw new InventoryError("Character is not ready to start a raid", 409);
    const loadoutSnapshot = loadout
      ? await syncLoadoutWithStashInTransaction(
          tx,
          userId,
          characterId,
          loadout,
        )
      : await calculateInventoryLoadout(tx, characterId);
    const weight = loadoutSnapshot.weight;
    const initialTime = calculateEntryDelayMinutes(loadoutSnapshot.value);
    const [raid] = await tx
      .insert(raidSessions)
      .values({
        characterId,
        entryNodeId,
        currentNodeId: entryNodeId,
        time: initialTime,
      })
      .returning();
    if (!raid) throw new InventoryError("Failed to create raid session", 500);
    await tx
      .update(characters)
      .set({
        isRaiding: true,
        activeRaidId: raid.id,
        currentNodeId: entryNodeId,
        time: initialTime,
        weight,
      })
      .where(eq(characters.id, characterId));
    await recordGhosts(tx, characterId, raid.id, [
      { nodeId: raid.currentNodeId, time: initialTime },
    ]);
    const ghostRoster = await loadGhostRoster(tx, raid);
    const tracker = createGhostTracker(tx, ghostRoster, userId, initialTime, raid);
    await tracker.initialize(raid.entryNodeId);
    const noiseSignals = await tracker.noiseSignalsAt(raid.currentNodeId, initialTime);
    return {
      status: "success",
      isRaiding: true,
      raid: view(raid),
      noiseSignals,
    };
  });
}

export async function getRaidNoiseSignals(
  database: Database,
  userId: string,
  characterId: string,
): Promise<RaidNoiseResult> {
  return withInventoryTransaction(database, async (tx) => {
    const character = await ownedCharacter(tx, userId, characterId);
    if (!character.activeRaid || character.activeRaid.status !== "ACTIVE") {
      return { noiseSignals: [], raidId: null };
    }
    const ghostRoster = await loadGhostRoster(tx, character.activeRaid);
    const tracker = createGhostTracker(
      tx,
      ghostRoster,
      userId,
      character.activeRaid.time,
      character.activeRaid,
    );
    if (!character.activeRaid.ghostRoster && character.activeRaid.time === 0) {
      await tracker.initialize(character.activeRaid.entryNodeId);
    }
    const noiseSignals = await tracker.noiseSignalsAt(
      character.activeRaid.currentNodeId,
      character.activeRaid.time,
    );
    return { noiseSignals, raidId: character.activeRaid.id };
  });
}

interface ActionResult<T> {
  payload: T;
  status?: RaidStatus;
  currentNodeId?: number;
  time?: number;
  ghostRoster?: GhostRoster;
  currentBuildingId?: number | null;
  pendingRetreat?: PendingRetreat;
  encounterTravel?: RaidSession["encounterTravel"];
}

async function performRaidAction<T>(
  database: Database,
  userId: string,
  characterId: string,
  input: RaidActionInput,
  kind: string,
  payload: unknown,
  action: (
    tx: TransactionClient,
    raid: RaidSession,
    character: Character,
  ) => Promise<ActionResult<T>>,
): Promise<T & { raid: RaidView }> {
  const fingerprint = JSON.stringify({ kind, payload });
  return withInventoryTransaction(database, async (tx) => {
    const character = await ownedCharacter(tx, userId, characterId);
    const raid = await tx.query.raidSessions.findFirst({
      where: eq(raidSessions.id, input.raidId),
    });
    if (!raid || raid.characterId !== characterId)
      throw new InventoryError("Raid does not belong to this character", 403);
    const previous = await tx.query.raidCommands.findFirst({
      where: and(
        eq(raidCommands.raidId, raid.id),
        eq(raidCommands.requestId, input.requestId),
      ),
    });
    if (previous) {
      if (previous.fingerprint !== fingerprint)
        throw new InventoryError(
          "Request id was already used for a different action",
          409,
        );
      return previous.response as unknown as T & { raid: RaidView };
    }
    if (
      raid.status !== "ACTIVE" ||
      character.activeRaidId !== raid.id ||
      !character.isRaiding
    ) {
      throw new InventoryError("Raid is not active", 409);
    }
    if (raid.pendingRetreat && !raid.pendingRetreat.resolution)
      throw new InventoryError("전투 결과를 먼저 확정해야 합니다.", 409);
    if (raid.version !== input.expectedVersion)
      throw new InventoryError(
        "Raid state changed; refresh before retrying",
        409,
      );
    const result = await action(tx, raid, character);
    const status = result.status ?? "ACTIVE";
    await finishMissionRaid(tx, userId, raid.id, status);
    const [updated] = await tx
      .update(raidSessions)
      .set({
        version: sql`${raidSessions.version} + 1`,
        status,
        ...(result.currentNodeId !== undefined
          ? { currentNodeId: result.currentNodeId }
          : {}),
        ...(result.currentBuildingId !== undefined ? { currentBuildingId: result.currentBuildingId } : {}),
        pendingRetreat: result.pendingRetreat ?? null,
        ...(result.time !== undefined ? { time: result.time } : {}),
        ...(result.ghostRoster ? { ghostRoster: result.ghostRoster } : {}),
        ...(result.encounterTravel !== undefined
          ? { encounterTravel: result.encounterTravel }
          : {}),
        ...(status === "ACTIVE" ? {} : { endedAt: new Date() }),
      })
      .where(eq(raidSessions.id, raid.id))
      .returning();
    if (!updated) throw new InventoryError("Failed to update raid session", 500);
    await tx
      .update(characters)
      .set(
        status === "ACTIVE"
          ? { currentNodeId: updated.currentNodeId, time: updated.time }
          : { isRaiding: false, activeRaidId: null, currentNodeId: 0, time: 0 },
      )
      .where(eq(characters.id, characterId));
    const response = { ...result.payload, raid: view(updated) };
    const json = JSON.parse(JSON.stringify(response));
    await tx.insert(raidCommands).values({
      raidId: raid.id,
      requestId: input.requestId,
      kind,
      fingerprint,
      response: json,
    });
    return response;
  });
}

export async function getRaidNavigationResult(
  database: Database,
  userId: string,
  characterId: string,
  input: RaidActionInput,
): Promise<RaidNavigationResult | null> {
  return withInventoryTransaction(database, async (tx) => {
    const character = await ownedCharacter(tx, userId, characterId);
    const raid = await tx.query.raidSessions.findFirst({
      where: and(
        eq(raidSessions.id, input.raidId),
        eq(raidSessions.characterId, characterId),
      ),
    });
    if (!raid) throw new InventoryError("Raid not found", 404);

    const command = await tx.query.raidCommands.findFirst({
      where: and(
        eq(raidCommands.raidId, raid.id),
        eq(raidCommands.requestId, input.requestId),
        eq(raidCommands.kind, "NAVIGATE"),
      ),
    });
    if (command) {
      const result = command.response as unknown as RaidNavigationResult;
      if (
        (result.raid.version === raid.version ||
          (result.battleLog?.retreat && result.battleLog.retreat.battleId === raid.pendingRetreat?.id)) &&
        (!character.activeRaidId || character.activeRaidId === raid.id)
      ) {
        return result;
      }
    } else if (
      raid.status === "ACTIVE" &&
      character.activeRaidId === raid.id &&
      character.isRaiding &&
      raid.version === input.expectedVersion
    ) {
      return null;
    }
    throw new InventoryError("탐사 상태가 변경되었습니다.", 409);
  });
}

export async function navigateRaid(
  database: Database,
  userId: string,
  characterId: string,
  input: RaidNavigationInput,
): Promise<RaidNavigationResult> {
  const parsed = NavigateSchema.parse(input);
  const payload = {
    path: parsed.path,
    destinationBuildingId: parsed.destinationBuildingId,
    equipment: parsed.equipment,
    inventory: parsed.inventory,
  };
  return performRaidAction<Omit<RaidNavigationResult, "raid">>(
    database,
    userId,
    characterId,
    parsed,
    "NAVIGATE",
    payload,
    async (tx, raid) => {
      if (raid.mapVersion !== seopoMapVersion)
        throw new InventoryError("Raid map version is not supported", 409);
      if (parsed.path[0] !== raid.currentNodeId)
        throw new InventoryError("Path must start at the current node");
      const isBuildingMove = parsed.path.length === 1;
      if (
        parsed.destinationBuildingId !== undefined &&
        !mapData.buildings.some(
          (building) =>
            building.id === parsed.destinationBuildingId &&
            building.roadNodeId === parsed.path.at(-1),
        )
      ) {
        throw new InventoryError("Destination building is not on the current node");
      }
      for (let index = 1; index < parsed.path.length; index++) {
        if (
          !hasRoad(parsed.path[index - 1]!, parsed.path[index]!)
        )
          throw new InventoryError("Path contains disconnected nodes");
      }
      if (parsed.equipment && parsed.inventory)
        await syncSlotsInTransaction(tx, characterId, {
          equipment: parsed.equipment,
          inventory: parsed.inventory,
        });
      // A building move records one step at the same road node.
      const path = isBuildingMove
        ? [raid.currentNodeId, raid.currentNodeId]
        : parsed.path;
      const plannedVisits = pathTravelVisits(path, raid.time);
      const lastTravelTime = plannedVisits.at(-1)?.time ?? raid.time;
      const missionActive =
        !isBuildingMove &&
        path.indexOf(firstMissionNodeId, 1) !== -1 &&
        (await missionNeedsRecovery(tx, userId));
      const ghostRoster = await loadGhostRoster(tx, raid);
      const tracker = createGhostTracker(
        tx,
        ghostRoster,
        userId,
        lastTravelTime,
        raid,
      );
      if (!raid.ghostRoster && raid.time === 0)
        await tracker.initialize(raid.entryNodeId);
      for (let stopIndex = 1; stopIndex < path.length; stopIndex++) {
        const visit = plannedVisits[stopIndex - 1]!;
        const stopNodeId = visit.nodeId;
        const stopTime = visit.time;
        const isMissionEncounter =
          missionActive && stopNodeId === firstMissionNodeId;
        const encounter = await tracker.match(
          path[stopIndex - 1]!,
          stopNodeId,
          stopTime,
          stopNodeId === gameRules.startNodeId,
        );
        if (encounter || isMissionEncounter) {
          await recordGhosts(
            tx,
            characterId,
            raid.id,
            plannedVisits.slice(0, stopIndex),
          );
          await tx
            .update(characters)
            .set({
              currentNodeId: stopNodeId,
              time: stopTime,
            })
            .where(eq(characters.id, characterId));
          const previousNode = path[stopIndex - 1]!;
          const retreat = prepareRetreat(
            raid, previousNode, stopIndex === 1 ? raid.currentBuildingId : null, isMissionEncounter,
          );
          const battleLog =
            encounter?.kind === "GHOST"
              ? await executeGhostBattleInTransaction(
                  tx,
                  characterId,
                  raid.id,
                  encounter.ghost,
                  retreat.defer,
                )
              : encounter?.kind === "NPC_GHOST"
                ? await executePatrolGhostBattleInTransaction(
                    tx,
                    characterId,
                    encounter.patrolId,
                    encounter.time,
                    retreat.defer,
                  )
                : await executeHanlimBattleInTransaction(tx, characterId, retreat.defer);
          const pendingRetreat = retreat.finish(battleLog);
          if (
            battleLog.result.winnerTeamId === "TeamA" &&
            !battleLog.playerDied
          ) {
            if (encounter?.kind === "GHOST" && encounter.ghost.source.characterId)
              tracker.defeat(encounter.ghost.source.characterId);
            if (encounter?.kind === "NPC_GHOST")
              tracker.defeatPatrol(encounter.patrolId);
            if (isMissionEncounter)
              await recoverMissionRecord(tx, userId, raid.id);
          }
          return {
            payload: { encounterTriggered: true, stopNodeId, battleLog },
            currentNodeId: stopNodeId,
            currentBuildingId: isBuildingMove ? parsed.destinationBuildingId ?? null : null,
            pendingRetreat,
            time: stopTime,
            ghostRoster,
            status: battleLog.playerDied ? "DEAD" : "ACTIVE",
          };
        }
      }
      await recordGhosts(tx, characterId, raid.id, plannedVisits);
      const currentNodeId = path.at(-1)!;
      const noiseSignals = await tracker.noiseSignalsAt(currentNodeId, lastTravelTime);
      return {
        payload: { encounterTriggered: false, noiseSignals },
        currentNodeId,
        currentBuildingId: parsed.destinationBuildingId ?? null,
        time: lastTravelTime,
        ghostRoster,
      };
    },
  );
}

export async function extractRaid(
  database: Database,
  userId: string,
  characterId: string,
  input: RaidActionInput,
) {
  return performRaidAction(
    database,
    userId,
    characterId,
    RaidActionSchema.parse(input),
    "EXTRACT",
    {},
    async (tx, raid) => {
      if (!extractionNodeIds.includes(raid.currentNodeId))
        throw new InventoryError("This node is not an extraction point");
      const character = await ownedCharacter(tx, userId, characterId);
      const inventory = await tx.query.raidInventoryItems.findMany({
        where: eq(raidInventoryItems.characterId, characterId),
      });
      for (const item of inventory)
        await mergeIntoStash(
          tx,
          character.userId,
          item.weaponMasterId,
          item.quantity,
        );
      await tx
        .delete(raidInventoryItems)
        .where(eq(raidInventoryItems.characterId, characterId));
      await tx
        .update(characters)
        .set({ weight: await calculateInventoryWeight(tx, characterId) })
        .where(eq(characters.id, characterId));
      return { payload: { status: "success" }, status: "EXTRACTED" };
    },
  );
}

export async function fightRaidMonster(
  database: Database,
  userId: string,
  characterId: string,
  input: RaidActionInput,
  level = 1,
) {
  return performRaidAction(
    database,
    userId,
    characterId,
    RaidActionSchema.parse(input),
    "BATTLE",
    { level },
    async (tx, raid) => {
      const nextTime = raid.time + gameRules.travel.battleActionMinutes;
      await recordGhosts(tx, characterId, raid.id, [
        { nodeId: raid.currentNodeId, time: nextTime },
      ]);
      const retreat = prepareRetreat(raid, raid.currentNodeId, raid.currentBuildingId, false);
      const battleLog = await executeMonsterBattleInTransaction(
        tx,
        characterId,
        level,
        retreat.defer,
      );
      return {
        payload: battleLog,
        pendingRetreat: retreat.finish(battleLog),
        time: nextTime,
        status: battleLog.playerDied ? "DEAD" : "ACTIVE",
      };
    },
  );
}

function prepareRetreat(
  raid: RaidSession,
  returnNodeId: number,
  returnBuildingId: number | null,
  missionEncounter: boolean,
) {
  let pending: PendingRetreat | undefined;
  const defer: DeferBattle = (log, rewardIds, checkpoint) => {
    const first = [];
    const second = [];
    let split = false;
    for (const entry of log.timeline) {
      const index = entry.events.findIndex((event) => event.id === checkpoint.eventId);
      if (index >= 0) {
        first.push({ ...entry, events: entry.events.slice(0, index + 1) });
        const remaining = entry.events.slice(index + 1);
        if (remaining.length) second.push({ ...entry, events: remaining });
        split = true;
      } else {
        (split ? second : first).push(entry);
      }
    }
    const player = checkpoint.players.find((unit) => unit.id === raid.characterId);
    if (!player || !split) throw new Error("Missing retreat checkpoint");
    const { key, iv, ciphertext } = sealBattleTimeline({ timeline: second, finalState: log.finalState, result: log.result });
    const id = randomUUID();
    const openingLog = {
      initialState: log.initialState,
      timeline: first,
      finalState: { players: checkpoint.players },
      result: {
        winnerTeamId: null,
        reason: "RETREAT_PENDING" as const,
        durationTicks: first.at(-1)!.timestamp,
      },
      playerDied: false,
      rewardItemName: null,
      retreat: { battleId: id, raidId: raid.id, iv, ciphertext },
    };
    pending = {
      id, openingLog, fullLog: { ...log, timeline: [] }, key, rewardIds,
      hp: player.hp, stamina: player.stamina, returnNodeId, returnBuildingId,
      missionEncounter, ready: false,
      deadline: Date.now() + retreatPlaybackLimitMs +
        openingLog.result.durationTicks * 1_000 +
        first.reduce((count, entry) => count + entry.events.length, 0) * 250,
    };
    return openingLog;
  };
  return {
    defer,
    finish(openingLog: PendingRetreat["openingLog"]) {
      if (pending) {
        pending.openingLog = openingLog;
        pending.fullLog.encounter = openingLog.encounter;
      }
      return pending;
    },
  };
}

export async function getPendingRaidBattle(database: Database, userId: string, characterId: string) {
  return withInventoryTransaction(database, async (tx) => {
    const character = await ownedCharacter(tx, userId, characterId);
    const pending = character.activeRaid?.pendingRetreat;
    return { battleLog: pending && !pending.resolution ? pending.openingLog : null };
  });
}

export async function decideRaidBattle(
  database: Database,
  userId: string,
  characterId: string,
  raidId: string,
  battleId: string,
  action: "OPEN" | "RETREAT" | "CONTINUE" | "EXPIRE",
): Promise<RetreatDecisionResult> {
  return withInventoryTransaction(database, async (tx) => {
    const character = await ownedCharacter(tx, userId, characterId);
    const raid = await tx.query.raidSessions.findFirst({
      where: and(eq(raidSessions.id, raidId), eq(raidSessions.characterId, characterId)),
    });
    const pending = raid?.pendingRetreat;
    if (!raid || !pending || pending.id !== battleId)
      throw new InventoryError("전투 결과를 찾을 수 없습니다.", 404);
    if (pending.resolution) return { resolution: pending.resolution };
    const now = Date.now();
    if (now < pending.deadline) {
      if (action === "OPEN" && !pending.ready) {
        pending.ready = true;
        pending.deadline = now + retreatChoiceMs;
        await tx.update(raidSessions).set({ pendingRetreat: pending }).where(eq(raidSessions.id, raid.id));
      }
      if (action !== "RETREAT" || !pending.ready)
        return { remainingMs: Math.max(0, pending.deadline - now), windowMs: retreatChoiceMs };
    }
    const retreated = action === "RETREAT" && now < pending.deadline;
    let status: RaidStatus = "ACTIVE";
    let currentNodeId = raid.currentNodeId;
    let currentBuildingId = raid.currentBuildingId;
    let ghostRoster = raid.ghostRoster;
    let settled: PendingRetreat["fullLog"] | undefined;
    if (retreated) {
      currentNodeId = pending.returnNodeId;
      currentBuildingId = pending.returnBuildingId;
      await tx.update(characters).set({
        hp: pending.hp, stamina: pending.stamina, currentNodeId,
      }).where(eq(characters.id, characterId));
    } else {
      settled = await applyBattleSettlement(tx, character, pending.fullLog, pending.rewardIds);
      if (settled.playerDied) {
        status = "DEAD";
        currentBuildingId = null;
        await tx.update(characters).set({ activeRaidId: null }).where(eq(characters.id, characterId));
        await finishMissionRaid(tx, userId, raid.id, status);
      } else if (settled.result.winnerTeamId === "TeamA") {
        const roster = await loadGhostRoster(tx, raid);
        const tracker = createGhostTracker(tx, roster, userId, raid.time, raid);
        const encounter = settled.encounter;
        if (encounter?.sourceCharacterId) tracker.defeat(encounter.sourceCharacterId);
        if (encounter?.patrolId) tracker.defeatPatrol(encounter.patrolId);
        ghostRoster = roster;
        if (pending.missionEncounter) await recoverMissionRecord(tx, userId, raid.id);
      }
    }
    const nextRaid = {
      ...raid, currentNodeId, currentBuildingId, status, version: raid.version + 1,
    };
    const resolution: RetreatResolution = settled
      ? {
          decision: "CONTINUE", raid: view(nextRaid), key: pending.key,
          rewardItemName: settled.rewardItemName,
        }
      : { decision: "RETREAT", raid: view(nextRaid), hp: pending.hp, stamina: pending.stamina };
    await tx.update(raidSessions).set({
      currentNodeId, currentBuildingId, status, version: nextRaid.version, ghostRoster,
      pendingRetreat: { ...pending, resolution },
      ...(status === "DEAD" && { endedAt: new Date(now) }),
    }).where(eq(raidSessions.id, raid.id));
    return { resolution };
  });
}

export async function expireRaidBattles(database: Database) {
  const expired = await database.query.raidSessions.findMany({
    columns: { id: true, pendingRetreat: true },
    with: { character: { columns: { id: true, userId: true } } },
    where: and(
      eq(raidSessions.status, "ACTIVE"),
      sql`${raidSessions.pendingRetreat}->'resolution' IS NULL
        AND (${raidSessions.pendingRetreat}->>'deadline')::bigint <= ${Date.now()}`,
    ),
    limit: 20,
  });
  for (const { id, character, pendingRetreat } of expired) {
    if (pendingRetreat) {
      await decideRaidBattle(database, character.userId, character.id, id, pendingRetreat.id, "EXPIRE");
    }
  }
}

interface InternalExplorationState extends RaidExplorationState {
  districtLootCounts: Record<string, number>;
}

function readExplorationState(raid: RaidSession): InternalExplorationState {
  const raw = raid.encounterTravel;
  return {
    lootedBuildingIds: [...(raw?.lootedBuildingIds ?? [])],
    districtLootCounts: { ...(raw?.districtLootCounts ?? {}) },
    usedCraftBuildingIds: [...(raw?.usedCraftBuildingIds ?? [])],
    buildingEvents: { ...(raw?.buildingEvents ?? {}) },
  };
}

function writeExplorationState(
  raid: RaidSession,
  next: InternalExplorationState,
): NonNullable<RaidSession["encounterTravel"]> {
  return {
    visitedEdges: raid.encounterTravel?.visitedEdges ?? [],
    remainingDistance: raid.encounterTravel?.remainingDistance ?? 0,
    lootedBuildingIds: next.lootedBuildingIds,
    districtLootCounts: next.districtLootCounts,
    usedCraftBuildingIds: next.usedCraftBuildingIds,
    buildingEvents: next.buildingEvents,
  };
}

async function ensureCatalogItemsInTransaction(
  tx: TransactionClient,
  itemIds: string[],
) {
  const uniqueIds = [...new Set(itemIds)];
  const rows = uniqueIds
    .map((id) => getCatalogItemById(id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .map((item) => ({
      id: item.id,
      name: item.name,
      damage: item.damage,
      staminaCost: item.staminaCost,
      cooldownTicks: item.cooldownTicks,
      castTicks: item.castTicks,
      weight: item.weight,
      value: item.value,
      description: item.description,
      attackType: item.attackType,
      iconKey: item.iconKey,
      effect: item.effect,
    }));
  if (rows.length > 0) {
    await tx.insert(weaponMasters).values(rows).onConflictDoNothing();
  }
}

async function consumeBackpackItemsInTransaction(
  tx: TransactionClient,
  characterId: string,
  requirements: { itemId: string; quantity: number }[],
) {
  const rows = await tx.query.raidInventoryItems.findMany({
    where: eq(raidInventoryItems.characterId, characterId),
    orderBy: [asc(raidInventoryItems.slotIndex)],
  });

  const remainingById = new Map<string, number>();
  for (const row of rows) {
    remainingById.set(
      row.weaponMasterId,
      (remainingById.get(row.weaponMasterId) ?? 0) + row.quantity,
    );
  }
  for (const req of requirements) {
    if ((remainingById.get(req.itemId) ?? 0) < req.quantity) {
      throw new InventoryError("필요한 재료가 부족합니다.", 409);
    }
    remainingById.set(req.itemId, remainingById.get(req.itemId)! - req.quantity);
  }

  for (const req of requirements) {
    let needed = req.quantity;
    for (const row of rows) {
      if (row.weaponMasterId !== req.itemId || needed <= 0) continue;
      if (row.quantity <= needed) {
        await tx
          .delete(raidInventoryItems)
          .where(eq(raidInventoryItems.id, row.id));
        needed -= row.quantity;
        row.quantity = 0;
      } else {
        await tx
          .update(raidInventoryItems)
          .set({ quantity: row.quantity - needed })
          .where(eq(raidInventoryItems.id, row.id));
        row.quantity -= needed;
        needed = 0;
      }
    }
  }
}

export async function executeRaidBuildingAction(
  database: Database,
  userId: string,
  characterId: string,
  input: BuildingActionInput,
  options: { random?: () => number } = {},
): Promise<BuildingActionResult> {
  const parsed = BuildingActionSchema.parse(input);
  const random = options.random ?? Math.random;

  return performRaidAction(
    database,
    userId,
    characterId,
    parsed,
    "BUILDING_ACTION",
    { action: parsed.action, recipeId: parsed.recipeId ?? null },
    async (tx, raid, character) => {
      if (raid.currentBuildingId === null || raid.currentBuildingId === undefined) {
        throw new InventoryError("현재 건물 내부에 있지 않습니다.", 409);
      }
      const building = (mapData.buildings as unknown as MapBuilding[]).find(
        (b) => b.id === raid.currentBuildingId,
      );
      if (!building) {
        throw new InventoryError("건물 정보를 찾을 수 없습니다.", 404);
      }

      const district = getBuildingDistrict(building);
      const exp = readExplorationState(raid);
      const nextTime = raid.time + 10;
      const buildingKey = String(building.id);
      const prevEvent: BuildingEventState = exp.buildingEvents[buildingKey] ?? {
        stage: "INTRO",
        text: "방금 전까지 사람이 있었던 흔적이 보입니다. 아직 내부에 가치 있는 것들이 남아 있을지도 모릅니다.",
      };

      if (parsed.action === "INVESTIGATE") {
        if (prevEvent.stage !== "INTRO") {
          throw new InventoryError("이미 건물 내부 상황을 확인했습니다.", 409);
        }
        const combatTriggered = random() < 0.3;
        if (combatTriggered) {
          const retreat = prepareRetreat(
            raid,
            raid.currentNodeId,
            raid.currentBuildingId,
            false,
          );
          const prefersHanlim =
            building.category === "PUBLIC" ||
            building.category === "INFRA" ||
            building.category === "MEDICAL";
          const [hasHanlimWeapon, hasMonster] = await Promise.all([
            tx.query.weaponMasters.findFirst({
              where: eq(weaponMasters.id, hanlimNpcs.control.weaponId),
            }),
            tx.query.monsterMasters.findFirst(),
          ]);

          const enemyLevel =
            district.kind === "INDUSTRIAL" || district.kind === "MEDICAL"
              ? 3
              : 1;
          const battleLog =
            prefersHanlim && hasHanlimWeapon
              ? await executeHanlimBattleInTransaction(
                  tx,
                  characterId,
                  retreat.defer,
                )
              : hasMonster
                ? await executeMonsterBattleInTransaction(
                    tx,
                    characterId,
                    enemyLevel,
                    retreat.defer,
                  )
                : hasHanlimWeapon
                  ? await executeHanlimBattleInTransaction(
                      tx,
                      characterId,
                      retreat.defer,
                    )
                  : await executePatrolGhostBattleInTransaction(
                      tx,
                      characterId,
                      `npc-building-${building.id}`,
                      nextTime,
                      retreat.defer,
                    );

          exp.buildingEvents[buildingKey] = {
            stage: "READY",
            text: "건물 내부 수색 중 적대 개체와 교전했습니다.",
          };

          const payload: Omit<BuildingActionResult, "raid"> = {
            action: "INVESTIGATE",
            encounterTriggered: true,
            battleLog,
            message: "건물 내부에서 적대 NPC/변이 개체와 조우했습니다!",
          };
          return {
            payload,
            pendingRetreat: retreat.finish(battleLog),
            time: nextTime,
            encounterTravel: writeExplorationState(raid, exp),
            status: battleLog.playerDied ? "DEAD" : "ACTIVE",
          };
        }

        exp.buildingEvents[buildingKey] = {
          stage: "READY",
          text: "내부는 조용합니다. 남은 물자를 수색할 수 있습니다.",
        };
        const payload: Omit<BuildingActionResult, "raid"> = {
          action: "INVESTIGATE",
          encounterTriggered: false,
          message:
            "방금 전까지 누군가 머문 흔적만 남아 있습니다. 주변을 수색할 수 있습니다.",
        };
        return {
          payload,
          time: nextTime,
          encounterTravel: writeExplorationState(raid, exp),
        };
      }

      if (parsed.action === "SEARCH") {
        if (exp.lootedBuildingIds.includes(building.id)) {
          throw new InventoryError("이미 수색을 완료한 건물입니다.", 409);
        }
        const currentDistrictItems = exp.districtLootCounts[district.id] ?? 0;
        const remainingAllowance = district.maxLoot - currentDistrictItems;
        if (remainingAllowance <= 0) {
          exp.lootedBuildingIds.push(building.id);
          exp.buildingEvents[buildingKey] = {
            stage: "CLEARED",
            text: "이 지역에서 얻을 건 다 얻은 것 같다.",
          };
          const payload: Omit<BuildingActionResult, "raid"> = {
            action: "SEARCH",
            encounterTriggered: false,
            obtainedItems: [],
            message: "이 지역에서 얻을 건 다 얻은 것 같다.",
          };
          return {
            payload,
            time: nextTime,
            encounterTravel: writeExplorationState(raid, exp),
          };
        }

        const pool = district.materialIds;
        if (pool.length === 0) {
          throw new InventoryError("수색할 수 있는 자재가 없는 구역입니다.", 409);
        }

        const pickCount = Math.min(
          random() < 0.45 ? 2 : 1,
          remainingAllowance,
        );
        const pickedIds: string[] = [];
        for (let i = 0; i < pickCount; i++) {
          const picked = pool[Math.floor(random() * pool.length) % pool.length];
          if (picked) pickedIds.push(picked);
        }
        await ensureCatalogItemsInTransaction(tx, pickedIds);

        let runningWeight = await calculateInventoryWeight(tx, characterId);
        const obtainedMap = new Map<
          string,
          { weaponMasterId: string; name: string; quantity: number }
        >();
        let totalObtainedQty = 0;
        for (const itemId of pickedIds) {
          const catalogItem = getCatalogItemById(itemId);
          if (!catalogItem) continue;
          if (runningWeight + catalogItem.weight > character.maxWeight) {
            if (obtainedMap.size === 0) {
              throw new InventoryError(
                "소지 중량이 한계를 초과해 아이템을 회수할 수 없습니다.",
                409,
              );
            }
            break;
          }
          await putInBackpack(tx, characterId, itemId, 1);
          runningWeight += catalogItem.weight;
          totalObtainedQty += 1;
          const prev = obtainedMap.get(itemId);
          if (prev) prev.quantity += 1;
          else
            obtainedMap.set(itemId, {
              weaponMasterId: itemId,
              name: catalogItem.name,
              quantity: 1,
            });
        }

        const obtainedItems = [...obtainedMap.values()];
        await tx
          .update(characters)
          .set({ weight: await calculateInventoryWeight(tx, characterId) })
          .where(eq(characters.id, characterId));

        exp.lootedBuildingIds.push(building.id);
        exp.districtLootCounts[district.id] =
          currentDistrictItems + totalObtainedQty;
        exp.buildingEvents[buildingKey] = {
          stage: "CLEARED",
          text: `${obtainedItems.map((i) => `${i.name} x${i.quantity}`).join(", ")} 확보`,
        };

        const payload: Omit<BuildingActionResult, "raid"> = {
          action: "SEARCH",
          encounterTriggered: false,
          obtainedItems,
          message: `건물을 수색해 ${obtainedItems.map((i) => `${i.name} x${i.quantity}`).join(", ")}을(를) 확보했습니다.`,
        };
        return {
          payload,
          time: nextTime,
          encounterTravel: writeExplorationState(raid, exp),
        };
      }

      if (!parsed.recipeId) {
        throw new InventoryError("조합할 레시피 ID가 필요합니다.", 400);
      }
      const recipe = getRecipeById(parsed.recipeId);
      if (!recipe) {
        throw new InventoryError("존재하지 않는 조합식입니다.", 400);
      }
      if (building.category !== recipe.buildingCategory) {
        throw new InventoryError(
          "현재 건물 카테고리에서는 이 조합을 실행할 수 없습니다.",
          409,
        );
      }
      if (exp.usedCraftBuildingIds.includes(building.id)) {
        throw new InventoryError("이미 조합 설비를 사용한 건물입니다.", 409);
      }

      const [equippedList, backpackList] = await Promise.all([
        tx.query.characterWeapons.findMany({
          where: eq(characterWeapons.characterId, characterId),
          with: { weaponMaster: true },
          orderBy: [asc(characterWeapons.slotIndex)],
        }),
        tx.query.raidInventoryItems.findMany({
          where: eq(raidInventoryItems.characterId, characterId),
          with: { weaponMaster: true },
          orderBy: [asc(raidInventoryItems.slotIndex)],
        }),
      ]);

      const baseEquipped = equippedList.find((slot) =>
        matchesRecipeBase(recipe, slot.weaponMaster),
      );
      const baseBackpack = baseEquipped
        ? undefined
        : backpackList.find((slot) =>
            matchesRecipeBase(recipe, slot.weaponMaster),
          );
      if (!baseEquipped && !baseBackpack) {
        throw new InventoryError("조합에 필요한 기반 장비가 없습니다.", 409);
      }

      const materialCountMap = new Map<string, number>();
      for (const matId of recipe.materialIds) {
        materialCountMap.set(matId, (materialCountMap.get(matId) ?? 0) + 1);
      }
      const materialReqs = [...materialCountMap.entries()].map(
        ([itemId, quantity]) => ({ itemId, quantity }),
      );
      if (baseBackpack) {
        materialReqs.push({ itemId: baseBackpack.weaponMasterId, quantity: 1 });
      }
      await consumeBackpackItemsInTransaction(tx, characterId, materialReqs);

      let equippedSlotIndex: number | undefined;
      await ensureCatalogItemsInTransaction(tx, [recipe.resultEquipmentId]);
      if (baseEquipped) {
        await tx
          .delete(characterWeapons)
          .where(eq(characterWeapons.id, baseEquipped.id));
        await tx.insert(characterWeapons).values({
          characterId,
          weaponMasterId: recipe.resultEquipmentId,
          slotIndex: baseEquipped.slotIndex,
        });
        equippedSlotIndex = baseEquipped.slotIndex;
      } else {
        await putInBackpack(tx, characterId, recipe.resultEquipmentId, 1);
      }

      const nextWeight = await calculateInventoryWeight(tx, characterId);
      if (nextWeight > character.maxWeight) {
        throw new InventoryError(
          "조합 완성품 중량이 허용 한계를 초과합니다.",
          409,
        );
      }
      await tx
        .update(characters)
        .set({ weight: nextWeight })
        .where(eq(characters.id, characterId));

      const resultCatalog = getCatalogItemById(recipe.resultEquipmentId);
      const resultName = resultCatalog?.name ?? recipe.resultEquipmentId;
      exp.usedCraftBuildingIds.push(building.id);
      exp.buildingEvents[buildingKey] = {
        stage: "CLEARED",
        text: `${resultName} 조합 완료`,
      };

      const payload: Omit<BuildingActionResult, "raid"> = {
        action: "CRAFT",
        encounterTriggered: false,
        craftedItem: {
          weaponMasterId: recipe.resultEquipmentId,
          name: resultName,
          ...(equippedSlotIndex !== undefined ? { equippedSlotIndex } : {}),
        },
        message: `${resultName} 조합을 완료했습니다. (해당 건물 설비 소진)`,
      };
      return {
        payload,
        time: nextTime,
        encounterTravel: writeExplorationState(raid, exp),
      };
    },
  );
}

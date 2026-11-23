import { randomUUID } from "node:crypto";
import {
  applyExhaustedActionMinutes,
  type BuildingActionInput,
  type BuildingActionResult,
  type BuildingEventDefinition,
  type BuildingEventState,
  calculateBaseRecovery,
  calculateEntryDelayMinutes,
  classifyPathSegmentRisk,
  type EnemyNoiseSignal,
  FATIGUE_RULES,
  type FoodBuffEffect,
  getBuildingDistrict,
  getBuildingEventById,
  getCatalogItemById,
  getEnemyArchetypeById,
  getRecipeById,
  hasBuildingChoiceCondition,
  isBuildingLockedDown,
  isUnarmedLoadout,
  type LootSourceKind,
  type MapBuilding,
  matchesRecipeBase,
  type PathSegmentRisk,
  type PendingLootItem,
  type RaidActionInput,
  type RaidBattleResult,
  type RaidCombatRecord,
  type RaidExplorationState,
  type RaidLootActionInput,
  type RaidLootActionResult,
  type RaidNavigationInput,
  type RaidNavigationLookup,
  type RaidNavigationResult,
  type RaidNoiseResult,
  type RaidPathRiskResult,
  type RaidSettlementSummary,
  type RaidSummaryItem,
  type RaidView,
  resolveBuildingIntroEvent,
  resolveBuildingMaxCraftTier,
  type RetreatDecisionResult,
  type RetreatResolution,
  selectEnemyArchetype,
  seopoMapVersion,
  type StartRaidResult,
  type WeaponEffect,
} from "@webgame/types";
import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
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
import {
  hasRoad,
  pathFatigueCost,
  pathTravelVisits,
} from "../logic/roadDistances";
import { type PendingRetreat, retreatChoiceMs, retreatPlaybackLimitMs, sealBattleTimeline } from "../logic/retreat";
import { gameRules } from "../logic/rules";
import {
  aggregateSummaryItems,
  applyBattleSettlement,
  type DeferBattle,
  executeArchetypeBattleInTransaction,
  executeGhostBattleInTransaction,
  executeMissionBattleInTransaction,
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
  getActiveObjectives,
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
  action: z.enum(["INVESTIGATE", "SEARCH", "CRAFT", "EVENT_CHOICE"]),
  recipeId: z.string().min(1).optional(),
  choiceId: z.string().min(1).optional(),
  equipment: SlotsSchema.shape.equipment.optional(),
  inventory: SlotsSchema.shape.inventory.optional(),
});

export const RaidLootActionSchema = RaidActionSchema.extend({
  action: z.enum([
    "CLAIM_ITEM",
    "CLAIM_ALL",
    "DISCARD_BACKPACK",
    "DISCARD_EQUIPMENT",
    "ABANDON_ALL",
  ]),
  lootId: z.string().trim().min(1).optional(),
  backpackSlotIndex: z.number().int().min(0).optional(),
  equipmentSlotIndex: z.number().int().min(0).max(15).optional(),
  equipment: SlotsSchema.shape.equipment.optional(),
  inventory: SlotsSchema.shape.inventory.optional(),
}).refine(
  (data) => (data.equipment === undefined) === (data.inventory === undefined),
  { message: "Equipment and inventory must be sent together" },
);

export const extractionNodeIds = gameRules.extractionNodeIds;

export function extractRaidExploration(
  encounterTravel: RaidSession["encounterTravel"] | null | undefined,
): RaidExplorationState | undefined {
  if (!encounterTravel) return undefined;
  const lootedBuildingIds = encounterTravel.lootedBuildingIds ?? [];
  const usedCraftBuildingIds = encounterTravel.usedCraftBuildingIds ?? [];
  const buildingEvents = encounterTravel.buildingEvents ?? {};
  const completedEventIds = encounterTravel.completedEventIds ?? [];
  const pendingLoot = encounterTravel.pendingLoot ?? [];
  if (
    lootedBuildingIds.length === 0 &&
    usedCraftBuildingIds.length === 0 &&
    Object.keys(buildingEvents).length === 0 &&
    completedEventIds.length === 0 &&
    pendingLoot.length === 0
  ) {
    return undefined;
  }
  return {
    lootedBuildingIds,
    usedCraftBuildingIds,
    buildingEvents,
    ...(completedEventIds.length > 0 ? { completedEventIds } : {}),
    ...(pendingLoot.length > 0 ? { pendingLoot } : {}),
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
      .set({
        isRaiding: false,
        activeRaidId: null,
        currentNodeId: 0,
        time: 0,
        returnedAt: new Date(),
      })
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
    const recovered = calculateBaseRecovery({
      hp: character.hp,
      maxHp: character.maxHp,
      fatigue: character.fatigue,
      maxFatigue: character.maxFatigue,
      isRaiding: character.isRaiding,
      returnedAt: character.returnedAt,
      now: new Date(),
    });
    if (recovered.hp <= 0 || character.isRaiding)
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
        hp: recovered.hp,
        fatigue: recovered.fatigue,
        returnedAt: null,
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

export async function getRaidPathRisks(
  database: Database,
  userId: string,
  characterId: string,
  path: number[],
): Promise<RaidPathRiskResult> {
  return withInventoryTransaction(database, async (tx) => {
    const character = await ownedCharacter(tx, userId, characterId);
    if (!character.activeRaid || character.activeRaid.status !== "ACTIVE") {
      return { raidId: null, segmentRisks: [] };
    }
    const raid = character.activeRaid;
    if (path.length < 2) {
      return { raidId: raid.id, segmentRisks: [] };
    }
    const plannedVisits = pathTravelVisits(path, raid.time, character.fatigue);
    const lastTravelTime = plannedVisits.at(-1)?.time ?? raid.time;
    const ghostRoster = await loadGhostRoster(tx, raid);
    const tracker = createGhostTracker(
      tx,
      ghostRoster,
      userId,
      lastTravelTime,
      raid,
    );
    if (!raid.ghostRoster && raid.time === 0) {
      await tracker.initialize(raid.entryNodeId);
    }
    const segmentRisks: PathSegmentRisk[] = [];
    for (let stopIndex = 1; stopIndex < path.length; stopIndex++) {
      const fromNode = mapData.nodes[path[stopIndex - 1]!];
      const toNode = mapData.nodes[path[stopIndex]!];
      const visit = plannedVisits[stopIndex - 1];
      // 실제 이동(match)과 같은 순서로 고스트 목록을 갱신한다. 결과는 저장하지 않는다.
      if (visit) await tracker.advance(visit.nodeId, visit.time);
      if (!fromNode || !toNode || !visit) {
        segmentRisks.push("safe");
        continue;
      }
      const hopAreas = await tracker.noiseSignalsAt(visit.nodeId, visit.time);
      segmentRisks.push(
        classifyPathSegmentRisk(
          fromNode.x,
          fromNode.y,
          toNode.x,
          toNode.y,
          hopAreas,
        ),
      );
    }
    return { raidId: raid.id, segmentRisks };
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
        "탐사 상태가 변경되었습니다. 최신 상태를 불러온 뒤 다시 시도하세요.",
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
          : {
              isRaiding: false,
              activeRaidId: null,
              currentNodeId: 0,
              time: 0,
              returnedAt: new Date(),
            },
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
): Promise<RaidNavigationLookup> {
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
        return { status: "APPLIED", result };
      }
      // 이미 반영된 요청이며, 이후 다른 행동으로 탐사 상태가 바뀌었다.
      return { status: "SUPERSEDED", result: null };
    }
    if (
      raid.status === "ACTIVE" &&
      character.activeRaidId === raid.id &&
      character.isRaiding &&
      raid.version === input.expectedVersion
    ) {
      return { status: "NOT_PROCESSED", result: null };
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
  const parsed = NavigateSchema.parse(input) as RaidNavigationInput;
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
    async (tx, raid, character) => {
      if (raid.mapVersion !== seopoMapVersion)
        throw new InventoryError("Raid map version is not supported", 409);
      if (parsed.path[0] !== raid.currentNodeId)
        throw new InventoryError("Path must start at the current node");
      const isBuildingMove = parsed.path.length === 1;
      let destBuilding: MapBuilding | undefined;
      if (parsed.destinationBuildingId !== undefined) {
        destBuilding = (
          mapData.buildings as unknown as MapBuilding[]
        ).find(
          (building) =>
            building.id === parsed.destinationBuildingId &&
            building.roadNodeId === parsed.path.at(-1),
        );
        if (!destBuilding) {
          throw new InventoryError(
            "Destination building is not on the current node",
          );
        }
        if (isBuildingLockedDown(destBuilding, raid.time, raid.id)) {
          throw new InventoryError("봉쇄된 건물에는 진입할 수 없습니다.", 409);
        }
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
      // 다른 위치로 이동하면 이전 위치의 미회수 전리품은 자동 폐기된다.
      const moveExp = readExplorationState(raid);
      const hadPendingLoot = moveExp.pendingLoot.length > 0;
      moveExp.pendingLoot = [];
      // 건물 진입 시 표시·검증할 이벤트를 서버에서 확정한다.
      const pinnedEventChanged = destBuilding
        ? (
            await pinBuildingIntroEvent(tx, characterId, moveExp, destBuilding, {
              refreshIntro: true,
            })
          ).changed
        : false;
      const shouldWriteExploration = hadPendingLoot || pinnedEventChanged;
      // A building move records one step at the same road node.
      const path = isBuildingMove
        ? [raid.currentNodeId, raid.currentNodeId]
        : parsed.path;
      const plannedVisits = pathTravelVisits(path, raid.time, character.fatigue);
      const lastTravelTime = plannedVisits.at(-1)?.time ?? raid.time;
      // 진행 중인 모든 임무의 확정 목표. 같은 노드 목표는 동시에 수락할 수 없으므로 노드당 하나다.
      const activeObjectives = !isBuildingMove
        ? await getActiveObjectives(tx, userId)
        : [];
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
      const hopNoiseSignals: EnemyNoiseSignal[][] = [];
      for (let stopIndex = 1; stopIndex < path.length; stopIndex++) {
        const visit = plannedVisits[stopIndex - 1]!;
        const stopNodeId = visit.nodeId;
        const stopTime = visit.time;
        const missionAtStop = activeObjectives.find(
          (objective) => objective.targetNodeId === stopNodeId,
        );
        const isMissionEncounter = missionAtStop !== undefined;
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
          const spentFatigue = pathFatigueCost(path.slice(0, stopIndex + 1));
          const nextFatigue = Math.max(0, character.fatigue - spentFatigue);
          await tx
            .update(characters)
            .set({
              currentNodeId: stopNodeId,
              time: stopTime,
              fatigue: nextFatigue,
            })
            .where(eq(characters.id, characterId));
          const previousNode = path[stopIndex - 1]!;
          const retreat = prepareRetreat(
            raid, previousNode, stopIndex === 1 ? raid.currentBuildingId : null, missionAtStop?.questId ?? null,
          );
          const battleLog =
            encounter?.kind === "GHOST"
              ? await executeGhostBattleInTransaction(
                  tx,
                  characterId,
                  raid.id,
                  encounter.ghost,
                  retreat.defer,
                  { deferLootToPending: true },
                )
              : encounter?.kind === "NPC_GHOST"
                ? await executePatrolGhostBattleInTransaction(
                    tx,
                    characterId,
                    encounter.patrolId,
                    encounter.time,
                    retreat.defer,
                    { deferLootToPending: true },
                  )
                : await executeMissionBattleInTransaction(
                    tx,
                    characterId,
                    missionAtStop?.enemyArchetypeId ?? "npc-hanlim-control",
                    retreat.defer,
                    { deferLootToPending: true },
                  );
          const pendingRetreat = retreat.finish(battleLog);
          if (
            battleLog.result.winnerTeamId === "TeamA" &&
            !battleLog.playerDied
          ) {
            if (encounter?.kind === "GHOST" && encounter.ghost.source.characterId)
              tracker.defeat(encounter.ghost.source.characterId);
            if (encounter?.kind === "NPC_GHOST")
              tracker.defeatPatrol(encounter.patrolId);
            if (missionAtStop) {
              await recoverMissionRecord(tx, userId, raid.id, missionAtStop.questId);
              moveExp.missionRecovered = true;
            }
          }
          if (!pendingRetreat) {
            recordBattleOutcome(moveExp, battleLog, stopTime);
            if (!battleLog.playerDied && battleLog.rewardItem) {
              moveExp.pendingLoot.push({
                id: randomUUID(),
                ...battleLog.rewardItem,
                source: "COMBAT",
              });
            }
            if (battleLog.playerDied) {
              moveExp.settlementSummary = buildSettlementSummary({
                raidId: raid.id,
                status: "DEAD",
                elapsedMinutes: stopTime,
                lostItems: battleLog.lostItems ?? [],
                exp: moveExp,
              });
            }
          }
          const encounterTravel =
            !pendingRetreat || shouldWriteExploration || moveExp.pendingLoot.length > 0
              ? writeExplorationState(raid, moveExp)
              : undefined;
          return {
            payload: {
              encounterTriggered: true,
              stopNodeId,
              battleLog,
              ...(hopNoiseSignals.length > 0 ? { hopNoiseSignals } : {}),
            },
            currentNodeId: stopNodeId,
            currentBuildingId: isBuildingMove ? parsed.destinationBuildingId ?? null : null,
            pendingRetreat,
            time: stopTime,
            ghostRoster,
            ...(encounterTravel !== undefined ? { encounterTravel } : {}),
            status: battleLog.playerDied ? "DEAD" : "ACTIVE",
          };
        }
        hopNoiseSignals.push(await tracker.noiseSignalsAt(stopNodeId, stopTime));
      }
      await recordGhosts(tx, characterId, raid.id, plannedVisits);
      const spentFatigue = pathFatigueCost(path);
      const nextFatigue = Math.max(0, character.fatigue - spentFatigue);
      if (nextFatigue !== character.fatigue) {
        await tx
          .update(characters)
          .set({ fatigue: nextFatigue })
          .where(eq(characters.id, characterId));
      }
      const currentNodeId = path.at(-1)!;
      const noiseSignals =
        hopNoiseSignals.at(-1) ??
        (await tracker.noiseSignalsAt(currentNodeId, lastTravelTime));
      return {
        payload: {
          encounterTriggered: false,
          noiseSignals,
          ...(hopNoiseSignals.length > 0 ? { hopNoiseSignals } : {}),
        },
        currentNodeId,
        currentBuildingId: parsed.destinationBuildingId ?? null,
        time: lastTravelTime,
        ghostRoster,
        ...(shouldWriteExploration
          ? { encounterTravel: writeExplorationState(raid, moveExp) }
          : {}),
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
    RaidActionSchema.parse(input) as RaidActionInput,
    "EXTRACT",
    {},
    async (tx, raid) => {
      if (!extractionNodeIds.includes(raid.currentNodeId))
        throw new InventoryError("This node is not an extraction point");
      const character = await ownedCharacter(tx, userId, characterId);
      const inventory = await tx.query.raidInventoryItems.findMany({
        where: eq(raidInventoryItems.characterId, characterId),
        with: { weaponMaster: true },
      });
      const recoveredItems = aggregateSummaryItems(
        inventory.map((item) => ({
          weaponMasterId: item.weaponMasterId,
          quantity: item.quantity,
          weaponMaster: item.weaponMaster,
        })),
      );
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
        .set({
          weight: await calculateInventoryWeight(tx, characterId),
          activeFoodBuff: null,
        })
        .where(eq(characters.id, characterId));
      const exp = readExplorationState(raid);
      exp.pendingLoot = [];
      const summary = buildSettlementSummary({
        raidId: raid.id,
        status: "EXTRACTED",
        elapsedMinutes: raid.time,
        recoveredItems,
        exp,
      });
      exp.settlementSummary = summary;
      return {
        payload: { status: "success" as const, summary },
        status: "EXTRACTED",
        encounterTravel: writeExplorationState(raid, exp),
      };
    },
  );
}

export interface UseRaidConsumableInput extends RaidActionInput {
  slotIndex: number;
}

export interface UseRaidConsumableResult {
  status: "success";
  encounterTriggered: boolean;
  hp: number;
  fatigue: number;
  weight: number;
  time: number;
  activeFoodBuff: FoodBuffEffect | null;
  battleLog?: import("@webgame/types").RaidBattleResult;
  noiseSignals?: EnemyNoiseSignal[];
}

export async function useRaidConsumable(
  database: Database,
  userId: string,
  characterId: string,
  input: UseRaidConsumableInput,
) {
  return performRaidAction<UseRaidConsumableResult>(
    database,
    userId,
    characterId,
    input,
    "USE_ITEM",
    { slotIndex: input.slotIndex },
    async (tx, raid) => {
      const character = await ownedCharacter(tx, userId, characterId);
      const row = await tx.query.raidInventoryItems.findFirst({
        where: and(
          eq(raidInventoryItems.characterId, characterId),
          eq(raidInventoryItems.slotIndex, input.slotIndex),
        ),
        with: { weaponMaster: true },
      });
      if (!row) throw new InventoryError("Item not found in backpack");

      const effect = row.weaponMaster.effect as WeaponEffect | null;
      const consumable = effect?.consumable;
      if (!consumable) {
        throw new InventoryError("Item is not consumable");
      }

      if (row.quantity > 1) {
        await tx
          .update(raidInventoryItems)
          .set({ quantity: sql`${raidInventoryItems.quantity} - 1` })
          .where(eq(raidInventoryItems.id, row.id));
      } else {
        await tx
          .delete(raidInventoryItems)
          .where(eq(raidInventoryItems.id, row.id));
      }

      const nextHp = Math.min(
        character.maxHp,
        character.hp + (consumable.hpRestore ?? 0),
      );
      const nextFatigue = Math.min(
        character.maxFatigue,
        character.fatigue + (consumable.fatigueRestore ?? 0),
      );
      const nextBuff: FoodBuffEffect | null | undefined =
        consumable.category === "FOOD" && consumable.buff
          ? {
              id: row.weaponMaster.id,
              name: row.weaponMaster.name,
              ...consumable.buff,
            }
          : undefined;
      const nextWeight = await calculateInventoryWeight(tx, characterId);
      const nextTime = raid.time + consumable.useMinutes;

      await tx
        .update(characters)
        .set({
          hp: nextHp,
          fatigue: nextFatigue,
          weight: nextWeight,
          time: nextTime,
          ...(nextBuff !== undefined ? { activeFoodBuff: nextBuff } : {}),
        })
        .where(eq(characters.id, characterId));

      const resolvedBuff =
        nextBuff !== undefined ? nextBuff : (character.activeFoodBuff ?? null);

      if (consumable.useMinutes <= 0) {
        return {
          payload: {
            status: "success" as const,
            encounterTriggered: false,
            hp: nextHp,
            fatigue: nextFatigue,
            weight: nextWeight,
            time: nextTime,
            activeFoodBuff: resolvedBuff,
          },
        };
      }

      const ghostRoster = await loadGhostRoster(tx, raid);
      const tracker = createGhostTracker(
        tx,
        ghostRoster,
        userId,
        nextTime,
        raid,
      );
      const encounter = await tracker.match(
        raid.currentNodeId,
        raid.currentNodeId,
        nextTime,
        raid.currentNodeId === gameRules.startNodeId,
      );
      await recordGhosts(tx, characterId, raid.id, [
        { nodeId: raid.currentNodeId, time: nextTime },
      ]);

      if (encounter) {
        const exp = readExplorationState(raid);
        const hadPendingLoot = exp.pendingLoot.length > 0;
        const retreat = prepareRetreat(
          raid,
          raid.currentNodeId,
          raid.currentBuildingId,
          null,
        );
        const battleLog =
          encounter.kind === "GHOST"
            ? await executeGhostBattleInTransaction(
                tx,
                characterId,
                raid.id,
                encounter.ghost,
                retreat.defer,
                { deferLootToPending: true },
              )
            : await executePatrolGhostBattleInTransaction(
                tx,
                characterId,
                encounter.patrolId,
                encounter.time,
                retreat.defer,
                { deferLootToPending: true },
              );
        const pendingRetreat = retreat.finish(battleLog);
        if (
          battleLog.result.winnerTeamId === "TeamA" &&
          !battleLog.playerDied
        ) {
          if (encounter.kind === "GHOST" && encounter.ghost.source.characterId) {
            tracker.defeat(encounter.ghost.source.characterId);
          }
          if (encounter.kind === "NPC_GHOST") {
            tracker.defeatPatrol(encounter.patrolId);
          }
        }
        if (!pendingRetreat) {
          recordBattleOutcome(exp, battleLog, nextTime);
          if (!battleLog.playerDied && battleLog.rewardItem) {
            exp.pendingLoot.push({
              id: randomUUID(),
              ...battleLog.rewardItem,
              source: "COMBAT",
            });
          }
          if (battleLog.playerDied) {
            exp.settlementSummary = buildSettlementSummary({
              raidId: raid.id,
              status: "DEAD",
              elapsedMinutes: nextTime,
              lostItems: battleLog.lostItems ?? [],
              exp,
            });
          }
        }
        const encounterTravel =
          !pendingRetreat || hadPendingLoot || exp.pendingLoot.length > 0
            ? writeExplorationState(raid, exp)
            : undefined;
        return {
          payload: {
            status: "success" as const,
            encounterTriggered: true,
            hp: nextHp,
            fatigue: nextFatigue,
            weight: nextWeight,
            time: nextTime,
            activeFoodBuff: resolvedBuff,
            battleLog,
          },
          pendingRetreat,
          time: nextTime,
          ghostRoster,
          ...(encounterTravel !== undefined ? { encounterTravel } : {}),
          status: battleLog.playerDied ? "DEAD" : "ACTIVE",
        };
      }

      const noiseSignals = await tracker.noiseSignalsAt(
        raid.currentNodeId,
        nextTime,
      );
      return {
        payload: {
          status: "success" as const,
          encounterTriggered: false,
          hp: nextHp,
          fatigue: nextFatigue,
          weight: nextWeight,
          time: nextTime,
          activeFoodBuff: resolvedBuff,
          noiseSignals,
        },
        time: nextTime,
        ghostRoster,
      };
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
    RaidActionSchema.parse(input) as RaidActionInput,
    "BATTLE",
    { level },
    async (tx, raid) => {
      const nextTime = raid.time + gameRules.travel.battleActionMinutes;
      await recordGhosts(tx, characterId, raid.id, [
        { nodeId: raid.currentNodeId, time: nextTime },
      ]);
      const retreat = prepareRetreat(raid, raid.currentNodeId, raid.currentBuildingId, null);
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
  missionQuestId: string | null,
) {
  const missionEncounter = missionQuestId !== null;
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
      hp: player.hp, returnNodeId, returnBuildingId,
      missionEncounter, ready: false,
      ...(missionQuestId ? { missionQuestId } : {}),
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
  return withInventoryTransaction(database, async (tx): Promise<RetreatDecisionResult> => {
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
    const exp = readExplorationState(raid);
    if (retreated) {
      currentNodeId = pending.returnNodeId;
      currentBuildingId = pending.returnBuildingId;
      recordBattleOutcome(exp, pending.fullLog, raid.time, "RETREAT");
      await tx.update(characters).set({
        hp: pending.hp, stamina: character.maxStamina, currentNodeId,
      }).where(eq(characters.id, characterId));
    } else {
      settled = await applyBattleSettlement(
        tx,
        character,
        pending.fullLog,
        pending.rewardIds,
        { deferLootToPending: true },
      );
      recordBattleOutcome(exp, settled, raid.time);
      if (settled.playerDied) {
        status = "DEAD";
        currentBuildingId = null;
        exp.settlementSummary = buildSettlementSummary({
          raidId: raid.id,
          status: "DEAD",
          elapsedMinutes: raid.time,
          lostItems: settled.lostItems ?? [],
          exp,
        });
        await tx.update(characters).set({ activeRaidId: null }).where(eq(characters.id, characterId));
        await finishMissionRaid(tx, userId, raid.id, status);
      } else if (settled.result.winnerTeamId === "TeamA") {
        const roster = await loadGhostRoster(tx, raid);
        const tracker = createGhostTracker(tx, roster, userId, raid.time, raid);
        const encounter = settled.encounter;
        if (encounter?.sourceCharacterId) tracker.defeat(encounter.sourceCharacterId);
        if (encounter?.patrolId) tracker.defeatPatrol(encounter.patrolId);
        ghostRoster = roster;
        // 전투 시작 때 확정한 임무만 회수한다(이전 형식 기록은 진행 중 첫 목표로 대체).
        const missionQuestId = pending.missionEncounter
          ? (pending.missionQuestId ?? (await getActiveObjectives(tx, userId))[0]?.questId)
          : undefined;
        if (missionQuestId) {
          await recoverMissionRecord(tx, userId, raid.id, missionQuestId);
          exp.missionRecovered = true;
        }
      }
    }
    if (settled && !settled.playerDied && settled.rewardItem) {
      exp.pendingLoot.push({
        id: randomUUID(),
        ...settled.rewardItem,
        source: "COMBAT",
      });
    }
    const encounterTravel = writeExplorationState(raid, exp);
    const nextRaid = {
      ...raid,
      currentNodeId,
      currentBuildingId,
      status,
      encounterTravel,
      version: raid.version + 1,
    };
    const resolution: RetreatResolution = settled
      ? {
          decision: "CONTINUE", raid: view(nextRaid), key: pending.key,
          rewardItemName: settled.rewardItemName,
        }
      : { decision: "RETREAT", raid: view(nextRaid), hp: pending.hp, stamina: character.maxStamina };
    await tx.update(raidSessions).set({
      currentNodeId, currentBuildingId, status, version: nextRaid.version, ghostRoster,
      ...(encounterTravel !== undefined ? { encounterTravel } : {}),
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
  completedEventIds: string[];
  pendingLoot: PendingLootItem[];
  combatRecords: RaidCombatRecord[];
  missionRecovered: boolean;
  settlementSummary?: RaidSettlementSummary;
}

function readExplorationState(raid: RaidSession): InternalExplorationState {
  const raw = raid.encounterTravel;
  return {
    lootedBuildingIds: [...(raw?.lootedBuildingIds ?? [])],
    districtLootCounts: { ...(raw?.districtLootCounts ?? {}) },
    usedCraftBuildingIds: [...(raw?.usedCraftBuildingIds ?? [])],
    buildingEvents: { ...(raw?.buildingEvents ?? {}) },
    completedEventIds: [...(raw?.completedEventIds ?? [])],
    pendingLoot: [...(raw?.pendingLoot ?? [])],
    combatRecords: [...(raw?.combatRecords ?? [])],
    missionRecovered: raw?.missionRecovered ?? false,
    ...(raw?.settlementSummary ? { settlementSummary: raw.settlementSummary } : {}),
  };
}

/**
 * 건물에 표시·검증할 이벤트를 서버에서 확정해 `buildingEvents`에 저장합니다.
 * 이미 확정된 이벤트가 있으면 그대로 사용하고, `refreshIntro`이면 아직 아무 행동도
 * 하지 않은(INTRO) 건물의 이벤트를 현재 상태로 다시 확정합니다(건물 재진입 시).
 */
async function pinBuildingIntroEvent(
  tx: TransactionClient,
  characterId: string,
  exp: InternalExplorationState,
  building: MapBuilding,
  options: { refreshIntro: boolean },
): Promise<{ event: BuildingEventDefinition; changed: boolean }> {
  const key = String(building.id);
  const prev = exp.buildingEvents[key];
  const pinned = getBuildingEventById(prev?.eventId);
  const canRefresh = options.refreshIntro && (!prev || prev.stage === "INTRO");
  if (pinned && !canRefresh) return { event: pinned, changed: false };

  const equipped = await tx.query.characterWeapons.findMany({
    where: eq(characterWeapons.characterId, characterId),
    columns: { weaponMasterId: true },
  });
  const event = resolveBuildingIntroEvent(
    building,
    getBuildingDistrict(building),
    exp.completedEventIds,
    {
      isUnarmed: isUnarmedLoadout(equipped.map((row) => row.weaponMasterId)),
    },
  );
  if (pinned?.id === event.id) return { event, changed: false };
  exp.buildingEvents[key] =
    prev && prev.stage !== "INTRO"
      ? { ...prev, eventId: event.id }
      : { stage: "INTRO", text: event.introText, eventId: event.id };
  return { event, changed: true };
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
    completedEventIds: next.completedEventIds,
    pendingLoot: next.pendingLoot,
    combatRecords: next.combatRecords,
    missionRecovered: next.missionRecovered,
    ...(next.settlementSummary ? { settlementSummary: next.settlementSummary } : {}),
  };
}

function recordBattleOutcome(
  exp: InternalExplorationState,
  battleLog: Pick<RaidBattleResult, "encounter" | "playerDied" | "result">,
  timeMinutes: number,
  forcedOutcome?: RaidCombatRecord["outcome"],
) {
  const outcome: RaidCombatRecord["outcome"] =
    forcedOutcome ??
    (battleLog.playerDied
      ? "LOSS"
      : battleLog.result.winnerTeamId === "TeamA"
        ? "WIN"
        : "LOSS");
  exp.combatRecords.push({
    enemyName: battleLog.encounter?.name ?? "미확인 개체",
    enemyKind: battleLog.encounter?.kind === "GHOST" ? "GHOST" : "NPC",
    ...(battleLog.encounter?.faction
      ? { faction: battleLog.encounter.faction }
      : {}),
    outcome,
    timeMinutes,
  });
}

function buildSettlementSummary(params: {
  raidId: string;
  status: "EXTRACTED" | "DEAD";
  elapsedMinutes: number;
  recoveredItems?: RaidSummaryItem[];
  lostItems?: RaidSummaryItem[];
  exp: InternalExplorationState;
}): RaidSettlementSummary {
  const recoveredItems = params.recoveredItems ?? [];
  const lostItems = params.lostItems ?? [];
  const totalRecoveredValue = recoveredItems.reduce(
    (sum, item) => sum + item.totalValue,
    0,
  );
  const totalLostValue = lostItems.reduce(
    (sum, item) => sum + item.totalValue,
    0,
  );
  const combatRecords = [...params.exp.combatRecords];
  const defeatedCount = combatRecords.filter(
    (record) => record.outcome === "WIN",
  ).length;
  return {
    raidId: params.raidId,
    status: params.status,
    elapsedMinutes: params.elapsedMinutes,
    recoveredItems,
    lostItems,
    totalRecoveredValue,
    totalLostValue,
    combatRecords,
    encountersCount: combatRecords.length,
    defeatedCount,
    missionRecovered:
      params.status === "EXTRACTED" ? params.exp.missionRecovered : false,
  };
}

export async function getLastRaidSummary(
  database: Database,
  userId: string,
  characterId: string,
): Promise<RaidSettlementSummary | null> {
  const character = await database.query.characters.findFirst({
    where: eq(characters.id, characterId),
    columns: { id: true, userId: true },
  });
  if (!character) throw new InventoryError("Character not found", 404);
  if (character.userId !== userId) {
    throw new InventoryError("User does not own this character", 403);
  }
  const latestEnded = await database.query.raidSessions.findFirst({
    where: and(
      eq(raidSessions.characterId, characterId),
      inArray(raidSessions.status, ["EXTRACTED", "DEAD"]),
    ),
    orderBy: [desc(raidSessions.endedAt), desc(raidSessions.startedAt)],
  });
  if (!latestEnded) return null;
  if (latestEnded.encounterTravel?.settlementSummary) {
    return latestEnded.encounterTravel.settlementSummary;
  }
  const status = latestEnded.status === "DEAD" ? "DEAD" : "EXTRACTED";
  const exp = readExplorationState(latestEnded);
  return buildSettlementSummary({
    raidId: latestEnded.id,
    status,
    elapsedMinutes: latestEnded.time,
    exp,
  });
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
    await tx
      .insert(weaponMasters)
      .values(rows)
      .onConflictDoUpdate({
        target: weaponMasters.id,
        set: {
          name: sql`excluded."name"`,
          damage: sql`excluded."damage"`,
          staminaCost: sql`excluded."staminaCost"`,
          cooldownTicks: sql`excluded."cooldownTicks"`,
          castTicks: sql`excluded."castTicks"`,
          weight: sql`excluded."weight"`,
          value: sql`excluded."value"`,
          description: sql`excluded."description"`,
          attackType: sql`excluded."attackType"`,
          iconKey: sql`excluded."iconKey"`,
          effect: sql`excluded."effect"`,
        },
      });
  }
}

async function consumeBackpackItemsInTransaction(
  tx: TransactionClient,
  characterId: string,
  requirements: { itemId: string; quantity: number }[],
  excludeEquippedId?: string,
) {
  const [rows, equippedRows] = await Promise.all([
    tx.query.raidInventoryItems.findMany({
      where: eq(raidInventoryItems.characterId, characterId),
      orderBy: [asc(raidInventoryItems.slotIndex)],
    }),
    tx.query.characterWeapons.findMany({
      where: eq(characterWeapons.characterId, characterId),
      orderBy: [asc(characterWeapons.slotIndex)],
    }),
  ]);
  const usableEquippedRows = excludeEquippedId
    ? equippedRows.filter((row) => row.id !== excludeEquippedId)
    : equippedRows;

  const remainingById = new Map<string, number>();
  for (const row of rows) {
    remainingById.set(
      row.weaponMasterId,
      (remainingById.get(row.weaponMasterId) ?? 0) + row.quantity,
    );
  }
  for (const row of usableEquippedRows) {
    remainingById.set(
      row.weaponMasterId,
      (remainingById.get(row.weaponMasterId) ?? 0) + 1,
    );
  }
  for (const req of requirements) {
    if ((remainingById.get(req.itemId) ?? 0) < req.quantity) {
      throw new InventoryError("필요한 재료가 부족합니다.", 409);
    }
    remainingById.set(req.itemId, remainingById.get(req.itemId)! - req.quantity);
  }

  const consumedEquippedIds = new Set<string>();
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
    for (const row of usableEquippedRows) {
      if (
        needed <= 0 ||
        consumedEquippedIds.has(row.id) ||
        row.weaponMasterId !== req.itemId
      ) {
        continue;
      }
      await tx.delete(characterWeapons).where(eq(characterWeapons.id, row.id));
      consumedEquippedIds.add(row.id);
      needed -= 1;
    }
  }
}

/** 가방 아이템을 종류와 무관하게 가치가 낮은 것부터 지정 개수만큼 소모합니다. */
async function consumeAnyBackpackItemsInTransaction(
  tx: TransactionClient,
  characterId: string,
  count: number,
) {
  const rows = await tx.query.raidInventoryItems.findMany({
    where: eq(raidInventoryItems.characterId, characterId),
    with: { weaponMaster: { columns: { value: true } } },
    orderBy: [asc(raidInventoryItems.slotIndex)],
  });
  rows.sort((a, b) => a.weaponMaster.value - b.weaponMaster.value);
  let needed = count;
  for (const row of rows) {
    if (needed <= 0) break;
    if (row.quantity <= needed) {
      await tx
        .delete(raidInventoryItems)
        .where(eq(raidInventoryItems.id, row.id));
      needed -= row.quantity;
    } else {
      await tx
        .update(raidInventoryItems)
        .set({ quantity: row.quantity - needed })
        .where(eq(raidInventoryItems.id, row.id));
      needed = 0;
    }
  }
  if (needed > 0) throw new InventoryError("가방에 넣을 물품이 부족합니다.", 409);
}

async function stageCatalogItemsAsPendingLoot(
  tx: TransactionClient,
  exp: InternalExplorationState,
  itemIds: readonly string[],
  source: LootSourceKind,
) {
  if (itemIds.length === 0) {
    return {
      obtainedItems: [] as { weaponMasterId: string; name: string; quantity: number }[],
      totalObtainedQty: 0,
    };
  }
  await ensureCatalogItemsInTransaction(tx, [...itemIds]);

  const obtainedMap = new Map<
    string,
    { weaponMasterId: string; name: string; quantity: number }
  >();
  let totalObtainedQty = 0;

  for (const itemId of itemIds) {
    const catalogItem = getCatalogItemById(itemId);
    if (!catalogItem) continue;
    exp.pendingLoot.push({
      id: randomUUID(),
      weaponMasterId: catalogItem.id,
      name: catalogItem.name,
      quantity: 1,
      weight: catalogItem.weight,
      value: catalogItem.value,
      iconKey: catalogItem.iconKey,
      source,
    });
    totalObtainedQty += 1;
    const prev = obtainedMap.get(itemId);
    if (prev) prev.quantity += 1;
    else {
      obtainedMap.set(itemId, {
        weaponMasterId: itemId,
        name: catalogItem.name,
        quantity: 1,
      });
    }
  }

  return {
    obtainedItems: [...obtainedMap.values()],
    totalObtainedQty,
  };
}

export async function executeRaidBuildingAction(
  database: Database,
  userId: string,
  characterId: string,
  input: BuildingActionInput,
  options: { random?: () => number } = {},
): Promise<BuildingActionResult> {
  const parsed = BuildingActionSchema.parse(input) as BuildingActionInput;
  const random = options.random ?? Math.random;

  return performRaidAction(
    database,
    userId,
    characterId,
    parsed,
    "BUILDING_ACTION",
    {
      action: parsed.action,
      recipeId: parsed.recipeId ?? null,
      choiceId: parsed.choiceId ?? null,
    },
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
      if (isBuildingLockedDown(building, raid.time, raid.id)) {
        throw new InventoryError(
          "봉쇄된 건물에서는 더 이상 행동할 수 없습니다.",
          409,
        );
      }

      if (parsed.equipment && parsed.inventory) {
        await syncSlotsInTransaction(tx, characterId, {
          equipment: parsed.equipment,
          inventory: parsed.inventory,
        });
      }

      const district = getBuildingDistrict(building);
      const exp = readExplorationState(raid);
      // 진입 시 확정된 이벤트를 사용합니다(확정 이전 레이드는 여기서 확정).
      const { event: introEvent } = await pinBuildingIntroEvent(
        tx,
        characterId,
        exp,
        building,
        { refreshIntro: false },
      );
      const encounterRate = introEvent.encounterRate ?? 0.3;
      const nextTime = raid.time + 10;
      const buildingKey = String(building.id);
      const prevEvent: BuildingEventState = exp.buildingEvents[buildingKey] ?? {
        stage: "INTRO",
        text: introEvent.introText,
      };

      const runBuildingEncounter = async () => {
        const retreat = prepareRetreat(
          raid,
          raid.currentNodeId,
          raid.currentBuildingId,
          null,
        );
        const archetype = selectEnemyArchetype({
          timeMinutes: nextTime,
          districtKind: district.kind,
          buildingCategory: building.category,
        });
        const battleLog = await executeArchetypeBattleInTransaction(
          tx,
          characterId,
          archetype,
          undefined,
          retreat.defer,
          { deferLootToPending: true },
        );
        const pendingRetreat = retreat.finish(battleLog);
        if (!pendingRetreat) {
          recordBattleOutcome(exp, battleLog, nextTime);
          if (!battleLog.playerDied && battleLog.rewardItem) {
            exp.pendingLoot.push({
              id: randomUUID(),
              ...battleLog.rewardItem,
              source: "COMBAT",
            });
          }
          if (battleLog.playerDied) {
            exp.settlementSummary = buildSettlementSummary({
              raidId: raid.id,
              status: "DEAD",
              elapsedMinutes: nextTime,
              lostItems: battleLog.lostItems ?? [],
              exp,
            });
          }
        }
        exp.buildingEvents[buildingKey] = {
          eventId: introEvent.id,
          stage: "READY",
          text: `건물 내부 수색 중 ${archetype.name}와(과) 교전했습니다.`,
        };
        return { retreat, pendingRetreat, battleLog };
      };

      const requireAndSpendFatigue = async (
        cost: number,
        baseMinutes = 10,
        extraDelta = 0,
      ) => {
        const isLowFatigue = cost > 0 && character.fatigue < cost;
        const extraTimeMinutes =
          applyExhaustedActionMinutes(baseMinutes, isLowFatigue) - baseMinutes;
        const nextFatigue = Math.max(
          0,
          Math.min(character.maxFatigue, character.fatigue - cost + extraDelta),
        );
        if (nextFatigue !== character.fatigue) {
          await tx
            .update(characters)
            .set({ fatigue: nextFatigue })
            .where(eq(characters.id, characterId));
        }
        return { nextFatigue, extraTimeMinutes };
      };

      if (parsed.action === "INVESTIGATE") {
        if (prevEvent.stage !== "INTRO") {
          throw new InventoryError("이미 건물 내부 상황을 확인했습니다.", 409);
        }
        const { extraTimeMinutes } = await requireAndSpendFatigue(
          FATIGUE_RULES.buildingActionCosts.INVESTIGATE,
        );
        const actionTime = nextTime + extraTimeMinutes;
        const combatTriggered = random() < encounterRate;
        if (combatTriggered) {
          const { retreat, battleLog } = await runBuildingEncounter();
          const payload: Omit<BuildingActionResult, "raid"> = {
            action: "INVESTIGATE",
            encounterTriggered: true,
            battleLog,
            message: "건물 내부에서 적대 NPC/변이 개체와 조우했습니다!",
          };
          return {
            payload,
            pendingRetreat: retreat.finish(battleLog),
            time: actionTime,
            encounterTravel: writeExplorationState(raid, exp),
            status: battleLog.playerDied ? "DEAD" : "ACTIVE",
          };
        }

        exp.buildingEvents[buildingKey] = {
          eventId: introEvent.id,
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
          time: actionTime,
          encounterTravel: writeExplorationState(raid, exp),
        };
      }

      if (parsed.action === "SEARCH") {
        if (building.category) {
          throw new InventoryError(
            "무기 업그레이드 설비 건물에서는 탐색을 진행할 수 없습니다.",
            409,
          );
        }
        if (exp.lootedBuildingIds.includes(building.id)) {
          throw new InventoryError("이미 수색을 완료한 건물입니다.", 409);
        }
        const { extraTimeMinutes } = await requireAndSpendFatigue(
          FATIGUE_RULES.buildingActionCosts.SEARCH,
        );
        const actionTime = nextTime + extraTimeMinutes;
        if (prevEvent.stage === "INTRO" && random() < encounterRate) {
          const { retreat, battleLog } = await runBuildingEncounter();
          const payload: Omit<BuildingActionResult, "raid"> = {
            action: "SEARCH",
            encounterTriggered: true,
            battleLog,
            message: "건물 내부에서 적대 NPC/변이 개체와 조우했습니다!",
          };
          return {
            payload,
            pendingRetreat: retreat.finish(battleLog),
            time: actionTime,
            encounterTravel: writeExplorationState(raid, exp),
            status: battleLog.playerDied ? "DEAD" : "ACTIVE",
          };
        }
        const currentDistrictItems = exp.districtLootCounts[district.id] ?? 0;
        const remainingAllowance = district.maxLoot - currentDistrictItems;
        if (remainingAllowance <= 0) {
          exp.lootedBuildingIds.push(building.id);
          exp.buildingEvents[buildingKey] = {
            eventId: introEvent.id,
            stage: "CLEARED",
            text: "이 지역에서 얻을 건 다 얻은 것 같습니다.",
          };
          const payload: Omit<BuildingActionResult, "raid"> = {
            action: "SEARCH",
            encounterTriggered: false,
            obtainedItems: [],
            message: "이 지역에서 얻을 건 다 얻은 것 같습니다.",
          };
          return {
            payload,
            time: actionTime,
            encounterTravel: writeExplorationState(raid, exp),
          };
        }

        const pool = district.materialIds;
        if (pool.length === 0) {
          throw new InventoryError("수색할 수 있는 자재가 없는 구역입니다.", 409);
        }

        const searchRoll = random();
        // 초반(0~60분) 맨몸 파밍 보정을 위해 꽝 확률을 낮추고(20%), 중·후반에는 35%로 유지
        const rolledCount =
          raid.time <= 60
            ? searchRoll < 0.2
              ? 0
              : searchRoll < 0.75
                ? 1
                : 2
            : searchRoll < 0.35
              ? 0
              : searchRoll < 0.85
                ? 1
                : 2;
        const pickCount = Math.min(rolledCount, remainingAllowance);
        const pickedIds: string[] = [];
        for (let i = 0; i < pickCount; i++) {
          const picked = pool[Math.floor(random() * pool.length) % pool.length];
          if (picked) pickedIds.push(picked);
        }
        const { obtainedItems, totalObtainedQty } =
          pickedIds.length > 0
            ? await stageCatalogItemsAsPendingLoot(
                tx,
                exp,
                pickedIds,
                "SEARCH",
              )
            : { obtainedItems: [], totalObtainedQty: 0 };

        const resultText =
          obtainedItems.length > 0
            ? "건물 내부 탐색을 마쳤습니다."
            : "건물 내부를 뒤졌지만 쓸 만한 것을 찾지 못했습니다.";

        exp.lootedBuildingIds.push(building.id);
        exp.districtLootCounts[district.id] =
          currentDistrictItems + totalObtainedQty;
        exp.buildingEvents[buildingKey] = {
          eventId: introEvent.id,
          stage: "CLEARED",
          text: resultText,
        };

        const payload: Omit<BuildingActionResult, "raid"> = {
          action: "SEARCH",
          encounterTriggered: false,
          obtainedItems,
          message: resultText,
        };
        return {
          payload,
          time: actionTime,
          encounterTravel: writeExplorationState(raid, exp),
        };
      }

      if (parsed.action === "EVENT_CHOICE") {
        if (!parsed.choiceId) {
          throw new InventoryError("선택지 ID가 필요합니다.", 400);
        }
        if (
          exp.lootedBuildingIds.includes(building.id) ||
          prevEvent.stage === "CLEARED"
        ) {
          throw new InventoryError("이미 이벤트를 완료한 건물입니다.", 409);
        }
        const choice = introEvent.choices?.find((c) => c.id === parsed.choiceId);
        if (!choice || choice.action !== "EVENT_CHOICE" || !choice.outcomes?.length) {
          throw new InventoryError("유효하지 않은 건물 이벤트 선택지입니다.", 400);
        }

        const [equippedRows, backpackRows] = await Promise.all([
          tx.query.characterWeapons.findMany({
            where: eq(characterWeapons.characterId, characterId),
            columns: { weaponMasterId: true },
          }),
          tx.query.raidInventoryItems.findMany({
            where: eq(raidInventoryItems.characterId, characterId),
            columns: { weaponMasterId: true, quantity: true },
          }),
        ]);
        const backpackItemCount = backpackRows.reduce(
          (sum, row) => sum + row.quantity,
          0,
        );
        const ownedItemIds = [
          ...equippedRows.map((r) => r.weaponMasterId),
          ...backpackRows.map((r) => r.weaponMasterId),
        ];

        if (
          !hasBuildingChoiceCondition(choice, ownedItemIds, backpackItemCount)
        ) {
          throw new InventoryError("선택지 실행 조건을 충족하지 못했습니다.", 409);
        }
        const fatigueCost = choice.fatigueCost ?? 0;
        const isLowFatigue = fatigueCost > 0 && character.fatigue < fatigueCost;

        if (choice.condition?.consumeItemId) {
          await consumeBackpackItemsInTransaction(tx, characterId, [
            { itemId: choice.condition.consumeItemId, quantity: 1 },
          ]);
        }
        if (choice.condition?.consumeAnyItemCount) {
          await consumeAnyBackpackItemsInTransaction(
            tx,
            characterId,
            choice.condition.consumeAnyItemCount,
          );
        }

        const roll = random();
        let outcome = choice.outcomes[choice.outcomes.length - 1]!;
        let cumulative = 0;
        for (const candidate of choice.outcomes) {
          if (candidate.chance === undefined) {
            outcome = candidate;
            break;
          }
          cumulative += candidate.chance;
          if (roll < cumulative) {
            outcome = candidate;
            break;
          }
        }

        const baseTimeCost =
          outcome.timeCostMinutes ?? choice.timeCostMinutes ?? 10;
        const timeCost = applyExhaustedActionMinutes(baseTimeCost, isLowFatigue);
        const hpDelta = outcome.hpDelta ?? 0;
        const fatigueDelta = outcome.fatigueDelta ?? 0;
        // 비전투 함정 피해로 즉사하지 않도록 최소 체력 1을 보장합니다.
        const nextHp =
          hpDelta < 0
            ? Math.max(1, character.hp + hpDelta)
            : Math.min(character.maxHp, character.hp + hpDelta);
        const nextFatigue = Math.max(
          0,
          Math.min(
            character.maxFatigue,
            character.fatigue - fatigueCost + fatigueDelta,
          ),
        );
        if (nextHp !== character.hp || nextFatigue !== character.fatigue) {
          await tx
            .update(characters)
            .set({ hp: nextHp, fatigue: nextFatigue })
            .where(eq(characters.id, characterId));
        }

        const eventEndTime = raid.time + timeCost;
        const shouldTriggerCombat = Boolean(
          outcome.encounterEnemyId || outcome.triggerDistrictEncounter,
        );

        let battleLog: BuildingActionResult["battleLog"];
        let pendingRetreat: PendingRetreat | undefined;
        let obtainedItems: {
          weaponMasterId: string;
          name: string;
          quantity: number;
        }[] = [];

        if (shouldTriggerCombat) {
          const archetype =
            (outcome.encounterEnemyId
              ? getEnemyArchetypeById(outcome.encounterEnemyId)
              : undefined) ??
            selectEnemyArchetype({
              timeMinutes: eventEndTime,
              districtKind: district.kind,
              buildingCategory: building.category,
            });
          const retreat = prepareRetreat(
            raid,
            raid.currentNodeId,
            raid.currentBuildingId,
            null,
          );
          battleLog = await executeArchetypeBattleInTransaction(
            tx,
            characterId,
            archetype,
            undefined,
            retreat.defer,
            { deferLootToPending: true },
          );
          pendingRetreat = retreat.finish(battleLog);
          if (!pendingRetreat) {
            recordBattleOutcome(exp, battleLog, eventEndTime);
            if (!battleLog.playerDied && battleLog.rewardItem) {
              exp.pendingLoot.push({
                id: randomUUID(),
                ...battleLog.rewardItem,
                source: "COMBAT",
              });
            }
            if (battleLog.playerDied) {
              exp.settlementSummary = buildSettlementSummary({
                raidId: raid.id,
                status: "DEAD",
                elapsedMinutes: eventEndTime,
                lostItems: battleLog.lostItems ?? [],
                exp,
              });
            }
          }
          if (
            !battleLog.playerDied &&
            battleLog.result.winnerTeamId === "TeamA" &&
            outcome.rewardItemIds?.length
          ) {
            const staged = await stageCatalogItemsAsPendingLoot(
              tx,
              exp,
              outcome.rewardItemIds,
              "EVENT",
            );
            obtainedItems = staged.obtainedItems;
          }
        } else {
          const staged = await stageCatalogItemsAsPendingLoot(
            tx,
            exp,
            outcome.rewardItemIds ?? [],
            "EVENT",
          );
          obtainedItems = staged.obtainedItems;
        }

        exp.lootedBuildingIds.push(building.id);
        if (
          introEvent.oncePerRaid &&
          !exp.completedEventIds.includes(introEvent.id)
        ) {
          exp.completedEventIds.push(introEvent.id);
        }
        exp.buildingEvents[buildingKey] = {
          eventId: introEvent.id,
          stage: "CLEARED",
          text: outcome.text,
        };

        const netFatigueDelta = nextFatigue - character.fatigue;
        const payload: Omit<BuildingActionResult, "raid"> = {
          action: "EVENT_CHOICE",
          encounterTriggered: shouldTriggerCombat,
          ...(battleLog ? { battleLog } : {}),
          ...(obtainedItems.length > 0 ? { obtainedItems } : {}),
          ...(hpDelta !== 0 ? { hpDelta: nextHp - character.hp } : {}),
          ...(netFatigueDelta !== 0 ? { fatigueDelta: netFatigueDelta } : {}),
          message: outcome.text,
        };
        return {
          payload,
          ...(pendingRetreat ? { pendingRetreat } : {}),
          time: eventEndTime,
          encounterTravel: writeExplorationState(raid, exp),
          ...(battleLog?.playerDied ? { status: "DEAD" as const } : {}),
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
      const maxCraftTier = resolveBuildingMaxCraftTier(building);
      if (recipe.tier > maxCraftTier) {
        throw new InventoryError(
          "외곽 조합 설비에서는 T1 업그레이드만 가능합니다. T2 업그레이드는 중앙 구역 설비를 이용하세요.",
          409,
        );
      }
      if (exp.usedCraftBuildingIds.includes(building.id)) {
        throw new InventoryError("이미 조합 설비를 사용한 건물입니다.", 409);
      }
      const { extraTimeMinutes: craftExtraTime } =
        await requireAndSpendFatigue(FATIGUE_RULES.buildingActionCosts.CRAFT);

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
      await consumeBackpackItemsInTransaction(
        tx,
        characterId,
        materialReqs,
        baseEquipped?.id,
      );

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
        eventId: introEvent.id,
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
        time: nextTime + craftExtraTime,
        encounterTravel: writeExplorationState(raid, exp),
      };
    },
  );
}

export async function executeRaidLootAction(
  database: Database,
  userId: string,
  characterId: string,
  input: RaidLootActionInput,
): Promise<RaidLootActionResult> {
  const parsed = RaidLootActionSchema.parse(input) as RaidLootActionInput;

  return performRaidAction(
    database,
    userId,
    characterId,
    parsed,
    "LOOT_ACTION",
    {
      action: parsed.action,
      lootId: parsed.lootId ?? null,
      backpackSlotIndex: parsed.backpackSlotIndex ?? null,
      equipmentSlotIndex: parsed.equipmentSlotIndex ?? null,
      equipment: parsed.equipment ?? null,
      inventory: parsed.inventory ?? null,
    },
    async (tx, raid, character) => {
      if (parsed.equipment && parsed.inventory) {
        await syncSlotsInTransaction(tx, characterId, {
          equipment: parsed.equipment,
          inventory: parsed.inventory,
        });
      }

      const exp = readExplorationState(raid);
      const backpackItems = await tx.query.raidInventoryItems.findMany({
        where: eq(raidInventoryItems.characterId, characterId),
        with: { weaponMaster: true },
        orderBy: [asc(raidInventoryItems.slotIndex)],
      });
      let currentWeight = await calculateInventoryWeight(tx, characterId);

      if (parsed.action === "CLAIM_ITEM") {
        if (!parsed.lootId) {
          throw new InventoryError("회수할 전리품 ID가 필요합니다.", 400);
        }
        const targetIndex = exp.pendingLoot.findIndex(
          (item) => item.id === parsed.lootId,
        );
        if (targetIndex === -1) {
          throw new InventoryError("회수할 전리품을 찾을 수 없습니다.", 404);
        }
        const target = exp.pendingLoot[targetIndex]!;
        const addWeight = target.weight * target.quantity;
        if (currentWeight + addWeight > character.maxWeight) {
          throw new InventoryError(
            "중량 한도를 초과하여 회수할 수 없습니다.",
            409,
          );
        }

        await ensureCatalogItemsInTransaction(tx, [target.weaponMasterId]);
        await putInBackpack(tx, characterId, target.weaponMasterId, target.quantity);
        const finalWeight = await calculateInventoryWeight(tx, characterId);
        await tx
          .update(characters)
          .set({ weight: finalWeight })
          .where(eq(characters.id, characterId));

        exp.pendingLoot.splice(targetIndex, 1);
        const payload: Omit<RaidLootActionResult, "raid"> = {
          action: "CLAIM_ITEM",
          claimedItems: [
            {
              weaponMasterId: target.weaponMasterId,
              name: target.name,
              quantity: target.quantity,
            },
          ],
          weight: finalWeight,
          message: `${target.name} x${target.quantity}을(를) 배낭에 넣었습니다.`,
        };
        return {
          payload,
          encounterTravel: writeExplorationState(raid, exp),
        };
      }

      if (parsed.action === "CLAIM_ALL") {
        if (exp.pendingLoot.length === 0) {
          throw new InventoryError("회수할 전리품이 없습니다.", 404);
        }

        const toClaim: PendingLootItem[] = [];
        const remainingLoot: PendingLootItem[] = [];

        for (const item of exp.pendingLoot) {
          const addWeight = item.weight * item.quantity;
          const fitsWeight = currentWeight + addWeight <= character.maxWeight;

          if (fitsWeight) {
            currentWeight += addWeight;
            toClaim.push(item);
          } else {
            remainingLoot.push(item);
          }
        }

        if (toClaim.length === 0) {
          throw new InventoryError(
            "중량이 부족하여 회수할 수 있는 전리품이 없습니다.",
            409,
          );
        }

        await ensureCatalogItemsInTransaction(
          tx,
          toClaim.map((item) => item.weaponMasterId),
        );
        const claimedMap = new Map<
          string,
          { weaponMasterId: string; name: string; quantity: number }
        >();
        for (const item of toClaim) {
          await putInBackpack(tx, characterId, item.weaponMasterId, item.quantity);
          const prev = claimedMap.get(item.weaponMasterId);
          if (prev) prev.quantity += item.quantity;
          else {
            claimedMap.set(item.weaponMasterId, {
              weaponMasterId: item.weaponMasterId,
              name: item.name,
              quantity: item.quantity,
            });
          }
        }

        const finalWeight = await calculateInventoryWeight(tx, characterId);
        await tx
          .update(characters)
          .set({ weight: finalWeight })
          .where(eq(characters.id, characterId));

        exp.pendingLoot = remainingLoot;
        const claimedItems = [...claimedMap.values()];
        const payload: Omit<RaidLootActionResult, "raid"> = {
          action: "CLAIM_ALL",
          claimedItems,
          weight: finalWeight,
          message:
            remainingLoot.length > 0
              ? `${claimedItems.map((i) => `${i.name} x${i.quantity}`).join(", ")} 회수 완료 (${remainingLoot.length}개 미회수)`
              : `${claimedItems.map((i) => `${i.name} x${i.quantity}`).join(", ")} 모두 회수 완료`,
        };
        return {
          payload,
          encounterTravel: writeExplorationState(raid, exp),
        };
      }

      if (parsed.action === "ABANDON_ALL") {
        const count = exp.pendingLoot.length;
        exp.pendingLoot = [];
        const payload: Omit<RaidLootActionResult, "raid"> = {
          action: "ABANDON_ALL",
          weight: currentWeight,
          message:
            count > 0
              ? `남은 전리품 ${count}건을 두고 이동합니다.`
              : "정리할 전리품이 없습니다.",
        };
        return {
          payload,
          encounterTravel: writeExplorationState(raid, exp),
        };
      }

      if (parsed.action === "DISCARD_EQUIPMENT") {
        if (parsed.equipmentSlotIndex === undefined) {
          throw new InventoryError("버릴 장비 슬롯 번호가 필요합니다.", 400);
        }
        const equipItems = await tx.query.characterWeapons.findMany({
          where: eq(characterWeapons.characterId, characterId),
          with: { weaponMaster: true },
          orderBy: [asc(characterWeapons.slotIndex)],
        });
        const equipItem = equipItems.find(
          (item) => item.slotIndex === parsed.equipmentSlotIndex,
        );
        if (!equipItem) {
          throw new InventoryError("비울 장비 슬롯에 아이템이 없습니다.", 404);
        }

        await tx
          .delete(characterWeapons)
          .where(eq(characterWeapons.id, equipItem.id));

        const finalWeight = await calculateInventoryWeight(tx, characterId);
        await tx
          .update(characters)
          .set({ weight: finalWeight })
          .where(eq(characters.id, characterId));

        const payload: Omit<RaidLootActionResult, "raid"> = {
          action: "DISCARD_EQUIPMENT",
          discardedItem: {
            weaponMasterId: equipItem.weaponMasterId,
            name: equipItem.weaponMaster.name,
            slotIndex: equipItem.slotIndex,
          },
          weight: finalWeight,
          message: `${equipItem.weaponMaster.name}을(를) 버렸습니다.`,
        };
        return { payload };
      }

      if (parsed.backpackSlotIndex === undefined) {
        throw new InventoryError("버릴 배낭 슬롯 번호가 필요합니다.", 400);
      }
      const slotItem = backpackItems.find(
        (item) => item.slotIndex === parsed.backpackSlotIndex,
      );
      if (!slotItem) {
        throw new InventoryError("비울 배낭 슬롯에 아이템이 없습니다.", 404);
      }

      if (slotItem.quantity > 1) {
        await tx
          .update(raidInventoryItems)
          .set({ quantity: slotItem.quantity - 1 })
          .where(eq(raidInventoryItems.id, slotItem.id));
      } else {
        await tx
          .delete(raidInventoryItems)
          .where(eq(raidInventoryItems.id, slotItem.id));
      }

      const finalWeight = await calculateInventoryWeight(tx, characterId);
      await tx
        .update(characters)
        .set({ weight: finalWeight })
        .where(eq(characters.id, characterId));

      const payload: Omit<RaidLootActionResult, "raid"> = {
        action: "DISCARD_BACKPACK",
        discardedItem: {
          weaponMasterId: slotItem.weaponMasterId,
          name: slotItem.weaponMaster.name,
          slotIndex: slotItem.slotIndex,
        },
        weight: finalWeight,
        message: `${slotItem.weaponMaster.name} 1개를 버렸습니다.`,
      };
      return { payload };
    },
  );
}

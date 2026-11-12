import {
  firstMissionNodeId,
  type RaidActionInput,
  type RaidNavigationInput,
  type RaidNavigationResult,
  type RaidView,
  seopoMapVersion,
} from "@webgame/types";
import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import mapData from "../../../../packages/types/src/assets/map_graph.json";
import {
  type Character,
  characters,
  type Database,
  raidCommands,
  raidInventoryItems,
  type RaidSession,
  raidSessions,
  type RaidStatus,
  type TransactionClient,
  users,
} from "../db";
import { gameRules } from "../logic/rules";
import {
  executeGhostBattleInTransaction,
  executeHanlimBattleInTransaction,
  executeMonsterBattleInTransaction,
} from "./battle";
import {
  createGhostTracker,
  type GhostRoster,
  loadGhostRoster,
} from "./ghostRoster";
import { recordGhosts } from "./ghosts";
import {
  calculateInventoryWeight,
  InventoryError,
  mergeIntoStash,
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
    (path.length === 1) === (destinationBuildingId !== undefined),
  { message: "A single-node path requires a destination building" },
).refine(
  (data) => (data.equipment === undefined) === (data.inventory === undefined),
  { message: "Equipment and inventory must be sent together" },
);

export const extractionNodeIds = gameRules.extractionNodeIds;

function view(raid: RaidSession): RaidView {
  return {
    id: raid.id,
    status: raid.status,
    version: raid.version,
    currentNodeId: raid.currentNodeId,
    round: raid.round,
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
) {
  return withInventoryTransaction(database, async (tx) => {
    await tx.execute(
      sql`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`,
    );
    const character = await ownedCharacter(tx, userId, characterId);
    if (character.activeRaid?.status === "ACTIVE")
      return {
        status: "success",
        isRaiding: true,
        raid: view(character.activeRaid),
      };
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
    const weight = loadout
      ? (
          await syncLoadoutWithStashInTransaction(
            tx,
            userId,
            characterId,
            loadout,
          )
        ).weight
      : await calculateInventoryWeight(tx, characterId);
    const [raid] = await tx
      .insert(raidSessions)
      .values({ characterId, entryNodeId, currentNodeId: entryNodeId })
      .returning();
    if (!raid) throw new InventoryError("Failed to create raid session", 500);
    await tx
      .update(characters)
      .set({
        isRaiding: true,
        activeRaidId: raid.id,
        currentNodeId: entryNodeId,
        time: 0,
        weight,
      })
      .where(eq(characters.id, characterId));
    await recordGhosts(tx, characterId, raid.id, [
      { nodeId: raid.currentNodeId, round: 0 },
    ]);
    return { status: "success", isRaiding: true, raid: view(raid) };
  });
}

interface ActionResult<T> {
  payload: T;
  status?: RaidStatus;
  currentNodeId?: number;
  round?: number;
  ghostRoster?: GhostRoster;
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
        ...(result.round !== undefined ? { round: result.round } : {}),
        ...(result.ghostRoster ? { ghostRoster: result.ghostRoster } : {}),
        ...(status === "ACTIVE" ? {} : { endedAt: new Date() }),
      })
      .where(eq(raidSessions.id, raid.id))
      .returning();
    if (!updated) throw new InventoryError("Failed to update raid session", 500);
    await tx
      .update(characters)
      .set(
        status === "ACTIVE"
          ? { currentNodeId: updated.currentNodeId, time: updated.round }
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

const roadKey = (a: number, b: number) =>
  `${Math.min(a, b)}:${Math.max(a, b)}`;

const connectedRoads = new Set(
  mapData.edges.map(({ source, target }) => roadKey(source, target)),
);

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
        result.raid.version === raid.version &&
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
      const isBuildingMove = parsed.destinationBuildingId !== undefined;
      if (
        isBuildingMove &&
        !mapData.buildings.some(
          (building) =>
            building.id === parsed.destinationBuildingId &&
            building.roadNodeId === raid.currentNodeId,
        )
      ) {
        throw new InventoryError("Destination building is not on the current node");
      }
      for (let index = 1; index < parsed.path.length; index++) {
        if (
          !connectedRoads.has(roadKey(parsed.path[index - 1]!, parsed.path[index]!))
        )
          throw new InventoryError("Path contains disconnected nodes");
      }
      if (parsed.equipment && parsed.inventory)
        await syncSlotsInTransaction(tx, characterId, {
          equipment: parsed.equipment,
          inventory: parsed.inventory,
        });
      // A building move records one round at the same road node.
      const path = isBuildingMove
        ? [raid.currentNodeId, raid.currentNodeId]
        : parsed.path;
      const missionActive =
        !isBuildingMove &&
        path.indexOf(firstMissionNodeId, 1) !== -1 &&
        (await missionNeedsRecovery(tx, userId));
      const ghostRoster = await loadGhostRoster(tx, raid);
      const tracker = createGhostTracker(
        tx,
        ghostRoster,
        userId,
        raid.round + path.length - 1,
      );
      if (!raid.ghostRoster && raid.round === 0)
        await tracker.initialize(raid.entryNodeId);
      for (let stopIndex = 1; stopIndex < path.length; stopIndex++) {
        const stopNodeId = path[stopIndex]!;
        const stopRound = raid.round + stopIndex;
        const isMissionEncounter =
          missionActive && stopNodeId === firstMissionNodeId;
        const ghost = await tracker.match(
          path[stopIndex - 1]!,
          stopNodeId,
          stopRound,
          stopNodeId === gameRules.startNodeId,
        );
        if (ghost || isMissionEncounter) {
          const visitedPath = path.slice(1, stopIndex + 1);
          await recordGhosts(
            tx,
            characterId,
            raid.id,
            visitedPath.map((nodeId, index) => ({
              nodeId,
              round: raid.round + index + 1,
            })),
          );
          await tx
            .update(characters)
            .set({
              currentNodeId: stopNodeId,
              time: stopRound,
            })
            .where(eq(characters.id, characterId));
          const battleLog = ghost
            ? await executeGhostBattleInTransaction(
                tx,
                characterId,
                raid.id,
                ghost,
              )
            : await executeHanlimBattleInTransaction(tx, characterId);
          if (
            battleLog.result.winnerTeamId === "TeamA" &&
            !battleLog.playerDied
          ) {
            if (ghost?.source.characterId)
              tracker.defeat(ghost.source.characterId);
            if (isMissionEncounter)
              await recoverMissionRecord(tx, userId, raid.id);
          }
          return {
            payload: { encounterTriggered: true, stopNodeId, battleLog },
            currentNodeId: stopNodeId,
            round: stopRound,
            ghostRoster,
            status: battleLog.playerDied ? "DEAD" : "ACTIVE",
          };
        }
      }
      await recordGhosts(
        tx,
        characterId,
        raid.id,
        path
          .slice(1)
          .map((nodeId, index) => ({ nodeId, round: raid.round + index + 1 })),
      );
      return {
        payload: { encounterTriggered: false },
        currentNodeId: path.at(-1),
        round: raid.round + path.length - 1,
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
      await recordGhosts(tx, characterId, raid.id, [
        { nodeId: raid.currentNodeId, round: raid.round + 1 },
      ]);
      const battleLog = await executeMonsterBattleInTransaction(
        tx,
        characterId,
        level,
      );
      return {
        payload: battleLog,
        round: raid.round + 1,
        status: battleLog.playerDied ? "DEAD" : "ACTIVE",
      };
    },
  );
}

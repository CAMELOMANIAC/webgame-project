import {
  firstMissionNodeId,
  type RaidActionInput,
  type RaidNavigationResult,
  type RaidView,
  seopoMapVersion,
  seopoRegion,
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
import { hanlimNpcs } from "../logic/npcs";
import { gameRules } from "../logic/rules";
import {
  executeGhostBattleInTransaction,
  executeHanlimBattleInTransaction,
  executeMonsterBattleInTransaction,
} from "./battle";
import { matchGhost, recordGhosts } from "./ghosts";
import {
  calculateInventoryWeight,
  InventoryError,
  mergeIntoStash,
  SlotsSchema,
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
    .min(2)
    .max(2000),
  equipment: SlotsSchema.shape.equipment.optional(),
  inventory: SlotsSchema.shape.inventory.optional(),
}).refine(
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
    const [raid] = await tx
      .insert(raidSessions)
      .values({ characterId, currentNodeId: gameRules.startNodeId })
      .returning();
    if (!raid) throw new InventoryError("Failed to create raid session", 500);
    await tx
      .update(characters)
      .set({
        isRaiding: true,
        activeRaidId: raid.id,
        currentNodeId: gameRules.startNodeId,
        time: 0,
        weight: await calculateInventoryWeight(tx, characterId),
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

const connected = new Set(
  mapData.edges.flatMap((edge) => [
    `${edge.source}:${edge.target}`,
    `${edge.target}:${edge.source}`,
  ]),
);
const buildingNodes = new Set(
  mapData.buildings.map((building) => building.roadNodeId),
);

export async function navigateRaid(
  database: Database,
  userId: string,
  characterId: string,
  input: z.infer<typeof NavigateSchema>,
  random: () => number = Math.random,
): Promise<RaidNavigationResult> {
  const parsed = NavigateSchema.parse(input);
  const payload = {
    path: parsed.path,
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
      for (let index = 1; index < parsed.path.length; index++) {
        if (!connected.has(`${parsed.path[index - 1]}:${parsed.path[index]}`))
          throw new InventoryError("Path contains disconnected nodes");
      }
      if (parsed.equipment && parsed.inventory)
        await syncSlotsInTransaction(tx, characterId, {
          equipment: parsed.equipment,
          inventory: parsed.inventory,
        });
      const candidates = parsed.path
        .slice(1)
        .filter((nodeId) => nodeId !== 0 && buildingNodes.has(nodeId));
      const forcedNode =
        (await missionNeedsRecovery(tx, userId)) &&
        parsed.path.slice(1).includes(firstMissionNodeId)
          ? firstMissionNodeId
          : undefined;
      const stopNodeId =
        forcedNode ??
        (candidates.length && random() < gameRules.monsterEncounterChance
          ? candidates[Math.floor(random() * candidates.length)]
          : undefined);
      if (stopNodeId !== undefined) {
        const ghost = await matchGhost(
          tx,
          userId,
          stopNodeId,
          raid.round + parsed.path.indexOf(stopNodeId),
          new Date(),
          raid.id,
        );
        const region = seopoRegion(
          stopNodeId,
          raid.round + parsed.path.indexOf(stopNodeId),
          mapData.nodes[stopNodeId]!,
        );
        if (ghost || region.encounter === "HOSTILE") {
          const visitedPath = parsed.path.slice(
            1,
            stopNodeId === undefined
              ? undefined
              : parsed.path.indexOf(stopNodeId) + 1,
          );
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
              time: raid.round + parsed.path.indexOf(stopNodeId),
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
            stopNodeId === firstMissionNodeId &&
            battleLog.result.winnerTeamId === "TeamA" &&
            !battleLog.playerDied
          )
            await recoverMissionRecord(tx, userId, raid.id);
          return {
            payload: { encounterTriggered: true, stopNodeId, battleLog },
            currentNodeId: stopNodeId,
            round: raid.round + parsed.path.indexOf(stopNodeId),
            status: battleLog.playerDied ? "DEAD" : "ACTIVE",
          };
        }
      }
      await recordGhosts(
        tx,
        characterId,
        raid.id,
        parsed.path
          .slice(1)
          .map((nodeId, index) => ({ nodeId, round: raid.round + index + 1 })),
      );
      const region = seopoRegion(
        parsed.path.at(-1)!,
        raid.round + parsed.path.length - 1,
        mapData.nodes[parsed.path.at(-1)!]!,
      );
      return {
        payload: {
          encounterTriggered: false,
          notice:
            region.encounter === "SUPPORT"
              ? `${hanlimNpcs.relief.name}: ${hanlimNpcs.relief.reason}`
              : undefined,
        },
        currentNodeId: parsed.path.at(-1),
        round: raid.round + parsed.path.length - 1,
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

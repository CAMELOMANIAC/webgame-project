import {
  ALL_CATALOG_ITEMS,
  type JournalMissionItem,
  type JournalView,
} from "@webgame/types";
import { and, eq } from "drizzle-orm";
import {
  type Database,
  type DbOrTx,
  questProgresses,
  type RaidStatus,
  type TransactionClient,
  users,
  weaponMasters,
} from "../db";
import {
  disclosedStory,
  firstMission,
  getMissionDefinitionById,
  MISSION_CHAIN,
  type MissionDefinition,
} from "../logic/story";
import { requireUserAtBase } from "./characters";
import {
  InventoryError,
  mergeIntoStash,
  withInventoryTransaction,
} from "./inventory";

const CATALOG_BY_ID = new Map(ALL_CATALOG_ITEMS.map((item) => [item.id, item]));

function toJournalMissionItem(
  def: MissionDefinition,
  progress?: typeof questProgresses.$inferSelect,
): JournalMissionItem {
  return {
    id: def.id,
    tier: def.tier,
    issuerName: def.issuerName,
    issuerRole: def.issuerRole,
    title: def.title,
    briefing: def.briefing,
    targetNodeId: def.targetNodeId,
    targetLabel: def.targetLabel,
    supplyDescription: def.supplyDescription,
    rewardDescription: def.rewardDescription,
    status: progress?.status ?? "OFFERED",
    completedAt: progress?.completedAt?.toISOString() ?? null,
  };
}

export async function journalView(
  db: DbOrTx,
  userId: string,
): Promise<JournalView> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { storyTier: true },
  });
  if (!user) throw new InventoryError("User not found", 404);
  const rows = await db.query.questProgresses.findMany({
    where: eq(questProgresses.userId, userId),
  });
  const byQuestId = new Map(rows.map((row) => [row.questId, row]));

  const unlockedDefs = MISSION_CHAIN.filter(
    (def) => user.storyTier >= def.requiredStoryTier || byQuestId.has(def.id),
  );
  const missions = unlockedDefs.map((def) =>
    toJournalMissionItem(def, byQuestId.get(def.id)),
  );
  const currentMission =
    missions.find((item) => item.status !== "COMPLETE") ??
    missions.at(-1) ??
    toJournalMissionItem(MISSION_CHAIN[0]!);

  return {
    storyTier: user.storyTier,
    mission: currentMission,
    missions,
    ...disclosedStory(user.storyTier),
  };
}

export async function ensureMissionItems(
  tx: TransactionClient,
  itemIds: readonly string[],
) {
  const uniqueIds = [...new Set(itemIds)];
  const items = uniqueIds
    .map((id) => CATALOG_BY_ID.get(id))
    .filter((item): item is NonNullable<typeof item> => !!item);
  if (items.length === 0) return;
  await tx
    .insert(weaponMasters)
    .values(
      items.map((item) => ({
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
      })),
    )
    .onConflictDoNothing();
}

async function resolveMissionToAccept(
  tx: TransactionClient,
  userId: string,
  storyTier: number,
  questId?: string,
): Promise<MissionDefinition> {
  if (questId) {
    const def = getMissionDefinitionById(questId);
    if (!def) throw new InventoryError("Unknown mission", 404);
    if (storyTier < def.requiredStoryTier) {
      throw new InventoryError("Previous mission must be completed first", 409);
    }
    return def;
  }
  const rows = await tx.query.questProgresses.findMany({
    where: eq(questProgresses.userId, userId),
  });
  const byQuestId = new Map(rows.map((row) => [row.questId, row]));
  const nextMission =
    MISSION_CHAIN.find(
      (def) =>
        storyTier >= def.requiredStoryTier &&
        byQuestId.get(def.id)?.status !== "COMPLETE",
    ) ?? MISSION_CHAIN[0]!;
  return nextMission;
}

async function resolveMissionToReport(
  tx: TransactionClient,
  userId: string,
  questId?: string,
): Promise<{
  def: MissionDefinition;
  progress: typeof questProgresses.$inferSelect | undefined;
}> {
  if (questId) {
    const def = getMissionDefinitionById(questId);
    if (!def) throw new InventoryError("Unknown mission", 404);
    const progress = await tx.query.questProgresses.findFirst({
      where: and(
        eq(questProgresses.userId, userId),
        eq(questProgresses.questId, def.id),
      ),
    });
    return { def, progress };
  }
  const rows = await tx.query.questProgresses.findMany({
    where: eq(questProgresses.userId, userId),
  });
  const byQuestId = new Map(rows.map((row) => [row.questId, row]));
  const readyDef = MISSION_CHAIN.find(
    (def) => byQuestId.get(def.id)?.status === "READY",
  );
  if (readyDef) {
    return { def: readyDef, progress: byQuestId.get(readyDef.id) };
  }
  const activeOrLastDef =
    MISSION_CHAIN.find(
      (def) =>
        byQuestId.has(def.id) && byQuestId.get(def.id)?.status !== "COMPLETE",
    ) ??
    [...MISSION_CHAIN]
      .reverse()
      .find((def) => byQuestId.has(def.id)) ??
    MISSION_CHAIN[0]!;
  return { def: activeOrLastDef, progress: byQuestId.get(activeOrLastDef.id) };
}

export async function acceptMission(
  db: Database,
  userId: string,
  questId?: string,
) {
  return withInventoryTransaction(db, async (tx) => {
    await requireUserAtBase(tx, userId);
    const user = await tx.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { storyTier: true },
    });
    if (!user) throw new InventoryError("User not found", 404);
    const def = await resolveMissionToAccept(tx, userId, user.storyTier, questId);
    const existing = await tx.query.questProgresses.findFirst({
      where: and(
        eq(questProgresses.userId, userId),
        eq(questProgresses.questId, def.id),
      ),
    });
    if (!existing) {
      await ensureMissionItems(
        tx,
        def.supplyItems.map((grant) => grant.weaponId),
      );
      await tx.insert(questProgresses).values({
        userId,
        questId: def.id,
        definitionVersion: def.version,
      });
      for (const grant of def.supplyItems) {
        await mergeIntoStash(tx, userId, grant.weaponId, grant.quantity);
      }
    }
    return journalView(tx, userId);
  });
}

export async function acceptFirstMission(db: Database, userId: string) {
  return acceptMission(db, userId, firstMission.id);
}

export async function getActiveMissionForRecovery(
  tx: TransactionClient,
  userId: string,
): Promise<MissionDefinition | null> {
  const rows = await tx.query.questProgresses.findMany({
    where: and(
      eq(questProgresses.userId, userId),
      eq(questProgresses.status, "ACTIVE"),
    ),
  });
  for (const def of MISSION_CHAIN) {
    if (rows.some((row) => row.questId === def.id)) {
      return def;
    }
  }
  return null;
}

export async function missionNeedsRecovery(
  tx: TransactionClient,
  userId: string,
) {
  return (await getActiveMissionForRecovery(tx, userId)) !== null;
}

export async function recoverMissionRecord(
  tx: TransactionClient,
  userId: string,
  raidId: string,
  questId?: string,
) {
  const targetQuestId =
    questId ?? (await getActiveMissionForRecovery(tx, userId))?.id;
  if (!targetQuestId) return;
  await tx
    .update(questProgresses)
    .set({ status: "RECOVERED", recoveredRaidId: raidId, updatedAt: new Date() })
    .where(
      and(
        eq(questProgresses.userId, userId),
        eq(questProgresses.questId, targetQuestId),
        eq(questProgresses.status, "ACTIVE"),
      ),
    );
}

export async function finishMissionRaid(
  tx: TransactionClient,
  userId: string,
  raidId: string,
  status: RaidStatus,
) {
  if (status === "ACTIVE") return;
  await tx
    .update(questProgresses)
    .set(
      status === "EXTRACTED"
        ? { status: "READY", updatedAt: new Date() }
        : { status: "ACTIVE", recoveredRaidId: null, updatedAt: new Date() },
    )
    .where(
      and(
        eq(questProgresses.userId, userId),
        eq(questProgresses.status, "RECOVERED"),
        eq(questProgresses.recoveredRaidId, raidId),
      ),
    );
}

export async function reportMission(
  db: Database,
  userId: string,
  questId?: string,
) {
  return withInventoryTransaction(db, async (tx) => {
    await requireUserAtBase(tx, userId);
    const { def, progress } = await resolveMissionToReport(tx, userId, questId);
    if (progress?.status === "COMPLETE") return journalView(tx, userId);
    if (progress?.status !== "READY") {
      throw new InventoryError(
        "Recover the record and extract before reporting",
        409,
      );
    }
    await ensureMissionItems(
      tx,
      def.rewardItems.map((grant) => grant.weaponId),
    );
    for (const grant of def.rewardItems) {
      await mergeIntoStash(tx, userId, grant.weaponId, grant.quantity);
    }
    await tx
      .update(questProgresses)
      .set({
        status: "COMPLETE",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(questProgresses.userId, userId),
          eq(questProgresses.questId, def.id),
        ),
      );
    const user = await tx.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!user) throw new InventoryError("User not found", 404);
    await tx
      .update(users)
      .set({
        storyTier: Math.max(def.grantsStoryTier, user.storyTier),
        credits: user.credits + def.rewardCredits,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
    return journalView(tx, userId);
  });
}

export async function reportFirstMission(db: Database, userId: string) {
  return reportMission(db, userId, firstMission.id);
}

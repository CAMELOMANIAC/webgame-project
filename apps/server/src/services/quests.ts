import type { JournalView } from "@webgame/types";
import { and, eq } from "drizzle-orm";
import {
  type Database,
  type DbOrTx,
  questProgresses,
  type RaidStatus,
  type TransactionClient,
  users,
} from "../db";
import { disclosedStory, firstMission } from "../logic/story";
import { requireUserAtBase } from "./characters";
import {
  InventoryError,
  mergeIntoStash,
  withInventoryTransaction,
} from "./inventory";

export async function journalView(
  db: DbOrTx,
  userId: string,
): Promise<JournalView> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { storyTier: true },
  });
  if (!user) throw new InventoryError("User not found", 404);
  const progress = await db.query.questProgresses.findFirst({
    where: and(
      eq(questProgresses.userId, userId),
      eq(questProgresses.questId, firstMission.id),
    ),
  });
  return {
    mission: {
      id: firstMission.id,
      title: firstMission.title,
      briefing: firstMission.briefing,
      targetNodeId: firstMission.targetNodeId,
      rewardDescription: firstMission.rewardDescription,
      status: progress?.status ?? "OFFERED",
      completedAt: progress?.completedAt?.toISOString() ?? null,
    },
    ...disclosedStory(user.storyTier),
  };
}

export async function acceptFirstMission(db: Database, userId: string) {
  return withInventoryTransaction(db, async (tx) => {
    await requireUserAtBase(tx, userId);
    const existing = await tx.query.questProgresses.findFirst({
      where: and(
        eq(questProgresses.userId, userId),
        eq(questProgresses.questId, firstMission.id),
      ),
    });
    if (!existing) {
      await tx.insert(questProgresses).values({
        userId,
        questId: firstMission.id,
        definitionVersion: firstMission.version,
      });
      await mergeIntoStash(tx, userId, firstMission.supplyWeaponId, 1);
    }
    return journalView(tx, userId);
  });
}

export async function missionNeedsRecovery(
  tx: TransactionClient,
  userId: string,
) {
  return (
    (
      await tx.query.questProgresses.findFirst({
        where: and(
          eq(questProgresses.userId, userId),
          eq(questProgresses.questId, firstMission.id),
        ),
      })
    )?.status === "ACTIVE"
  );
}

export async function recoverMissionRecord(
  tx: TransactionClient,
  userId: string,
  raidId: string,
) {
  await tx
    .update(questProgresses)
    .set({ status: "RECOVERED", recoveredRaidId: raidId, updatedAt: new Date() })
    .where(
      and(
        eq(questProgresses.userId, userId),
        eq(questProgresses.questId, firstMission.id),
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
        eq(questProgresses.questId, firstMission.id),
        eq(questProgresses.status, "RECOVERED"),
        eq(questProgresses.recoveredRaidId, raidId),
      ),
    );
}

export async function reportFirstMission(db: Database, userId: string) {
  return withInventoryTransaction(db, async (tx) => {
    await requireUserAtBase(tx, userId);
    const progress = await tx.query.questProgresses.findFirst({
      where: and(
        eq(questProgresses.userId, userId),
        eq(questProgresses.questId, firstMission.id),
      ),
    });
    if (progress?.status === "COMPLETE") return journalView(tx, userId);
    if (progress?.status !== "READY")
      throw new InventoryError(
        "Recover the record and extract before reporting",
        409,
      );
    await mergeIntoStash(tx, userId, firstMission.rewardWeaponId, 1);
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
          eq(questProgresses.questId, firstMission.id),
        ),
      );
    const user = await tx.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!user) throw new InventoryError("User not found", 404);
    await tx
      .update(users)
      .set({ storyTier: Math.max(1, user.storyTier), updatedAt: new Date() })
      .where(eq(users.id, userId));
    return journalView(tx, userId);
  });
}

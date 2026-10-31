import type { Prisma, PrismaClient, RaidStatus } from "@prisma/client";
import type { JournalView } from "@webgame/types";
import { disclosedStory, firstMission } from "../logic/story";
import { requireUserAtBase } from "./characters";
import {
  InventoryError,
  mergeIntoStash,
  withInventoryTransaction,
} from "./inventory";

export async function journalView(
  db: PrismaClient | Prisma.TransactionClient,
  userId: string,
): Promise<JournalView> {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { storyTier: true },
  });
  const progress = await db.questProgress.findUnique({
    where: { userId_questId: { userId, questId: firstMission.id } },
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

export async function acceptFirstMission(db: PrismaClient, userId: string) {
  return withInventoryTransaction(db, async (tx) => {
    await requireUserAtBase(tx, userId);
    const where = { userId_questId: { userId, questId: firstMission.id } };
    if (!(await tx.questProgress.findUnique({ where }))) {
      await tx.questProgress.create({
        data: {
          userId,
          questId: firstMission.id,
          definitionVersion: firstMission.version,
        },
      });
      await mergeIntoStash(tx, userId, firstMission.supplyWeaponId, 1);
    }
    return journalView(tx, userId);
  });
}

export async function missionNeedsRecovery(
  tx: Prisma.TransactionClient,
  userId: string,
) {
  return (
    (
      await tx.questProgress.findUnique({
        where: { userId_questId: { userId, questId: firstMission.id } },
      })
    )?.status === "ACTIVE"
  );
}

export async function recoverMissionRecord(
  tx: Prisma.TransactionClient,
  userId: string,
  raidId: string,
) {
  await tx.questProgress.updateMany({
    where: { userId, questId: firstMission.id, status: "ACTIVE" },
    data: { status: "RECOVERED", recoveredRaidId: raidId },
  });
}

export async function finishMissionRaid(
  tx: Prisma.TransactionClient,
  userId: string,
  raidId: string,
  status: RaidStatus,
) {
  if (status === "ACTIVE") return;
  await tx.questProgress.updateMany({
    where: {
      userId,
      questId: firstMission.id,
      status: "RECOVERED",
      recoveredRaidId: raidId,
    },
    data:
      status === "EXTRACTED"
        ? { status: "READY" }
        : { status: "ACTIVE", recoveredRaidId: null },
  });
}

export async function reportFirstMission(db: PrismaClient, userId: string) {
  return withInventoryTransaction(db, async (tx) => {
    await requireUserAtBase(tx, userId);
    const where = { userId_questId: { userId, questId: firstMission.id } };
    const progress = await tx.questProgress.findUnique({ where });
    if (progress?.status === "COMPLETE") return journalView(tx, userId);
    if (progress?.status !== "READY")
      throw new InventoryError(
        "Recover the record and extract before reporting",
        409,
      );
    await mergeIntoStash(tx, userId, firstMission.rewardWeaponId, 1);
    await tx.questProgress.update({
      where,
      data: { status: "COMPLETE", completedAt: new Date() },
    });
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    await tx.user.update({
      where: { id: userId },
      data: { storyTier: Math.max(1, user.storyTier) },
    });
    return journalView(tx, userId);
  });
}

import type { Prisma, PrismaClient } from "@prisma/client";
import { InventoryError, withInventoryTransaction } from "./inventory";

export const characterDetails = {
  activeRaid: true,
  user: { select: { nickname: true } },
  variant: { include: { definition: true } },
  weapons: { include: { weaponMaster: true }, orderBy: { slotIndex: "asc" } },
  inventory: { include: { weaponMaster: true }, orderBy: { slotIndex: "asc" } },
} satisfies Prisma.CharacterInclude;

export async function selectedCharacterId(db: PrismaClient, userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { selectedCharacterId: true },
  });
  if (user?.selectedCharacterId) return user.selectedCharacterId;
  return (
    (
      await db.character.findFirst({
        where: { userId },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true },
      })
    )?.id ?? null
  );
}

export async function requireUserAtBase(
  tx: Prisma.TransactionClient,
  userId: string,
) {
  // 선택과 출격이 경쟁해도 계정당 한 개체만 출격하게 한다.
  await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
  if (await tx.character.count({ where: { userId, isRaiding: true } }))
    throw new InventoryError(
      "Finish the active raid before changing characters",
      409,
    );
}

export async function selectCharacter(
  db: PrismaClient,
  userId: string,
  characterId: string,
) {
  return withInventoryTransaction(db, async (tx) => {
    await requireUserAtBase(tx, userId);
    const character = await tx.character.findUnique({
      where: { id: characterId },
    });
    if (!character) throw new InventoryError("Character not found", 404);
    if (character.userId !== userId)
      throw new InventoryError("User does not own this character", 403);
    await tx.user.update({
      where: { id: userId },
      data: { selectedCharacterId: characterId },
    });
    return { selectedCharacterId: characterId };
  });
}

// 수집 경제가 정해지기 전까지 개발 환경에서만 개체를 추가한다.
export async function recruitDevelopmentCharacter(
  db: PrismaClient,
  userId: string,
  variantId: string,
) {
  return withInventoryTransaction(db, async (tx) => {
    await requireUserAtBase(tx, userId);
    const variant = await tx.characterVariant.findUnique({
      where: { id: variantId },
      include: { definition: true },
    });
    if (!variant) throw new InventoryError("Character variant not found", 404);
    return tx.character.create({
      data: {
        userId,
        variantId,
        displayName: variant.definition.name,
        hp: variant.maxHp,
        maxHp: variant.maxHp,
        stamina: variant.maxStamina,
        maxStamina: variant.maxStamina,
        staminaRegen: variant.staminaRegen,
        maxWeight: variant.maxWeight,
      },
    });
  });
}

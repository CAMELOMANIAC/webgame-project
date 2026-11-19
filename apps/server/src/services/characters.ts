import { CHARACTER_VARIANT_CATALOG } from "@webgame/types";
import { and, asc, eq, sql } from "drizzle-orm";
import {
  characterDefinitions,
  characters,
  characterVariants,
  characterWeapons,
  type Database,
  raidInventoryItems,
  type TransactionClient,
  users,
} from "../db";
import { InventoryError, withInventoryTransaction } from "./inventory";

export async function ensureCharacterVariantCatalog(
  db: Database | TransactionClient,
) {
  const uniqueDefs = new Map<string, string>();
  for (const spec of CHARACTER_VARIANT_CATALOG) {
    uniqueDefs.set(spec.definitionId, spec.definitionName);
  }
  const defRows = [...uniqueDefs.entries()].map(([id, name]) => ({ id, name }));
  if (defRows.length > 0) {
    await db
      .insert(characterDefinitions)
      .values(defRows)
      .onConflictDoNothing({ target: characterDefinitions.id });
  }
  const variantRows = CHARACTER_VARIANT_CATALOG.map((spec) => ({
    id: spec.id,
    definitionId: spec.definitionId,
    maxHp: spec.stats.maxHp,
    maxStamina: spec.stats.maxStamina,
    staminaRegen: spec.stats.staminaRegen,
    maxFatigue: spec.stats.maxFatigue,
    maxWeight: spec.stats.maxWeight,
  }));
  if (variantRows.length > 0) {
    await db
      .insert(characterVariants)
      .values(variantRows)
      .onConflictDoUpdate({
        target: characterVariants.id,
        set: {
          maxHp: sql`excluded."maxHp"`,
          maxStamina: sql`excluded."maxStamina"`,
          staminaRegen: sql`excluded."staminaRegen"`,
          maxFatigue: sql`excluded."maxFatigue"`,
          maxWeight: sql`excluded."maxWeight"`,
        },
      });
  }
}

export const characterDetails = {
  activeRaid: { columns: { ghostRoster: false, pendingRetreat: false } },
  user: { columns: { nickname: true } },
  variant: { with: { definition: true } },
  weapons: {
    with: { weaponMaster: true },
    orderBy: asc(characterWeapons.slotIndex),
  },
  inventory: {
    with: { weaponMaster: true },
    orderBy: asc(raidInventoryItems.slotIndex),
  },
} as const;

export async function selectedCharacterId(db: Database, userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { selectedCharacterId: true },
  });
  if (user?.selectedCharacterId) return user.selectedCharacterId;
  return (
    (
      await db.query.characters.findFirst({
        where: eq(characters.userId, userId),
        orderBy: [asc(characters.createdAt), asc(characters.id)],
        columns: { id: true },
      })
    )?.id ?? null
  );
}

export async function requireUserAtBase(
  tx: TransactionClient,
  userId: string,
) {
  // 선택과 배치가 경쟁해도 계정당 한 개체만 배치하게 한다.
  await tx.execute(sql`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`);
  const raiding = await tx.query.characters.findMany({
    where: and(eq(characters.userId, userId), eq(characters.isRaiding, true)),
    columns: { id: true },
  });
  if (raiding.length > 0)
    throw new InventoryError(
      "Finish the active raid before changing characters",
      409,
    );
}

export async function selectCharacter(
  db: Database,
  userId: string,
  characterId: string,
) {
  return withInventoryTransaction(db, async (tx) => {
    await requireUserAtBase(tx, userId);
    const character = await tx.query.characters.findFirst({
      where: eq(characters.id, characterId),
    });
    if (!character) throw new InventoryError("Character not found", 404);
    if (character.userId !== userId)
      throw new InventoryError("User does not own this character", 403);
    await tx
      .update(users)
      .set({ selectedCharacterId: characterId })
      .where(eq(users.id, userId));
    return { selectedCharacterId: characterId };
  });
}

// 수집 경제가 정해지기 전까지 개발 환경에서만 개체를 추가한다.
export async function recruitDevelopmentCharacter(
  db: Database,
  userId: string,
  variantId: string,
) {
  return withInventoryTransaction(db, async (tx) => {
    await requireUserAtBase(tx, userId);
    await ensureCharacterVariantCatalog(tx);
    const variant = await tx.query.characterVariants.findFirst({
      where: eq(characterVariants.id, variantId),
      with: { definition: true },
    });
    if (!variant) throw new InventoryError("Character variant not found", 404);
    const [created] = await tx
      .insert(characters)
      .values({
        userId,
        variantId,
        displayName: variant.definition.name,
        hp: variant.maxHp,
        maxHp: variant.maxHp,
        stamina: variant.maxStamina,
        maxStamina: variant.maxStamina,
        staminaRegen: variant.staminaRegen,
        fatigue: variant.maxFatigue,
        maxFatigue: variant.maxFatigue,
        maxWeight: variant.maxWeight,
      })
      .returning();
    if (!created) throw new InventoryError("Failed to create character", 500);
    return created;
  });
}

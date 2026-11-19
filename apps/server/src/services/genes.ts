import {
  BASE_CHARACTER_STATS,
  type CharacterGeneProfile,
  computeCharacterStatsFromGenes,
  GENE_REROLL_CREDIT_COST,
  GENE_REROLL_MATERIAL_ID,
  GENE_REROLL_MATERIAL_QTY,
  GENE_SLOT_COUNT,
  getGeneAmpouleOwnerDefinitionId,
  rollGeneRerollCandidates,
  rollInitialCharacterGenes,
  validateGeneGradeCaps,
} from "@webgame/types";
import { and, eq } from "drizzle-orm";
import {
  characters,
  type Database,
  stashItems,
  type TransactionClient,
  users,
} from "../db";
import { requireUserAtBase } from "./characters";
import { InventoryError, withInventoryTransaction } from "./inventory";

async function consumeStashMaterial(
  tx: TransactionClient,
  userId: string,
  weaponMasterId: string,
  qty: number,
  label: string,
) {
  const row = await tx.query.stashItems.findFirst({
    where: and(
      eq(stashItems.userId, userId),
      eq(stashItems.weaponMasterId, weaponMasterId),
    ),
  });
  if (!row || row.quantity < qty) {
    throw new InventoryError(`창고에 ${label}이(가) 부족합니다.`, 400);
  }
  if (row.quantity === qty) {
    await tx.delete(stashItems).where(eq(stashItems.id, row.id));
  } else {
    await tx
      .update(stashItems)
      .set({ quantity: row.quantity - qty })
      .where(eq(stashItems.id, row.id));
  }
}

export async function ensureCharacterGeneProfile(
  tx: TransactionClient,
  characterId: string,
): Promise<CharacterGeneProfile> {
  const character = await tx.query.characters.findFirst({
    where: eq(characters.id, characterId),
    with: { variant: true },
  });
  if (!character) throw new InventoryError("Character not found", 404);
  if (
    character.geneProfile &&
    character.geneProfile.slots.length === GENE_SLOT_COUNT
  ) {
    return character.geneProfile;
  }
  const definitionId = character.variant?.definitionId ?? "legacy-survivor";
  const initialProfile = rollInitialCharacterGenes(definitionId);
  const stats = computeCharacterStatsFromGenes(
    BASE_CHARACTER_STATS,
    initialProfile.slots,
  );
  await tx
    .update(characters)
    .set({
      geneProfile: initialProfile,
      maxHp: stats.maxHp,
      hp: Math.min(character.hp, stats.maxHp),
      maxStamina: stats.maxStamina,
      stamina: Math.min(character.stamina, stats.maxStamina),
      staminaRegen: stats.staminaRegen,
      maxFatigue: stats.maxFatigue,
      fatigue: Math.min(character.fatigue, stats.maxFatigue),
      maxWeight: stats.maxWeight,
    })
    .where(eq(characters.id, characterId));
  return initialProfile;
}

export async function rerollCharacterGeneSlot(
  db: Database,
  userId: string,
  characterId: string,
  slotIndex: number,
  ampouleItemId?: string | null,
) {
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= GENE_SLOT_COUNT) {
    throw new InventoryError("유효하지 않은 유전자 슬롯입니다.", 400);
  }
  const ampouleOwnerDefinitionId = ampouleItemId
    ? getGeneAmpouleOwnerDefinitionId(ampouleItemId)
    : null;
  if (ampouleItemId && !ampouleOwnerDefinitionId) {
    throw new InventoryError("유효하지 않은 유전자 앰플입니다.", 400);
  }

  return withInventoryTransaction(db, async (tx) => {
    await requireUserAtBase(tx, userId);

    const character = await tx.query.characters.findFirst({
      where: eq(characters.id, characterId),
      with: { variant: true },
    });
    if (!character) throw new InventoryError("Character not found", 404);
    if (character.userId !== userId) {
      throw new InventoryError("User does not own this character", 403);
    }

    const currentProfile = await ensureCharacterGeneProfile(tx, characterId);
    if (currentProfile.pendingReroll) {
      throw new InventoryError(
        "이미 진행 중인 유전자 재조합 후보를 먼저 선택하거나 취소하세요.",
        409,
      );
    }

    const user = await tx.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { id: true, credits: true },
    });
    if (!user || user.credits < GENE_REROLL_CREDIT_COST) {
      throw new InventoryError(
        `크레딧이 부족합니다. (필요: ${GENE_REROLL_CREDIT_COST} CR)`,
        400,
      );
    }

    await consumeStashMaterial(
      tx,
      userId,
      GENE_REROLL_MATERIAL_ID,
      GENE_REROLL_MATERIAL_QTY,
      "멸균 생체 젤",
    );
    if (ampouleItemId) {
      await consumeStashMaterial(tx, userId, ampouleItemId, 1, "유전자 앰플");
    }

    const nextCredits = user.credits - GENE_REROLL_CREDIT_COST;
    await tx
      .update(users)
      .set({ credits: nextCredits })
      .where(eq(users.id, userId));

    const definitionId = character.variant?.definitionId ?? "legacy-survivor";
    const candidateGeneIds = rollGeneRerollCandidates(
      currentProfile.slots,
      slotIndex,
      definitionId,
      ampouleOwnerDefinitionId,
    );
    if (candidateGeneIds.length === 0) {
      throw new InventoryError("추출할 수 있는 대체 유전자가 없습니다.", 409);
    }

    const nextProfile: CharacterGeneProfile = {
      slots: [...currentProfile.slots],
      pendingReroll: {
        slotIndex,
        candidateGeneIds,
        ampouleItemId: ampouleItemId ?? null,
      },
    };

    await tx
      .update(characters)
      .set({ geneProfile: nextProfile })
      .where(eq(characters.id, characterId));

    return {
      geneProfile: nextProfile,
      credits: nextCredits,
    };
  });
}

export async function commitCharacterGeneReroll(
  db: Database,
  userId: string,
  characterId: string,
  chosenGeneId: string | null,
) {
  return withInventoryTransaction(db, async (tx) => {
    await requireUserAtBase(tx, userId);

    const character = await tx.query.characters.findFirst({
      where: eq(characters.id, characterId),
    });
    if (!character) throw new InventoryError("Character not found", 404);
    if (character.userId !== userId) {
      throw new InventoryError("User does not own this character", 403);
    }
    const profile = character.geneProfile;
    const pending = profile?.pendingReroll;
    if (!profile || !pending) {
      throw new InventoryError("선택 대기 중인 유전자 재조합이 없습니다.", 409);
    }

    const nextSlots = [...profile.slots];
    if (chosenGeneId !== null) {
      if (!pending.candidateGeneIds.includes(chosenGeneId)) {
        throw new InventoryError("유효한 유전자 후보가 아닙니다.", 400);
      }
      nextSlots[pending.slotIndex] = chosenGeneId;
      if (!validateGeneGradeCaps(nextSlots)) {
        throw new InventoryError("고등급 유전자 장착 제한을 초과합니다.", 409);
      }
    }

    const nextProfile: CharacterGeneProfile = {
      slots: nextSlots,
      pendingReroll: null,
    };
    const nextStats = computeCharacterStatsFromGenes(
      BASE_CHARACTER_STATS,
      nextSlots,
    );

    await tx
      .update(characters)
      .set({
        geneProfile: nextProfile,
        maxHp: nextStats.maxHp,
        hp: Math.min(character.hp, nextStats.maxHp),
        maxStamina: nextStats.maxStamina,
        stamina: Math.min(character.stamina, nextStats.maxStamina),
        staminaRegen: nextStats.staminaRegen,
        maxFatigue: nextStats.maxFatigue,
        fatigue: Math.min(character.fatigue, nextStats.maxFatigue),
        maxWeight: nextStats.maxWeight,
      })
      .where(eq(characters.id, characterId));

    return {
      geneProfile: nextProfile,
      stats: nextStats,
    };
  });
}

import type { CharacterData } from "@/utils/hooks/useGetCharacter";
import type { StashItemResponse } from "@/utils/hooks/useGetStash";
import { buildCharacterDataFromRaw } from "@/utils/hooks/useInventoryDrag";

type WeaponMasterData = StashItemResponse["weaponMaster"];

export type DraftMoveResult =
  | {
      ok: true;
      characterData: CharacterData;
      stash: StashItemResponse[];
    }
  | {
      ok: false;
      error: string;
    };

function cloneDraft(
  characterData: CharacterData,
  stash: StashItemResponse[],
): {
  newRaw: CharacterData["raw"];
  nextStash: StashItemResponse[];
} {
  const newRaw = JSON.parse(
    JSON.stringify(characterData.raw),
  ) as CharacterData["raw"];
  const nextStash = stash.map((entry) => ({
    ...entry,
    weaponMaster: { ...entry.weaponMaster },
  }));
  return { newRaw, nextStash };
}

function adjustStashQuantity(
  nextStash: StashItemResponse[],
  weaponMaster: WeaponMasterData,
  userId: string,
  delta: number,
) {
  const idx = nextStash.findIndex(
    (entry) => entry.weaponMasterId === weaponMaster.id,
  );
  if (idx !== -1) {
    const existing = nextStash[idx]!;
    const nextQty = existing.quantity + delta;
    if (nextQty <= 0) {
      nextStash.splice(idx, 1);
    } else {
      nextStash[idx] = { ...existing, quantity: nextQty };
    }
    return;
  }

  if (delta > 0) {
    nextStash.push({
      id: `local-stash-${weaponMaster.id}`,
      userId,
      weaponMasterId: weaponMaster.id,
      quantity: delta,
      weaponMaster: { ...weaponMaster },
    });
  }
}

function checkWeightLimit(
  currentWeight: number,
  deltaWeight: number,
  maxWeight: number,
): string | null {
  if (deltaWeight > 0 && currentWeight + deltaWeight > maxWeight) {
    return "최대 적재 중량을 초과했습니다.";
  }
  return null;
}

export function moveStashToBackpackDraft(
  characterData: CharacterData,
  stash: StashItemResponse[],
  weaponMasterId: string,
  preferredSlotIndex?: number,
): DraftMoveResult {
  const { newRaw, nextStash } = cloneDraft(characterData, stash);
  const stashItem = nextStash.find(
    (item) => item.weaponMasterId === weaponMasterId && item.quantity > 0,
  );
  if (!stashItem) {
    return { ok: false, error: "창고에 해당 물품이 없습니다." };
  }

  const targetSlot =
    preferredSlotIndex === undefined
      ? newRaw.inventory.find((slot) => !slot.weaponMaster)
      : newRaw.inventory[preferredSlotIndex];

  if (!targetSlot) {
    return {
      ok: false,
      error:
        preferredSlotIndex === undefined
          ? "가방 슬롯이 가득 찼습니다."
          : "유효하지 않은 가방 슬롯입니다.",
    };
  }

  const displaced = targetSlot.weaponMaster;
  const sameItem = displaced?.id === weaponMasterId;
  const deltaWeight =
    stashItem.weaponMaster.weight -
    (sameItem ? 0 : (displaced?.weight ?? 0) * targetSlot.quantity);
  const weightError = checkWeightLimit(
    newRaw.weight,
    deltaWeight,
    newRaw.maxWeight,
  );
  if (weightError) return { ok: false, error: weightError };

  adjustStashQuantity(nextStash, stashItem.weaponMaster, newRaw.userId, -1);
  if (sameItem) {
    targetSlot.quantity += 1;
  } else {
    if (displaced) {
      adjustStashQuantity(
        nextStash,
        displaced,
        newRaw.userId,
        targetSlot.quantity,
      );
    }
    newRaw.inventory[targetSlot.slotIndex] = {
      id: `local-inv-${crypto.randomUUID()}`,
      slotIndex: targetSlot.slotIndex,
      weaponMaster: { ...stashItem.weaponMaster },
      quantity: 1,
    };
  }

  return {
    ok: true,
    characterData: buildCharacterDataFromRaw(characterData, newRaw),
    stash: nextStash,
  };
}

export function moveStashToEquipmentDraft(
  characterData: CharacterData,
  stash: StashItemResponse[],
  weaponMasterId: string,
  equipSlotIndex: number,
): DraftMoveResult {
  const { newRaw, nextStash } = cloneDraft(characterData, stash);
  const stashItem = nextStash.find(
    (item) => item.weaponMasterId === weaponMasterId && item.quantity > 0,
  );
  if (!stashItem) {
    return { ok: false, error: "창고에 해당 물품이 없습니다." };
  }

  const targetEquip = newRaw.equipment[equipSlotIndex];
  if (!targetEquip) {
    return { ok: false, error: "유효하지 않은 장비 슬롯입니다." };
  }

  const displaced = targetEquip.weaponMaster;
  const deltaWeight = stashItem.weaponMaster.weight - (displaced?.weight ?? 0);
  const weightError = checkWeightLimit(
    newRaw.weight,
    deltaWeight,
    newRaw.maxWeight,
  );
  if (weightError) {
    return { ok: false, error: weightError };
  }

  adjustStashQuantity(nextStash, stashItem.weaponMaster, newRaw.userId, -1);
  if (displaced) {
    adjustStashQuantity(nextStash, displaced, newRaw.userId, 1);
  }

  newRaw.equipment[equipSlotIndex] = {
    id: `local-wpn-${crypto.randomUUID()}`,
    slotIndex: equipSlotIndex,
    weaponMaster: { ...stashItem.weaponMaster },
  };

  return {
    ok: true,
    characterData: buildCharacterDataFromRaw(characterData, newRaw),
    stash: nextStash,
  };
}

export function moveSlotToStashDraft(
  characterData: CharacterData,
  stash: StashItemResponse[],
  slotId: string,
): DraftMoveResult {
  const { newRaw, nextStash } = cloneDraft(characterData, stash);

  const equipIndex = newRaw.equipment.findIndex((slot) => slot.id === slotId);
  if (equipIndex !== -1) {
    const slot = newRaw.equipment[equipIndex]!;
    if (!slot.weaponMaster) {
      return { ok: false, error: "비어 있는 장비 슬롯입니다." };
    }
    adjustStashQuantity(nextStash, slot.weaponMaster, newRaw.userId, 1);
    newRaw.equipment[equipIndex] = {
      id: `empty-wpn-${equipIndex}`,
      slotIndex: equipIndex,
      weaponMaster: null,
    };
    return {
      ok: true,
      characterData: buildCharacterDataFromRaw(characterData, newRaw),
      stash: nextStash,
    };
  }

  const invIndex = newRaw.inventory.findIndex((slot) => slot.id === slotId);
  if (invIndex !== -1) {
    const slot = newRaw.inventory[invIndex]!;
    if (!slot.weaponMaster || slot.quantity < 1) {
      return { ok: false, error: "비어 있는 가방 슬롯입니다." };
    }
    adjustStashQuantity(
      nextStash,
      slot.weaponMaster,
      newRaw.userId,
      slot.quantity,
    );
    newRaw.inventory[invIndex] = {
      id: `empty-inv-${invIndex}`,
      slotIndex: invIndex,
      weaponMaster: null,
      quantity: 0,
    };
    return {
      ok: true,
      characterData: buildCharacterDataFromRaw(characterData, newRaw),
      stash: nextStash,
    };
  }

  return { ok: false, error: "창고로 보낼 수 있는 아이템이 아닙니다." };
}

export function applyImmediateStashMove(
  characterData: CharacterData,
  stash: StashItemResponse[],
  {
    direction,
    weaponMasterId,
    slotIndex,
  }: {
    direction: "to_backpack" | "to_stash";
    weaponMasterId: string;
    slotIndex: number;
  },
): DraftMoveResult {
  const { newRaw, nextStash } = cloneDraft(characterData, stash);

  if (direction === "to_backpack") {
    const stashItem = nextStash.find(
      (item) => item.weaponMasterId === weaponMasterId && item.quantity > 0,
    );
    if (!stashItem) {
      return { ok: false, error: "창고에 해당 물품이 없습니다." };
    }

    const targetSlot = newRaw.inventory[slotIndex];
    if (!targetSlot || targetSlot.weaponMaster) {
      return { ok: false, error: "비어 있는 가방 슬롯이 필요합니다." };
    }

    const weightError = checkWeightLimit(
      newRaw.weight,
      stashItem.weaponMaster.weight,
      newRaw.maxWeight,
    );
    if (weightError) return { ok: false, error: weightError };

    adjustStashQuantity(nextStash, stashItem.weaponMaster, newRaw.userId, -1);
    newRaw.inventory[slotIndex] = {
      id: `local-inv-${crypto.randomUUID()}`,
      slotIndex,
      weaponMaster: { ...stashItem.weaponMaster },
      quantity: 1,
    };

    return {
      ok: true,
      characterData: buildCharacterDataFromRaw(characterData, newRaw),
      stash: nextStash,
    };
  }

  const slot = newRaw.inventory[slotIndex];
  if (!slot || slot.weaponMaster?.id !== weaponMasterId || slot.quantity < 1) {
    return { ok: false, error: "창고로 보낼 물품을 찾을 수 없습니다." };
  }

  adjustStashQuantity(
    nextStash,
    slot.weaponMaster,
    newRaw.userId,
    slot.quantity,
  );
  newRaw.inventory[slotIndex] = {
    id: `empty-inv-${slotIndex}`,
    slotIndex,
    weaponMaster: null,
    quantity: 0,
  };

  return {
    ok: true,
    characterData: buildCharacterDataFromRaw(characterData, newRaw),
    stash: nextStash,
  };
}

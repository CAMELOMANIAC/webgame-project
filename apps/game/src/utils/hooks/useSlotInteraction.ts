import type { Item } from "@webgame/types";
import { createContext, useContext } from "react";

import type { InspectedItem } from "@/components/itemSlot/ItemDetailModal";
import type { CharacterData } from "@/utils/hooks/useGetCharacter";

export interface SlotInspectTarget {
  source: "equipment" | "backpack";
  item: Item;
  index?: number;
}

export interface SlotInteractionContextValue {
  onInspectSlot?: (target: SlotInspectTarget) => void;
  isClickSuppressed?: () => boolean;
}

export const SlotInteractionContext =
  createContext<SlotInteractionContextValue>({});

export function useSlotInteraction() {
  return useContext(SlotInteractionContext);
}

export function resolveInspectedSlotDetails(
  target: SlotInspectTarget,
  characterData: CharacterData | undefined,
): {
  baseItem: Omit<InspectedItem, "actions">;
  rawSlotIndex: number | undefined;
  firstEmptyEquipId: string | undefined;
  firstEmptyBackpackId: string | undefined;
} {
  const firstEmptyEquipId = characterData?.equipment.find((slot) =>
    slot.id.toString().includes("empty"),
  )?.id;
  const firstEmptyBackpackId = characterData?.inventory.find((slot) =>
    slot.id.toString().includes("empty"),
  )?.id;

  const rawEq =
    target.source === "equipment"
      ? (characterData?.raw.equipment[target.index ?? -1] ??
        characterData?.raw.equipment.find((slot) => slot.id === target.item.id))
      : undefined;
  const rawInv =
    target.source === "backpack"
      ? characterData?.raw.inventory.find((slot) => slot.id === target.item.id)
      : undefined;
  const rawMaster = rawEq?.weaponMaster ?? rawInv?.weaponMaster ?? undefined;
  const rawSlotIndex = rawEq?.slotIndex ?? rawInv?.slotIndex ?? target.index;
  const slotNum = String((rawSlotIndex ?? 0) + 1).padStart(2, "0");

  return {
    baseItem: {
      id: target.item.id,
      masterId: rawMaster?.id ?? target.item.masterId,
      name: rawMaster?.name ?? target.item.name,
      iconKey: rawMaster?.iconKey ?? target.item.iconKey,
      quantity: rawInv?.quantity ?? target.item.quantity,
      weight: rawMaster?.weight ?? target.item.weight,
      value: rawMaster?.value ?? target.item.value,
      weaponData: rawMaster ?? undefined,
      slotLabel:
        target.source === "equipment"
          ? `장착 슬롯 ${slotNum}`
          : `가방 슬롯 ${slotNum}`,
    },
    rawSlotIndex,
    firstEmptyEquipId,
    firstEmptyBackpackId,
  };
}

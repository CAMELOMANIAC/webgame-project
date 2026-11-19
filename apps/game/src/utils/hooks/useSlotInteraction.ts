import type { Item } from "@webgame/types";
import { createContext, useContext } from "react";

import type { InspectedItem } from "@/components/itemSlot/ItemDetailModal";
import type { CharacterData } from "@/utils/hooks/useGetCharacter";

export interface SlotInspectTarget {
  source: "equipment" | "backpack" | "combatant";
  item: Item;
  index?: number;
  weaponData?: InspectedItem["weaponData"];
  ownerName?: string;
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

  const slotLabel =
    target.source === "equipment"
      ? `장착 슬롯 ${slotNum}`
      : target.source === "backpack"
        ? `가방 슬롯 ${slotNum}`
        : target.ownerName
          ? `${target.ownerName} · 슬롯 ${slotNum}`
          : `장비 슬롯 ${slotNum}`;

  return {
    baseItem: {
      id: target.item.id,
      masterId: rawMaster?.id ?? target.weaponData?.id ?? target.item.masterId,
      name: rawMaster?.name ?? target.weaponData?.name ?? target.item.name,
      iconKey: rawMaster?.iconKey ?? target.item.iconKey,
      quantity: rawInv?.quantity ?? target.item.quantity,
      weight:
        rawMaster?.weight ?? target.weaponData?.weight ?? target.item.weight,
      value: rawMaster?.value ?? target.weaponData?.value ?? target.item.value,
      weaponData: rawMaster ?? target.weaponData ?? undefined,
      slotLabel,
    },
    rawSlotIndex,
    firstEmptyEquipId,
    firstEmptyBackpackId,
  };
}

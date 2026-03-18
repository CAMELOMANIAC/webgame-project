import { type Weapon } from "@webgame/types";
import { atom } from "jotai";

import { inventoryItemAtom } from "./inventoryItemAtom";

export type WeaponSlot = {
  id: number;
  weapon: Weapon | null;
};

const initialWeaponItem: WeaponSlot[] = [
  { id: 0, weapon: null },
  { id: 1, weapon: null },
  { id: 2, weapon: null },
  { id: 3, weapon: null },
  { id: 4, weapon: null },
  { id: 5, weapon: null },
];
export const weaponItemAtom = atom<WeaponSlot[]>(initialWeaponItem);

export const weaponSlotOrderAtom = atom<number[]>([0, 1, 2, 3, 4, 5]);

/**
 * 인벤토리 배열에서 특정 ID의 아이템을 읽는 파생 아톰을 반환
 */
export const selectItemAtIndex = (id: number | null) =>
  atom((get) => {
    const weaponItems = get(weaponItemAtom);
    const item = weaponItems.find((item) => item.id === id);
    return item !== undefined ? item : null;
  });

export const setEquipItemAtom = atom(
  null,
  (get, set, { inventoryId, equipId }: { inventoryId: number | null; equipId: number }) => {
    if (inventoryId === null) return;

    const inventoryItems = get(inventoryItemAtom);
    const inventoryItem = inventoryItems.find((i) => i.id === inventoryId);
    if (!inventoryItem) return;

    // 아이템이 무기인지 확인
    if (!("use" in inventoryItem.item)) {
      console.warn("This item is not a weapon and cannot be equipped.");
      return;
    }

    const weaponSlots = [...get(weaponItemAtom)];

    // 해당 슬롯에 무기 장착
    weaponSlots[equipId] = {
      id: equipId,
      weapon: { ...inventoryItem.item } as Weapon, // 객체 복사하여 저장
    };

    set(weaponItemAtom, weaponSlots);
  },
);

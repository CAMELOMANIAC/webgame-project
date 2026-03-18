import { type Item, type Weapon } from "@webgame/types";
import { atom } from "jotai";

import { defaultWeapon, giantSlayer, healingWeapon, sniperRifle } from "../utils/weapon";

export type InventoryItem = {
  id: number;
  count?: number;
  // 아이템이 무기라면 Weapon 객체를, 아니면 단순히 Item 정보를 가짐
  item: Weapon | Item;
};

const initialInventoryItem: InventoryItem[] = [
  { id: 1, item: { ...defaultWeapon, name: "Sword" } },
  { id: 2, item: { id: "item_armor_01", name: "Armor", weight: 20, value: 500 } },
  { id: 3, item: healingWeapon },
  { id: 4, item: sniperRifle },
  { id: 5, item: giantSlayer },
];

export const inventoryItemAtom = atom<InventoryItem[]>(initialInventoryItem);

/**
 * 인벤토리 배열에서 특정 ID의 아이템을 읽는 파생 아톰을 반환
 */
export const selectItemAtIndex = (id: number) =>
  atom((get) => {
    const inventoryItems = get(inventoryItemAtom);
    const item = inventoryItems.find((i) => i.id === id);
    return item !== undefined ? item : null;
  });

import { atom } from "jotai";

type InventoryItemAtom = { id: number; name: string; count?: number };
const initialInventoryItem: InventoryItemAtom[] = [
  { id: 1, name: "sword" },
  { id: 2, name: "armor" },
];
export const inventoryItemAtom = atom<InventoryItemAtom[]>(initialInventoryItem);

/**
 * 인벤토리 배열에서 특정 인덱스의 아이템을 읽는 파생 아톰을 반환
 * @param index - 읽어올 인덱스
 */
export const selectItemAtIndex = (id: number) =>
  atom((get) => {
    const inventoryItem = get(inventoryItemAtom); // 기본 아톰의 값을 가져옴
    const item = inventoryItem.find((item) => item.id === id);
    return item !== undefined ? item : null;
  });

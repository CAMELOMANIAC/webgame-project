import { atom } from "jotai";

import { inventoryItemAtom } from "./inventoryItemAtom";

type WeaponItemAtom = { id: number; name: string; count?: number };
const initialWeaponItem: WeaponItemAtom[] = [];
export const weaponItemAtom = atom<WeaponItemAtom[]>(initialWeaponItem);

/**
 * 인벤토리 배열에서 특정 인덱스의 아이템을 읽는 파생 아톰을 반환
 * @param index - 읽어올 인덱스
 */
export const selectItemAtIndex = (id: number | null) =>
  atom((get) => {
    const weaponItem = get(weaponItemAtom); // 기본 아톰의 값을 가져옴
    const item = weaponItem.find((item) => item.id === id);
    return item !== undefined ? item : null;
  });

export const setEquipItemAtom = atom(
  null,
  (get, set, { inventoryId, equipId }: { inventoryId: number | null; equipId: number }) => {
    console.log(inventoryId, equipId);
    if (inventoryId === null || equipId === null) return;

    const inventoryItem = get(inventoryItemAtom);
    const item = inventoryItem.find((item) => item.id === inventoryId);
    if (!item) return;

    const weaponItem = [...get(weaponItemAtom)];

    // 찾았을 때만 업데이트
    weaponItem[equipId] = { id: equipId, name: item.name, count: item.count };
    console.log("updated weaponItem:", weaponItem);

    set(weaponItemAtom, weaponItem);
  }
);

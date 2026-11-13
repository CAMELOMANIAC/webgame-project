import { getItemKind } from "./crafting";
import type { WeaponEffect } from "./index";

interface EquipmentEntry<T> {
  id: string;
  slotIndex: number;
  weaponMaster: T | null;
}

interface BackpackEntry<T> extends EquipmentEntry<T> {
  quantity: number;
}

interface InventoryWeapon {
  id: string;
  name: string;
  iconKey: string;
  attackType: "MELEE" | "RANGED";
  weight: number;
  value: number;
  damage: number;
  staminaCost: number;
  cooldownTicks: number;
  castTicks: number;
  description: string | null;
  effect?: WeaponEffect | null;
}

export interface StashItemData {
  id: string;
  userId: string;
  weaponMasterId: string;
  quantity: number;
  weaponMaster: InventoryWeapon;
}

export interface InventorySnapshot {
  weight: number;
  equipment: EquipmentEntry<InventoryWeapon>[];
  inventory: BackpackEntry<InventoryWeapon>[];
}

export interface InventoryUpdateResponse extends InventorySnapshot {
  status: "success";
}

export interface StashMoveResponse extends InventoryUpdateResponse {
  stash: StashItemData[];
}

export interface RecoveredStashDelta {
  weaponMaster: InventoryWeapon;
  quantity: number;
}

export interface UnequippedCharacterSummary {
  characterId: string;
  weight: number;
}

export interface UnequipOthersResponse {
  status: "success";
  stash: StashItemData[];
  unequippedCharacters: UnequippedCharacterSummary[];
  recoveredItems: RecoveredStashDelta[];
}

// 화면의 슬롯 교환에서도 여러 개짜리 묶음을 장착하며 수량이 사라지지 않게 한다.
export function swapEquipmentBackpack<
  T extends { id: string; effect?: unknown },
>(
  equipment: EquipmentEntry<T>[],
  inventory: BackpackEntry<T>[],
  equipmentIndex: number,
  inventoryIndex: number,
  createId: () => string = () => crypto.randomUUID(),
): boolean {
  const equipped = equipment[equipmentIndex];
  const carried = inventory[inventoryIndex];
  if (
    !equipped ||
    !carried ||
    (!equipped.weaponMaster && !carried.weaponMaster)
  )
    return false;
  if (
    carried.weaponMaster &&
    getItemKind(carried.weaponMaster) === "MATERIAL"
  ) {
    return false;
  }
  if (carried.weaponMaster && carried.quantity > 1) {
    if (equipped.weaponMaster?.id === carried.weaponMaster.id) return false;
    const emptyIndex = equipped.weaponMaster
      ? inventory.findIndex(
          (item, index) => index !== inventoryIndex && !item.weaponMaster,
        )
      : -1;
    if (equipped.weaponMaster && emptyIndex === -1) return false;
    if (equipped.weaponMaster)
      inventory[emptyIndex] = {
        ...equipped,
        slotIndex: emptyIndex,
        quantity: 1,
      };
    equipment[equipmentIndex] = {
      id: `local-equipment-${createId()}`,
      slotIndex: equipmentIndex,
      weaponMaster: carried.weaponMaster,
    };
    inventory[inventoryIndex] = { ...carried, quantity: carried.quantity - 1 };
  } else {
    equipment[equipmentIndex] = {
      id: carried.weaponMaster ? carried.id : `empty-wpn-${equipmentIndex}`,
      slotIndex: equipmentIndex,
      weaponMaster: carried.weaponMaster,
    };
    inventory[inventoryIndex] = {
      id: equipped.weaponMaster ? equipped.id : `empty-inv-${inventoryIndex}`,
      slotIndex: inventoryIndex,
      weaponMaster: equipped.weaponMaster,
      quantity: equipped.weaponMaster ? 1 : 0,
    };
  }
  return true;
}

/**
 * 소지품 총 가치(Value)에 따른 탐사 투입 지연 시간(분)을 계산합니다.
 * 규칙: 가치 100당 10분 지연
 */
export function calculateEntryDelayMinutes(totalValue: number): number {
  if (!Number.isFinite(totalValue) || totalValue <= 0) return 0;
  return Math.floor(totalValue / 100) * 10;
}

/**
 * 장비 및 가방 슬롯의 총 가치를 계산합니다.
 */
export function calculateLoadoutTotalValue(
  equipment: { weaponMaster?: { value: number } | null }[],
  inventory: { weaponMaster?: { value: number } | null; quantity?: number }[],
): number {
  const equipValue = equipment.reduce(
    (sum, item) => sum + (item.weaponMaster?.value ?? 0),
    0,
  );
  const invValue = inventory.reduce(
    (sum, item) =>
      sum + (item.weaponMaster?.value ?? 0) * (item.quantity ?? 1),
    0,
  );
  return equipValue + invValue;
}

/**
 * 탐사 경과 시간(분)을 HH:mm 형식으로 포맷합니다.
 */
export function formatRaidTime(minutes: number): string {
  const safeMinutes = Math.max(0, Math.floor(minutes));
  const hours = String(Math.floor(safeMinutes / 60)).padStart(2, "0");
  const mins = String(safeMinutes % 60).padStart(2, "0");
  return `${hours}:${mins}`;
}


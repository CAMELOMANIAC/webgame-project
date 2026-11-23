import type { WeaponEffect, WeaponTag } from "./index";

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
  tags?: WeaponTag[];
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

export const MIN_BACKPACK_SLOTS = 18;
export const BACKPACK_ROW_SIZE = 6;

/**
 * 가방에 들어있는 아이템의 슬롯 인덱스를 기준으로 표시할 전체 가방 슬롯 수를 계산합니다.
 * 최소 18칸(6칸 × 3줄)을 유지하며, 빈 슬롯이 남도록 1줄(6칸) 단위로 자동 확장됩니다.
 */
export function calculateBackpackSlotCount(
  occupiedSlotIndices: Iterable<number>,
): number {
  let maxOccupiedIndex = -1;
  for (const index of occupiedSlotIndices) {
    if (index > maxOccupiedIndex) {
      maxOccupiedIndex = index;
    }
  }
  const minRequiredWithEmpty = maxOccupiedIndex + 2;
  if (minRequiredWithEmpty <= MIN_BACKPACK_SLOTS) {
    return MIN_BACKPACK_SLOTS;
  }
  return (
    Math.ceil(minRequiredWithEmpty / BACKPACK_ROW_SIZE) * BACKPACK_ROW_SIZE
  );
}

/**
 * 점유된 슬롯 인덱스를 제외한 가장 작은 비음수 빈 슬롯 인덱스를 반환합니다.
 */
export function findNextAvailableBackpackSlotIndex(
  occupiedSlotIndices: Iterable<number>,
): number {
  const occupied = new Set(occupiedSlotIndices);
  let slotIndex = 0;
  while (occupied.has(slotIndex)) {
    slotIndex += 1;
  }
  return slotIndex;
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
 * 투입 지연 곡선의 구간 경계. 같은 수준의 장비를 든 적이 등장하는 시각
 * (`ENEMY_TIER_TIME_THRESHOLDS`: 약체 0~90분, 2티어 121분~, 3티어 241분~)에 맞춘 값입니다.
 */
export const ENTRY_DELAY_RULES = {
  /** 1구간: 이 가치까지 `earlyValueStep`당 `earlyMinutesPerStep`분 */
  earlyMaxValue: 150,
  earlyValueStep: 50,
  earlyMinutesPerStep: 30,
  /** 2구간: `earlyMaxValue` ~ 이 가치 사이에서 `midSpanMinutes`분이 10분 단위로 늘어남 */
  midMaxValue: 500,
  midSpanMinutes: 30,
  /** 3구간: `midMaxValue` 초과분 `lateValueStep`당 10분 */
  lateValueStep: 125,
} as const;

/**
 * 소지품 총 가치(Value)에 따른 탐사 투입 지연 시간(분)을 계산합니다.
 * 장착 장비와 가방의 모든 아이템 가치를 합산한 값을 받습니다.
 * 규칙:
 * - 0 ~ 150 가치: 50당 30분 (150 가치 = 90분, 약체 구간 종료 시각)
 * - 150 ~ 500 가치: 90분 + 30분을 10분 단위로 균등 배분 (500 가치 = 120분, 2티어 등장 시각)
 * - 500 초과 가치: 120분 + 초과분 125당 10분 (2,000 가치 = 240분, 3티어 등장 시각)
 */
export function calculateEntryDelayMinutes(totalValue: number): number {
  if (!Number.isFinite(totalValue) || totalValue <= 0) return 0;
  const {
    earlyMaxValue,
    earlyValueStep,
    earlyMinutesPerStep,
    midMaxValue,
    midSpanMinutes,
    lateValueStep,
  } = ENTRY_DELAY_RULES;
  const earlyMaxMinutes =
    (earlyMaxValue / earlyValueStep) * earlyMinutesPerStep;
  if (totalValue <= earlyMaxValue) {
    return Math.floor(totalValue / earlyValueStep) * earlyMinutesPerStep;
  }
  if (totalValue <= midMaxValue) {
    const midSteps = midSpanMinutes / 10;
    return (
      earlyMaxMinutes +
      Math.floor(
        ((totalValue - earlyMaxValue) * midSteps) /
          (midMaxValue - earlyMaxValue),
      ) *
        10
    );
  }
  return (
    earlyMaxMinutes +
    midSpanMinutes +
    Math.floor((totalValue - midMaxValue) / lateValueStep) * 10
  );
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


import type { QueryClient } from "@tanstack/react-query";
import {
  calculateBackpackSlotCount,
  type CharacterGeneProfile,
  type FoodBuffEffect,
  type InventorySnapshot,
  type Item,
  type RaidView,
} from "@webgame/types";
import { getDefaultStore } from "jotai";

import { isInventoryDirtyAtom } from "@/atoms/raidAtom";

import { API_BASE_URL, apiFetch } from "./api";
import type { CharacterVariant } from "./hooks/useCharacterCollection";
import { readApiResponse } from "./request";

export const characterKey = (
  userId: string | null | undefined,
  characterId: string | null | undefined,
) => ["character", userId, characterId] as const;

export interface CharacterResponse {
  id: string;
  displayName: string;
  variant?: CharacterVariant | null;
  userId: string;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  staminaRegen: number;
  fatigue: number;
  maxFatigue: number;
  weight: number;
  maxWeight: number;
  time: number;
  isRaiding: boolean;
  currentNodeId: number;
  returnedAt?: string | null;
  serverTime?: string;
  activeFoodBuff?: FoodBuffEffect | null;
  geneProfile?: CharacterGeneProfile | null;
  activeRaidId: string | null;
  activeRaid: RaidView | null;
  user: {
    nickname: string;
  };
  equipment: InventorySnapshot["equipment"];
  inventory: InventorySnapshot["inventory"];
}

export interface CharacterData {
  equipment: Item[];
  inventory: Item[];
  raw: CharacterResponse;
}

export function createCharacterQueryOptions(
  queryClient: QueryClient,
  userId: string | null | undefined,
  characterId: string | null | undefined,
) {
  return {
    queryKey: characterKey(userId, characterId),
    queryFn: async ({
      signal,
    }: {
      signal?: AbortSignal;
    }): Promise<CharacterData> => {
      const url = `${API_BASE_URL}/character/${characterId}`;
      const fetchCharacter = async () =>
        readApiResponse<CharacterResponse>(await apiFetch(url, { signal }));
      let data = await fetchCharacter();
      if (data.isRaiding && data.activeRaid?.status !== "ACTIVE") {
        const response = await apiFetch(`${url}/raid/recover`, {
          method: "POST",
          signal,
        });
        if (!response.ok) await readApiResponse(response);
        data = await fetchCharacter();
        void queryClient.invalidateQueries({
          queryKey: ["characters", userId],
        });
      }

      const normalized = normalizeCharacterData(data);
      const store = getDefaultStore();
      if (store.get(isInventoryDirtyAtom)) {
        const cached = queryClient.getQueryData<CharacterData>(
          characterKey(userId, characterId),
        );
        if (
          cached &&
          data.isRaiding &&
          hasSameItemPool(cached.raw, normalized.raw)
        ) {
          return {
            ...normalized,
            equipment: cached.equipment,
            inventory: cached.inventory,
            raw: {
              ...normalized.raw,
              equipment: cached.raw.equipment,
              inventory: cached.raw.inventory,
              weight: cached.raw.weight,
            },
          };
        }
        store.set(isInventoryDirtyAtom, false);
      }

      return normalized;
    },
    staleTime: Infinity,
  };
}

function collectItemCounts(raw: CharacterResponse): Map<string, number> {
  const counts = new Map<string, number>();
  for (const w of raw.equipment) {
    if (w.weaponMaster) {
      counts.set(w.weaponMaster.id, (counts.get(w.weaponMaster.id) ?? 0) + 1);
    }
  }
  for (const i of raw.inventory) {
    if (i.weaponMaster && i.quantity > 0) {
      counts.set(
        i.weaponMaster.id,
        (counts.get(i.weaponMaster.id) ?? 0) + i.quantity,
      );
    }
  }
  return counts;
}

function hasSameItemPool(a: CharacterResponse, b: CharacterResponse): boolean {
  const countsA = collectItemCounts(a);
  const countsB = collectItemCounts(b);
  if (countsA.size !== countsB.size) return false;
  for (const [id, qty] of countsA) {
    if (countsB.get(id) !== qty) return false;
  }
  return true;
}

export function normalizeCharacterData(data: CharacterResponse): CharacterData {
  // 정규화된 데이터 생성 함수
  const createEmptyWeapon = (index: number) => ({
    id: `empty-wpn-${index}`,
    slotIndex: index,
    weaponMaster:
      null as CharacterResponse["equipment"][number]["weaponMaster"],
  });

  const createEmptyInventory = (index: number) => ({
    id: `empty-inv-${index}`,
    slotIndex: index,
    weaponMaster:
      null as CharacterResponse["inventory"][number]["weaponMaster"],
    quantity: 0,
  });

  // 1. 장착창 정규화 (6슬롯 고정)
  const normalizedEquipment: CharacterResponse["equipment"] = Array(6)
    .fill(null)
    .map((_, i) => createEmptyWeapon(i));
  data.equipment.forEach((w) => {
    if (w.slotIndex < 6) normalizedEquipment[w.slotIndex] = w;
  });

  // 2. 백팩 정규화 (최소 18슬롯, 1줄 6칸 단위로 동적 확장)
  const backpackSlotCount = calculateBackpackSlotCount(
    data.inventory
      .filter((i) => i.weaponMaster !== null && i.quantity > 0)
      .map((i) => i.slotIndex),
  );
  const normalizedInventory: CharacterResponse["inventory"] = Array(
    backpackSlotCount,
  )
    .fill(null)
    .map((_, i) => createEmptyInventory(i));
  data.inventory.forEach((i) => {
    if (i.slotIndex >= 0 && i.slotIndex < backpackSlotCount) {
      normalizedInventory[i.slotIndex] = i;
    }
  });

  const rawNormalized: CharacterResponse = {
    ...data,
    equipment: normalizedEquipment,
    inventory: normalizedInventory,
  };

  // 컴포넌트 편의를 위한 단순 Item 배열 추출
  const equipment = normalizedEquipment.map((w) => ({
    id: w.id,
    masterId: w.weaponMaster?.id,
    name: w.weaponMaster?.name || "",
    iconKey: w.weaponMaster?.iconKey,
    weight: w.weaponMaster?.weight || 0,
    value: w.weaponMaster?.value || 0,
  }));

  const inventory = normalizedInventory.map((i) => ({
    id: i.id,
    masterId: i.weaponMaster?.id,
    name: i.weaponMaster?.name || "",
    iconKey: i.weaponMaster?.iconKey,
    weight: i.weaponMaster?.weight || 0,
    value: i.weaponMaster?.value || 0,
    quantity: i.quantity,
  }));

  return {
    equipment,
    inventory,
    raw: rawNormalized,
  };
}

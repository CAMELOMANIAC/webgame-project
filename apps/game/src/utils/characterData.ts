import type { QueryClient } from "@tanstack/react-query";
import type { InventorySnapshot, Item, RaidView } from "@webgame/types";

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
  weight: number;
  maxWeight: number;
  time: number;
  isRaiding: boolean;
  currentNodeId: number;
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

      return normalizeCharacterData(data);
    },
    staleTime: Infinity,
  };
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

  // 2. 백팩 정규화 (32슬롯 고정)
  const normalizedInventory: CharacterResponse["inventory"] = Array(32)
    .fill(null)
    .map((_, i) => createEmptyInventory(i));
  data.inventory.forEach((i) => {
    if (i.slotIndex < 32) normalizedInventory[i.slotIndex] = i;
  });

  const rawNormalized: CharacterResponse = {
    ...data,
    equipment: normalizedEquipment,
    inventory: normalizedInventory,
  };

  // 컴포넌트 편의를 위한 단순 Item 배열 추출
  const equipment = normalizedEquipment.map((w) => ({
    id: w.id,
    name: w.weaponMaster?.name || "",
    iconKey: w.weaponMaster?.iconKey,
    weight: w.weaponMaster?.weight || 0,
    value: w.weaponMaster?.value || 0,
  }));

  const inventory = normalizedInventory.map((i) => ({
    id: i.id,
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

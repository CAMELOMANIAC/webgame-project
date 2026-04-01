import { useQuery } from "@tanstack/react-query";
import type { Item } from "@webgame/types";

const API_BASE_URL = "http://localhost:3001";

// Temporary hardcoded userId for development
const TEMP_USER_ID = "da30ac6b-e93c-44d9-b344-ab67f99d2f80";

export interface CharacterResponse {
  id: string;
  userId: string;
  equipment: Array<{
    id: string;
    slotIndex: number;
    weaponMaster: {
      id: string;
      name: string;
      weight: number;
      value: number;
      damage: number;
      staminaCost: number;
      cooldownTicks: number;
      castTicks: number;
      description: string;
    } | null;
  }>;
  inventory: Array<{
    id: string;
    slotIndex: number;
    weaponMaster: {
      id: string;
      name: string;
      weight: number;
      value: number;
      damage: number;
      staminaCost: number;
      cooldownTicks: number;
      castTicks: number;
      description: string;
    } | null;
    quantity: number;
  }>;
}

export interface CharacterData {
  equipment: Item[];
  inventory: Item[];
  raw: CharacterResponse;
}

export const useGetCharacter = (userId: string = TEMP_USER_ID) => {
  return useQuery<CharacterData>({
    queryKey: ["character", userId],
    queryFn: async (): Promise<CharacterData> => {
      const response = await fetch(`${API_BASE_URL}/user/${userId}/character`);
      if (!response.ok) {
        throw new Error("Failed to fetch character data");
      }
      const data: CharacterResponse = await response.json();

      // 정규화된 데이터 생성 함수
      const createEmptyWeapon = (index: number) => ({
        id: `empty-wpn-${index}`,
        slotIndex: index,
        weaponMaster: null as CharacterResponse["equipment"][number]["weaponMaster"],
      });

      const createEmptyInventory = (index: number) => ({
        id: `empty-inv-${index}`,
        slotIndex: index,
        weaponMaster: null as CharacterResponse["inventory"][number]["weaponMaster"],
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
        id: w.weaponMaster?.id || w.id,
        name: w.weaponMaster?.name || "",
        weight: w.weaponMaster?.weight || 0,
        value: w.weaponMaster?.value || 0,
      }));

      const inventory = normalizedInventory.map((i) => ({
        id: i.weaponMaster?.id || i.id,
        name: i.weaponMaster?.name || "",
        weight: i.weaponMaster?.weight || 0,
        value: i.weaponMaster?.value || 0,
      }));

      return {
        equipment,
        inventory,
        raw: rawNormalized,
      };
    },
    staleTime: Infinity,
  });
};

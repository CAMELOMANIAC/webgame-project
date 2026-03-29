import { useQuery } from "@tanstack/react-query";
import type { Item } from "@webgame/types";

const API_BASE_URL = "http://localhost:3001";

// Temporary hardcoded userId for development
const TEMP_USER_ID = "976eca2b-dadd-49d0-8b70-0ac3849d2706";

interface CharacterResponse {
  id: string;
  userId: string;
  weapons: Array<{
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
    };
  }>;
  inventory: Array<{
    id: string;
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
    };
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

      const emptyItem: Item = {
        id: "",
        name: "",
        weight: 0,
        value: 0,
      };

      // 1. Map equipment (6 slots)
      const equipment: Item[] = Array(6)
        .fill(null)
        .map((_, index) => ({
          ...emptyItem,
          id: `empty-eq-${index}`,
        }));

      data.weapons.forEach((weapon) => {
        if (weapon.slotIndex >= 0 && weapon.slotIndex < 6) {
          equipment[weapon.slotIndex] = {
            id: weapon.weaponMaster.id,
            name: weapon.weaponMaster.name,
            weight: weapon.weaponMaster.weight,
            value: weapon.weaponMaster.value,
          };
        }
      });

      // 2. Map inventory (up to 32 slots)
      const inventoryItems: Item[] = data.inventory.map((item) => ({
        id: item.weaponMaster.id,
        name: item.weaponMaster.name,
        weight: item.weaponMaster.weight,
        value: item.weaponMaster.value,
      }));

      // Pad to 32 items
      const inventory = [...inventoryItems];
      while (inventory.length < 32) {
        inventory.push({ ...emptyItem, id: `empty-inv-${inventory.length}` });
      }

      return {
        equipment,
        inventory,
        raw: data,
      };
    },
    staleTime: Infinity,
  });
};

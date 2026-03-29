import { useQuery } from "@tanstack/react-query";
import type { Item } from "@webgame/types";

const API_BASE_URL = "http://localhost:3001";

export interface GhostWeaponResponse {
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
}

export interface GhostSnapshotResponse {
  id: string;
  userId: string;
  nodeId: string;
  day: number;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  staminaRegen: number;
  weight: number;
  maxWeight: number;
  user: {
    id: string;
    nickname: string;
  };
  weapons: GhostWeaponResponse[];
}

export interface GhostData {
  equipment: Item[];
  raw: GhostSnapshotResponse;
}

export const useGetGhost = (nodeId: string, day: number) => {
  return useQuery<GhostData>({
    queryKey: ["ghost", nodeId, day],
    queryFn: async (): Promise<GhostData> => {
      const response = await fetch(
        `${API_BASE_URL}/ghost/match?nodeId=${encodeURIComponent(nodeId)}&day=${day}`
      );
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("No ghost found for this node");
        }
        throw new Error("Failed to fetch ghost data");
      }
      const data: GhostSnapshotResponse = await response.json();

      const emptyItem: Item = {
        id: "",
        name: "",
        weight: 0,
        value: 0,
      };

      // Map equipment (6 slots)
      const equipment: Item[] = Array(6)
        .fill(null)
        .map((_, index) => ({
          ...emptyItem,
          id: `empty-gh-eq-${index}`,
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

      return {
        equipment,
        raw: data,
      };
    },
    enabled: !!nodeId,
  });
};


import { useQuery } from "@tanstack/react-query";

const API_BASE_URL = "http://localhost:3001";
const TEMP_USER_ID = "da30ac6b-e93c-44d9-b344-ab67f99d2f80";

export interface StashItemResponse {
  id: string;
  userId: string;
  weaponMasterId: string;
  quantity: number;
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

export const useGetStash = (userId: string = TEMP_USER_ID) => {
  return useQuery<StashItemResponse[]>({
    queryKey: ["stash", userId],
    queryFn: async (): Promise<StashItemResponse[]> => {
      const response = await fetch(`${API_BASE_URL}/user/${userId}/stash`);
      if (!response.ok) {
        throw new Error("Failed to fetch stash data");
      }
      return response.json();
    },
    staleTime: Infinity,
  });
};

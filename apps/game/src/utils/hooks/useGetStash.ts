import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";

import { selectedUserIdAtom } from "@/atoms/authAtom";

import { API_BASE_URL,apiFetch } from "../api";

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

export const useGetStash = (requestedUserId?: string) => {
  const selectedUserId = useAtomValue(selectedUserIdAtom);
  const userId = requestedUserId ?? selectedUserId;
  return useQuery<StashItemResponse[]>({
    enabled: !!userId,
    queryKey: ["stash", userId],
    queryFn: async (): Promise<StashItemResponse[]> => {
      const response = await apiFetch(`${API_BASE_URL}/user/${userId}/stash`);
      if (!response.ok) {
        throw new Error("Failed to fetch stash data");
      }
      return response.json();
    },
    staleTime: Infinity,
  });
};

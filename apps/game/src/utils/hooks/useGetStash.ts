import { useQuery } from "@tanstack/react-query";
import type { StashItemData } from "@webgame/types";
import { useAtomValue } from "jotai";

import { selectedUserIdAtom } from "@/atoms/authAtom";

import { API_BASE_URL, apiFetch } from "../api";

export type StashItemResponse = StashItemData;

export const useGetStash = (requestedUserId?: string) => {
  const selectedUserId = useAtomValue(selectedUserIdAtom);
  const userId = requestedUserId ?? selectedUserId;
  return useQuery<StashItemResponse[]>({
    enabled: !!userId,
    queryKey: ["stash", userId],
    queryFn: async ({ signal }): Promise<StashItemResponse[]> => {
      const response = await apiFetch(`${API_BASE_URL}/user/${userId}/stash`, {
        signal,
      });
      if (!response.ok) {
        throw new Error("Failed to fetch stash data");
      }
      return response.json();
    },
    staleTime: Infinity,
  });
};

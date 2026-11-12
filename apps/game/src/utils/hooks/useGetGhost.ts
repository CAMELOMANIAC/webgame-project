import { useQuery } from "@tanstack/react-query";
import type { GhostMatch } from "@webgame/types";
import { useAtomValue } from "jotai";

import { selectedUserIdAtom } from "@/atoms/authAtom";

import { API_BASE_URL, apiFetch } from "../api";
import { readApiResponse } from "../request";

export const useGetGhost = (nodeId: number, time: number) => {
  const userId = useAtomValue(selectedUserIdAtom);
  return useQuery<GhostMatch | null>({
    queryKey: ["ghost", userId, nodeId, time],
    enabled: !!userId,
    queryFn: async () => {
      const response = await apiFetch(
        `${API_BASE_URL}/ghost/match?nodeId=${nodeId}&time=${time}`,
      );
      if (response.status === 404) return null;
      return readApiResponse<GhostMatch>(response);
    },
  });
};

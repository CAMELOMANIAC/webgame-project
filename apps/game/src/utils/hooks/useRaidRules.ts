import { useQuery } from "@tanstack/react-query";

import { API_BASE_URL,apiFetch } from "../api";
import { readApiResponse } from "../request";

interface RaidRules {
  extractionNodeIds: number[];
  startNodeId: number;
}

export function useRaidRules() {
  return useQuery({
    queryKey: ["raid-rules"],
    queryFn: async () =>
      readApiResponse<RaidRules>(await apiFetch(`${API_BASE_URL}/raid/rules`)),
    staleTime: Infinity,
  });
}

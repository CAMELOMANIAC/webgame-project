import { useMutation } from "@tanstack/react-query";
import type { BattleLog } from "@webgame/types";

import { API_BASE_URL } from "../api";

interface NavigateRaidParams {
  characterId: string;
  path: number[];
}

export interface NavigateRaidResponse {
  encounterTriggered: boolean;
  stopNodeId?: number;
  battleLog?: BattleLog;
}

export const useNavigateRaid = () => {
  return useMutation<NavigateRaidResponse, Error, NavigateRaidParams>({
    mutationFn: async ({ characterId, path }) => {
      const response = await fetch(`${API_BASE_URL}/character/${characterId}/raid/navigate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ path }),
      });

      if (!response.ok) {
        throw new Error("Failed to start navigation on server");
      }

      return response.json();
    },
  });
};

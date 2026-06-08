import { useMutation } from "@tanstack/react-query";
import type { BattleLog } from "@webgame/types";

import { API_BASE_URL } from "../api";

interface ArriveRaidNodeParams {
  characterId: string;
  nodeId: number;
}

export interface ArriveRaidNodeResponse {
  combatTriggered: boolean;
  battleLog?: BattleLog;
}

/**
 * 플레이어가 특정 노드에 도착했을 때 서버에 인카운터(전투 여부) 결정을 위임하는 훅
 */
export const useArriveRaidNode = () => {
  return useMutation<ArriveRaidNodeResponse, Error, ArriveRaidNodeParams>({
    mutationFn: async ({ characterId, nodeId }) => {
      const response = await fetch(`${API_BASE_URL}/character/${characterId}/raid/arrive`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nodeId }),
      });

      if (!response.ok) {
        throw new Error("Failed to process node arrival on server");
      }

      return response.json();
    },
  });
};

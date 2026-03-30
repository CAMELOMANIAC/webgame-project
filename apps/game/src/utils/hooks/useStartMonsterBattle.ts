import { useMutation } from "@tanstack/react-query";
import type { BattleLog } from "@webgame/types";

const API_BASE_URL = "http://localhost:3001";

interface StartMonsterBattleParams {
  characterId: string;
  level: number;
}

/**
 * 서버에 몬스터와의 전투 시뮬레이션 생성을 요청하는 훅
 * (Simulation Authority 보장)
 */
export const useStartMonsterBattle = () => {
  return useMutation<BattleLog, Error, StartMonsterBattleParams>({
    mutationFn: async ({ characterId, level }) => {
      const response = await fetch(`${API_BASE_URL}/battle/monster`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ characterId, level }),
      });

      if (!response.ok) {
        throw new Error("Failed to start monster battle on server");
      }

      return response.json();
    },
  });
};

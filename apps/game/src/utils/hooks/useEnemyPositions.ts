import { useMemo } from "react";
import type { BattleLog } from "@/utils/hooks/useBattleData";

export function useEnemyPositions(battleLog: BattleLog | undefined, characterNickname: string | undefined) {
  return useMemo(() => {
    if (!battleLog) return new Map();
    const map = new Map();
    const centerX = 50; 
    const centerY = 50;
    const maxRadius = 40; 
    const rotationOffset = Math.random() * 2 * Math.PI; 

    battleLog.initialState.players
      .filter((p) => p.teamId !== battleLog.initialState.players.find((player) => player.id === characterNickname)?.teamId)
      .forEach((enemy, index, arr) => {
        const angle = (index / arr.length) * 2 * Math.PI + rotationOffset;
        const radius = 20 + Math.random() * (maxRadius - 20);
        map.set(enemy.id, {
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
        });
      });
    return map;
  }, [battleLog, characterNickname]);
}

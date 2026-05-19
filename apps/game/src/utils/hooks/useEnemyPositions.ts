import type { BattleLog, PlayerState } from "@webgame/types";
import { useMemo } from "react";

export function useEnemyPositions(battleLog: BattleLog | null | undefined, characterNickname: string | undefined) {
  return useMemo(() => {
    if (!battleLog) return new Map<string, { x: number; y: number }>();
    const map = new Map<string, { x: number; y: number }>();
    const centerX = 50; 
    const centerY = 55; // 중심을 약간 아래로 이동
    const maxRadius = 35; // 반경을 줄여 영역 확보
    const rotationOffset = Math.random() * 2 * Math.PI; 

    battleLog.initialState.players
      .filter((p: PlayerState) => p.teamId !== battleLog.initialState.players.find((player: PlayerState) => player.id === characterNickname)?.teamId)
      .forEach((enemy: PlayerState, index: number, arr: PlayerState[]) => {
        const angle = (index / arr.length) * 2 * Math.PI + rotationOffset;
        const radius = 15 + Math.random() * (maxRadius - 15);
        
        // Y축 위치 계산 시 상단(UI 영역)을 피하도록 제약
        let y = centerY + Math.sin(angle) * radius;
        if (y < 25) y = 25; // 상단 25% 이상으로 올라가지 않게 제한
        if (y > 90) y = 90; // 하단 영역 제한

        map.set(enemy.id, {
          x: centerX + Math.cos(angle) * radius,
          y: y,
        });
      });
    return map;
  }, [battleLog, characterNickname]);
}

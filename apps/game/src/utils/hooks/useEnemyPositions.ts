import type { BattleLog } from "@webgame/types";
import { useMemo } from "react";

import type { EnemyPlacement } from "@/utils/battleLayout";

// 거리 비율 범위 (0 = 플레이어 최소 거리, 1 = 안전 영역 경계)
const MIN_T = 0.55;
const MAX_T = 1;
// 원형 균등 분할 각도에서 벗어나는 정도 (분할 각도 대비 비율)
const ANGLE_JITTER = 0.5;

// 적 배치를 해상도 독립적인 극좌표로 생성한다.
// 실제 픽셀 좌표는 BattleCanvas가 측정한 안전 영역에 맞춰 변환한다.
export function useEnemyPositions(battleLog: BattleLog | null | undefined, characterId: string | undefined) {
  const initialPlayers = battleLog?.initialState.players;
  return useMemo(() => {
    const map = new Map<string, EnemyPlacement>();
    if (!initialPlayers) return map;

    const rotationOffset = Math.random() * 2 * Math.PI;
    const playerTeam = initialPlayers.find((player) => player.id === characterId)?.teamId;
    const enemies = initialPlayers.filter((player) => player.teamId !== playerTeam);
    if (enemies.length === 0) return map;

    const slice = (2 * Math.PI) / enemies.length;
    enemies.forEach((enemy, index) => {
      const jitter = enemies.length > 1 ? (Math.random() - 0.5) * slice * ANGLE_JITTER : 0;
      map.set(enemy.id, {
        angle: index * slice + rotationOffset + jitter,
        t: MIN_T + Math.random() * (MAX_T - MIN_T),
      });
    });

    return map;
  }, [initialPlayers, characterId]);
}

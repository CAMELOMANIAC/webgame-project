import type { BattleLog, PlayerState } from "@webgame/types";
import { useMemo } from "react";

// 플레이어 중심 좌표 (논리 좌표 기준 0~100)
const CENTER_X = 50;
const CENTER_Y = 55;

// 논리 좌표 기준 최소 거리
const MIN_RADIUS = 28;       // 플레이어 중심 ~ 적 최소 반경
const MAX_RADIUS = 38;       // 플레이어 중심 ~ 적 최대 반경
const MIN_CENTER_DIST = 26;  // 적이 중심으로부터 보장받아야 할 최소 거리
const MIN_ENEMY_DIST = 18;   // 적 마커끼리의 최소 이격 거리

// 자연스러운 뭉침 배치감을 위해 반발 반복 횟수를 제한
// (횟수가 낮을수록 완전히 분산되지 않고 어느 정도 뭉쳐있는 배치 유지)
const SEPARATION_ITERATIONS = 3;

export function useEnemyPositions(battleLog: BattleLog | null | undefined, characterId: string | undefined) {
  return useMemo(() => {
    if (!battleLog) return new Map<string, { x: number; y: number }>();
    const map = new Map<string, { x: number; y: number }>();

    const rotationOffset = Math.random() * 2 * Math.PI;
    const enemies = battleLog.initialState.players.filter(
      (p: PlayerState) =>
        p.teamId !== battleLog.initialState.players.find((player: PlayerState) => player.id === characterId)?.teamId,
    );

    if (enemies.length === 0) return map;

    // Step 1: 초기 위치 생성 (원형 분산 + 랜덤 반경)
    const positions = enemies.map((enemy: PlayerState, index: number) => {
      const angle = (index / enemies.length) * 2 * Math.PI + rotationOffset;
      const radius = MIN_RADIUS + Math.random() * (MAX_RADIUS - MIN_RADIUS);
      return {
        id: enemy.id,
        x: CENTER_X + Math.cos(angle) * radius,
        y: CENTER_Y + Math.sin(angle) * radius,
      };
    });

    // Step 2: 플레이어 중심으로부터 최소 거리 보장
    // (생성된 좌표가 우연히 중심에 너무 가까운 경우 방어)
    for (const pos of positions) {
      const dx = pos.x - CENTER_X;
      const dy = pos.y - CENTER_Y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0 && dist < MIN_CENTER_DIST) {
        const scale = MIN_CENTER_DIST / dist;
        pos.x = CENTER_X + dx * scale;
        pos.y = CENTER_Y + dy * scale;
      }
    }

    // Step 3: 적끼리 이격 보장 (반발력 시뮬레이션)
    // SEPARATION_ITERATIONS를 낮게 유지 → 완전 균등 분산이 아닌 자연스러운 뭉침 배치
    for (let iter = 0; iter < SEPARATION_ITERATIONS; iter++) {
      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const dx = positions[j].x - positions[i].x;
          const dy = positions[j].y - positions[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > 0 && dist < MIN_ENEMY_DIST) {
            // 두 마커를 서로 반대 방향으로 절반씩 밀어냄
            const push = (MIN_ENEMY_DIST - dist) / 2;
            const nx = dx / dist;
            const ny = dy / dist;
            positions[i].x -= nx * push;
            positions[i].y -= ny * push;
            positions[j].x += nx * push;
            positions[j].y += ny * push;
          }
        }
      }
    }

    // Step 4: 최종 좌표 클램핑 (UI 안전 영역 및 뷰 범위 내로 제한)
    for (const pos of positions) {
      pos.x = Math.max(10, Math.min(90, pos.x));
      pos.y = Math.max(20, Math.min(88, pos.y));
    }

    // Step 5: Map에 등록
    for (const pos of positions) {
      map.set(pos.id, { x: pos.x, y: pos.y });
    }

    return map;
  }, [battleLog, characterId]);
}

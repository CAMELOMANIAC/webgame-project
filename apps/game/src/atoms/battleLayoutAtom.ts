import { atom } from "jotai";

// 전투 캔버스 위를 덮는 HUD 요소
// - top: 해당 요소의 하단까지 가려짐 (예: 전투 로그)
// - bottom: 해당 요소의 상단부터 가려짐 (예: 하단 상태/장비 패널)
export type BattleOccluderEdge = "top" | "bottom";

export interface BattleOccluder {
  element: HTMLElement;
  edge: BattleOccluderEdge;
}

export const battleOccludersAtom = atom<BattleOccluder[]>([]);

// 전투 중 플레이어 마커 좌표 (필드 배경 기준 px)
// BattleCanvas가 측정한 안전 영역 중앙이며, 지도 카메라도 이 지점에 플레이어를 맞춘다.
export const battleCenterAtom = atom<{ x: number; y: number } | null>(null);

// 전투 캔버스에서 직접 클릭해 고정 선택한 유닛(적/소환물) ID (null이면 현재 턴 행동 유닛 자동 포커스)
export const selectedCombatantIdAtom = atom<string | null>(null);

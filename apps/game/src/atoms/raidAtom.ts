import { atom } from "jotai";

// 현재 전투(전투 애니메이션 재생) 중인지 여부
export const isCombatAtom = atom<boolean>(false);

// 플레이어의 현재 노드 ID
export const currentNodeIdAtom = atom<number>(0);

// 플레이어의 목적지 노드 ID
export const targetNodeIdAtom = atom<number | null>(null);

// 플레이어가 현재 이동 중인지 여부
export const isNavigatingAtom = atom<boolean>(false);

// A* 계산된 경로 배열
export const shortestPathAtom = atom<number[]>([]);

// 플레이어의 실시간 픽셀 좌표 (Konva 렌더링용)
export const playerCoordsAtom = atom<{ x: number; y: number } | null>(null);

// 카메라 추적 여부
export const followPlayerAtom = atom<boolean>(true);

// 플레이어의 현재 방향 회전 각도 (도 단위, 0도 = 북쪽)
export const playerRotationAtom = atom<number>(0);

// 인벤토리 변경 사항이 서버에 동기화되지 않고 남아있는지 여부
export const isInventoryDirtyAtom = atom<boolean>(false);

// 현재 드래그 중인 아이템 ID (DragOverlay와 SlotManager 간 layoutId 충돌 방지용)
export const activeDragIdAtom = atom<string | number | null>(null);


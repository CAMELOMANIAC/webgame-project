import { atom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";

// 현재 전투(전투 애니메이션 재생) 중인지 여부
export const isCombatAtom = atom<boolean>(false);

export type RaidEndStatus = "EXTRACTED" | "DEAD";
type UnacknowledgedRaidResults = Partial<Record<string, RaidEndStatus>>;

export const unacknowledgedRaidResultsAtom =
  atomWithStorage<UnacknowledgedRaidResults>(
    "webgame.unacknowledgedRaidResults",
    {},
    createJSONStorage<UnacknowledgedRaidResults>(() => sessionStorage),
    { getOnInit: true },
  );

// 플레이어의 현재 노드 ID
export const currentNodeIdAtom = atom<number>(0);

// 플레이어의 목적지 노드 ID
export const targetNodeIdAtom = atom<number | null>(null);
export const requestedNodeIdAtom = atom<number | null>(null);

// 플레이어가 현재 이동 중인지 여부
export const isNavigatingAtom = atom<boolean>(false);

// A* 계산된 경로 배열
export const shortestPathAtom = atom<number[]>([]);

// 플레이어의 실시간 픽셀 좌표 (Konva 렌더링용)
export const playerCoordsAtom = atom<{ x: number; y: number } | null>(null);

// 카메라 추적 여부
export const followPlayerAtom = atom<boolean>(true);

// 캐릭터 HUD 클릭 시 카메라를 플레이어 위치로 이동시키는 트리거 카운터
export const focusPlayerTriggerAtom = atom<number>(0);

// 플레이어의 현재 방향 회전 각도 (도 단위, 0도 = 북쪽)
export const playerRotationAtom = atom<number>(0);

// 인벤토리 변경 사항이 서버에 동기화되지 않고 남아있는지 여부
export const isInventoryDirtyAtom = atom<boolean>(false);

// 현재 드래그 중인 아이템 ID (DragOverlay와 SlotManager 간 layoutId 충돌 방지용)
export const activeDragIdAtom = atom<string | number | null>(null);

// 슬롯 간 이동 애니메이션이 진행 중인 아이템 ID 목록 (z-index 및 overflow 클리핑 해제용)
export const animatingSlotIdsAtom = atom<string[]>([]);


import { getDefaultStore } from "jotai";

import {
  currentNodeIdAtom,
  playerCoordsAtom,
  raidOutroAtom,
} from "@/atoms/raidAtom";

import mapData from "../../../../packages/types/src/assets/map_graph.json";

/** 탐사 종료 시 기존 필드 HUD가 서서히 사라지는 시간(초) */
export const OUTRO_HUD_FADE_SECONDS = 0.45;
/** 종료 지점을 고정해 보여 준 뒤 줌아웃을 시작하기까지의 시간(초) */
export const OUTRO_HOLD_SECONDS = 0.5;
/** 지도 카메라 줌아웃 시간(초) */
export const OUTRO_ZOOM_SECONDS = 2.4;

let fadeTimer: ReturnType<typeof setTimeout> | null = null;

/** 탐사 종료(탈출/사망) 직전 플레이어 위치를 기록해 종료 연출을 시작한다 */
export function beginRaidOutro() {
  const store = getDefaultStore();
  const coords = store.get(playerCoordsAtom);
  const node = mapData.nodes[store.get(currentNodeIdAtom)];
  const focus = coords ?? (node ? { x: node.x, y: node.y } : null);
  if (!focus) return;

  if (fadeTimer) {
    clearTimeout(fadeTimer);
    fadeTimer = null;
  }

  store.set(raidOutroAtom, { focus, phase: "fadeHud" });
  fadeTimer = setTimeout(() => {
    fadeTimer = null;
    const current = store.get(raidOutroAtom);
    if (current && current.phase === "fadeHud") {
      store.set(raidOutroAtom, { ...current, phase: "hold" });
    }
  }, OUTRO_HUD_FADE_SECONDS * 1000);
}

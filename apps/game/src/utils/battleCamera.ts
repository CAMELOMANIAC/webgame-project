import type { BattleEvent } from "@webgame/types";

import type { AttackEffectKind } from "@/utils/attackEffect";

export interface Point {
  x: number;
  y: number;
}

export interface CameraFocus extends Point {
  zoom: number;
}

export interface WorldTransform {
  scale: number;
  x: number;
  y: number;
}

export const IDENTITY_TRANSFORM: WorldTransform = { scale: 1, x: 0, y: 0 };

const ZOOM_PAIR = 1.15;
const ZOOM_SOLO = 1.12;
const ZOOM_EMPHASIS = 1.25;
/** 두 점 거리가 화면 대각선의 이 비율을 넘으면 줌을 줄여 한쪽이 잘리지 않게 한다 */
const FAR_DISTANCE_RATIO = 0.7;

interface ResolveContext {
  resolvePoint: (id: string) => Point | null;
  viewport: { width: number; height: number };
  /** ATTACK 이벤트의 연출 종류 */
  getAttackKind: (event: BattleEvent & { type: "ATTACK" }) => AttackEffectKind;
}

const midpoint = (a: Point, b: Point): Point => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

function pairFocus(
  a: Point | null,
  b: Point | null,
  zoom: number,
  viewport: { width: number; height: number },
): CameraFocus | null {
  if (!a || !b) return null;
  const mid = midpoint(a, b);
  const diagonal = Math.hypot(viewport.width, viewport.height);
  const distance = Math.hypot(a.x - b.x, a.y - b.y);
  const adjusted =
    diagonal > 0 && distance > diagonal * FAR_DISTANCE_RATIO
      ? 1 + (zoom - 1) * 0.5
      : zoom;
  return { ...mid, zoom: adjusted };
}

function soloFocus(point: Point | null, zoom: number): CameraFocus | null {
  return point ? { ...point, zoom } : null;
}

/** 아이템 사용(발동) 이벤트를 카메라 포커스로 변환한다. 해당하지 않으면 null */
export function resolveCameraFocus(
  event: BattleEvent,
  { resolvePoint, viewport, getAttackKind }: ResolveContext,
): CameraFocus | null {
  switch (event.type) {
    case "ATTACK": {
      const zoom = getAttackKind(event) === "SNIPE" ? ZOOM_EMPHASIS : ZOOM_PAIR;
      return pairFocus(
        resolvePoint(event.actorId),
        resolvePoint(event.targetId),
        zoom,
        viewport,
      );
    }
    case "SUMMON":
      return pairFocus(
        resolvePoint(event.summonerId),
        resolvePoint(event.combatant.id),
        ZOOM_PAIR,
        viewport,
      );
    case "SYNERGY":
      return soloFocus(resolvePoint(event.actorId), ZOOM_PAIR);
    case "HEAL":
    case "SHIELD":
      return soloFocus(resolvePoint(event.targetId), ZOOM_SOLO);
    default:
      return null;
  }
}

/** 치명타 순간에 직전 포커스를 더 강하게 확대한 포커스 */
export const emphasizeFocus = (focus: CameraFocus): CameraFocus => ({
  ...focus,
  zoom: Math.max(focus.zoom, ZOOM_EMPHASIS),
});

/**
 * 포커스 점이 화면상의 screenCenter에 오도록 하는 world 변환을 계산한다.
 * 확대된 world가 화면 밖 빈 영역을 드러내지 않도록 위치를 제한한다.
 */
export function computeWorldTransform(
  focus: CameraFocus,
  screenCenter: Point,
  viewport: { width: number; height: number },
): WorldTransform {
  const { zoom } = focus;
  const minX = viewport.width - viewport.width * zoom;
  const minY = viewport.height - viewport.height * zoom;
  return {
    scale: zoom,
    x: Math.min(0, Math.max(minX, screenCenter.x - focus.x * zoom)),
    y: Math.min(0, Math.max(minY, screenCenter.y - focus.y * zoom)),
  };
}

// 전투 캔버스 배치 계산
// - 적 위치는 해상도 독립적인 극좌표(각도 + 거리 비율)로 보관하고,
//   렌더링 직전에 실제 UI를 피한 안전 영역 기준 픽셀 좌표로 변환한다.

export interface EnemyPlacement {
  /** 플레이어 기준 방향 (라디안) */
  angle: number;
  /** 최소 거리(0) ~ 안전 영역 경계(1) 사이의 거리 비율 */
  t: number;
}

export interface BattlePoint {
  x: number;
  y: number;
}

export interface BattleRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface BattleLayout {
  /** 플레이어 마커 좌표 (안전 영역 중앙) */
  center: BattlePoint;
  /** 적 마커 중심이 위치할 수 있는 영역 (라벨 크기만큼 안쪽으로 축소) */
  enemyBounds: BattleRect;
}

// 적 마커(점 + 하단 이름표)가 안전 영역 밖으로 삐져나오지 않도록 확보하는 여백(px)
const ENEMY_EDGE_INSET = { top: 12, bottom: 40, horizontal: 44 } as const;
// 플레이어 마커와 적 마커 사이 최소 거리(px)
const MIN_PLAYER_DIST_PX = 110;
// 적 마커끼리 최소 이격 거리(px)
const MIN_ENEMY_DIST_PX = 56;
// 자연스러운 뭉침 배치를 위해 반발 반복 횟수를 제한
const SEPARATION_ITERATIONS = 3;
// 안전 영역이 이보다 낮으면 측정값을 신뢰하지 않고 캔버스 전체를 사용
const MIN_SAFE_HEIGHT_PX = 120;

export function computeBattleLayout(
  width: number,
  height: number,
  safeArea: BattleRect | null,
): BattleLayout {
  const area =
    safeArea && safeArea.bottom - safeArea.top >= MIN_SAFE_HEIGHT_PX
      ? safeArea
      : { left: 0, top: 0, right: width, bottom: height };

  const center = {
    x: (area.left + area.right) / 2,
    y: (area.top + area.bottom) / 2,
  };

  const left = area.left + ENEMY_EDGE_INSET.horizontal;
  const right = area.right - ENEMY_EDGE_INSET.horizontal;
  const top = area.top + ENEMY_EDGE_INSET.top;
  const bottom = area.bottom - ENEMY_EDGE_INSET.bottom;

  return {
    center,
    enemyBounds: {
      left: Math.min(left, center.x),
      right: Math.max(right, center.x),
      top: Math.min(top, center.y),
      bottom: Math.max(bottom, center.y),
    },
  };
}

// 중심에서 angle 방향으로 뻗은 선이 영역 경계와 만나는 거리
function distanceToBounds(center: BattlePoint, angle: number, bounds: BattleRect) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  let distance = Number.POSITIVE_INFINITY;

  if (cos > 1e-6) distance = Math.min(distance, (bounds.right - center.x) / cos);
  else if (cos < -1e-6) distance = Math.min(distance, (bounds.left - center.x) / cos);

  if (sin > 1e-6) distance = Math.min(distance, (bounds.bottom - center.y) / sin);
  else if (sin < -1e-6) distance = Math.min(distance, (bounds.top - center.y) / sin);

  return Number.isFinite(distance) ? Math.max(0, distance) : 0;
}

function radiusRange(layout: BattleLayout, angle: number) {
  const max = distanceToBounds(layout.center, angle, layout.enemyBounds);
  return { min: Math.min(MIN_PLAYER_DIST_PX, max), max };
}

function fromPolar(center: BattlePoint, angle: number, radius: number): BattlePoint {
  return {
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius,
  };
}

// 좌표를 [최소 거리, 안전 영역 경계] 범위 안으로 되돌림
function constrainPoint(point: BattlePoint, layout: BattleLayout): BattlePoint {
  const dx = point.x - layout.center.x;
  const dy = point.y - layout.center.y;
  const angle = dx === 0 && dy === 0 ? -Math.PI / 2 : Math.atan2(dy, dx);
  const { min, max } = radiusRange(layout, angle);
  const radius = Math.max(min, Math.min(max, Math.hypot(dx, dy)));
  return fromPolar(layout.center, angle, radius);
}

export function resolveEnemyPixelPositions(
  placements: Map<string, EnemyPlacement>,
  layout: BattleLayout,
): Map<string, BattlePoint> {
  const entries = [...placements.entries()].map(([id, placement]) => {
    const { min, max } = radiusRange(layout, placement.angle);
    const radius = min + placement.t * (max - min);
    return { id, ...fromPolar(layout.center, placement.angle, radius) };
  });

  for (let iter = 0; iter < SEPARATION_ITERATIONS; iter++) {
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const dx = entries[j].x - entries[i].x;
        const dy = entries[j].y - entries[i].y;
        const dist = Math.hypot(dx, dy);

        if (dist > 0 && dist < MIN_ENEMY_DIST_PX) {
          const push = (MIN_ENEMY_DIST_PX - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
          entries[i].x -= nx * push;
          entries[i].y -= ny * push;
          entries[j].x += nx * push;
          entries[j].y += ny * push;
        }
      }
    }

    for (const entry of entries) {
      const constrained = constrainPoint(entry, layout);
      entry.x = constrained.x;
      entry.y = constrained.y;
    }
  }

  return new Map(entries.map(({ id, x, y }) => [id, { x, y }]));
}

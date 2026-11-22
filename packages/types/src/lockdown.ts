import type { MapBuilding, MapPoint } from "./world";

/** 맵 정중앙 단일 탈출구 노드 ID (map_graph.json nodes[169]) */
export const CENTRAL_EXTRACTION_NODE_ID = 169;

/** 맵 정중앙 탈출구 좌표 (nodes[169]) */
export const CENTRAL_EXTRACTION_POS: MapPoint = {
  x: 782,
  y: 303,
};

/** 중앙 탈출구로부터 맵 최외곽 노드까지의 기준 최대 거리 */
export const MAX_MAP_RADIUS = 936;

/**
 * 중앙 기준 정규화 거리(0~1)가 이 값 이하인 조합 설비에서만 T2 업그레이드가 가능합니다.
 * 외곽 설비(dNorm > 0.50)는 T1 전용으로 동작합니다.
 */
export const CENTRAL_T2_CRAFT_RADIUS_NORM = 0.5;

/** 중앙 탈출구 인접 안전 반경(이 안쪽 건물은 봉쇄되지 않음) */
export const LOCKDOWN_SAFE_CORE_NORM = 0.12;

/** 조합 설비 건물에 부여되는 추가 봉쇄 유예 시간(분) */
export const CRAFT_BUILDING_LOCKDOWN_GRACE_MINUTES = 60;

/** 곧 봉쇄될 건물을 캔버스에서 점멸 경고로 표시하는 잔여 시간(분) */
export const LOCKDOWN_WARNING_MINUTES = 60;

/**
 * FNV-1a 32비트 해시로 건물 ID + 선택적 레이드 시드에 대해 [0, 1) 범위의 결정적 난수를 생성합니다.
 */
export function buildingLockdownHash(buildingId: number, seed = ""): number {
  const input = `${seed}:${buildingId}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) / 0x100000000;
}

export function getBuildingCenter(
  building: Pick<MapBuilding, "coordinates">,
): MapPoint {
  const coords = building.coordinates;
  if (!coords || coords.length === 0) {
    return CENTRAL_EXTRACTION_POS;
  }
  let sumX = 0;
  let sumY = 0;
  for (const pt of coords) {
    sumX += pt.x;
    sumY += pt.y;
  }
  return {
    x: sumX / coords.length,
    y: sumY / coords.length,
  };
}

export function getBuildingNormalizedDistance(
  building: Pick<MapBuilding, "coordinates">,
  centerPos: MapPoint = CENTRAL_EXTRACTION_POS,
): number {
  const center = getBuildingCenter(building);
  const dist = Math.hypot(center.x - centerPos.x, center.y - centerPos.y);
  return Math.max(0, Math.min(1, dist / MAX_MAP_RADIUS));
}

/**
 * 건물이 봉쇄(비활성화)되는 레이드 경과 시각(분)을 계산합니다.
 * - 45~60분 무렵부터 최외곽 일반 건물들이 점진적으로 봉쇄되기 시작해 240~300분 구간에 외곽 대부분이 닫힙니다.
 * - 조합 설비 건물(category 존재)은 외곽에 있더라도 일반 건물보다 60분 느리게 봉쇄됩니다.
 */
export function resolveBuildingLockdownMinute(
  building: Pick<MapBuilding, "id" | "coordinates" | "category">,
  seed = "",
): number {
  const dNorm = getBuildingNormalizedDistance(building);
  if (dNorm < LOCKDOWN_SAFE_CORE_NORM) {
    return Number.POSITIVE_INFINITY;
  }
  const jitter = buildingLockdownHash(building.id, seed);
  const baseMinute =
    45 + (1 - dNorm) * 210 + Math.pow(jitter, 0.8) * 90;
  const grace = building.category ? CRAFT_BUILDING_LOCKDOWN_GRACE_MINUTES : 0;
  return Math.round(baseMinute + grace);
}

export function isBuildingLockedDown(
  building: Pick<MapBuilding, "id" | "coordinates" | "category">,
  timeMinutes: number,
  seed = "",
): boolean {
  if (timeMinutes <= 0) return false;
  return timeMinutes >= resolveBuildingLockdownMinute(building, seed);
}

/**
 * 조합 설비 건물의 최대 허용 조합 티어를 반환합니다.
 * - 외곽 조합 설비(dNorm > 0.50): T1 전용
 * - 중앙/심층 조합 설비(dNorm <= 0.50): T1 + T2 모두 가능
 */
export function resolveBuildingMaxCraftTier(
  building: Pick<MapBuilding, "coordinates" | "category">,
): 1 | 2 {
  return getBuildingNormalizedDistance(building) <= CENTRAL_T2_CRAFT_RADIUS_NORM
    ? 2
    : 1;
}

/**
 * Step 2: 1D TypedArray 이진 탐색 + 2차 교집합 (Intersection) 연산 유틸리티
 */

export interface IndexedItem {
  id: number;
  x: number;
  y: number;
}

export interface OneDimCullingIndex<T extends IndexedItem> {
  sortedX: Float64Array;
  itemsByX: T[];
  sortedY: Float64Array;
  itemsByY: T[];
}

/**
 * 배열 데이터를 X축 및 Y축 기준으로 각각 정렬하여 Float64Array 및 참조 배열 생성
 */
export function createOneDimIndex<T extends IndexedItem>(items: T[]): OneDimCullingIndex<T> {
  const itemsX = [...items].sort((a, b) => a.x - b.x);
  const sortedX = new Float64Array(itemsX.map((it) => it.x));

  const itemsY = [...items].sort((a, b) => a.y - b.y);
  const sortedY = new Float64Array(itemsY.map((it) => it.y));

  return {
    sortedX,
    itemsByX: itemsX,
    sortedY,
    itemsByY: itemsY,
  };
}

/**
 * 정렬된 Float64Array에서 minVal ~ maxVal 구간의 시작 및 끝 인덱스를 이진 탐색 O(log N)
 */
export function binarySearchRangeIndex(arr: Float64Array, minVal: number, maxVal: number): [number, number] {
  let low = 0;
  let high = arr.length - 1;
  let startIndex = arr.length;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (arr[mid] >= minVal) {
      startIndex = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  low = 0;
  high = arr.length - 1;
  let endIndex = -1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (arr[mid] <= maxVal) {
      endIndex = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return [startIndex, endIndex];
}

/**
 * Step 2 컬링: X축/Y축 각각 1D 이진탐색으로 후보군을 자른 후 2차 교집합(Intersection) 구하기
 */
export function performOneDimIntersectionCulling<T extends IndexedItem>(
  index: OneDimCullingIndex<T>,
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
): {
  results: T[];
  binarySearchTimeMs: number;
  intersectionTimeMs: number;
  xCandidateCount: number;
  yCandidateCount: number;
} {
  const t0 = performance.now();

  // 1. X축 1D 이진 탐색 범위 추출 (O(log N))
  const [startX, endX] = binarySearchRangeIndex(index.sortedX, bounds.minX, bounds.maxX);
  const xCandidates: T[] = [];
  if (startX <= endX && startX < index.itemsByX.length && endX >= 0) {
    for (let i = startX; i <= endX; i++) {
      xCandidates.push(index.itemsByX[i]);
    }
  }

  // 2. Y축 1D 이진 탐색 범위 추출 (O(log N))
  const [startY, endY] = binarySearchRangeIndex(index.sortedY, bounds.minY, bounds.maxY);
  const yCandidates: T[] = [];
  if (startY <= endY && startY < index.itemsByY.length && endY >= 0) {
    for (let i = startY; i <= endY; i++) {
      yCandidates.push(index.itemsByY[i]);
    }
  }

  const t1 = performance.now();
  const binarySearchTimeMs = t1 - t0;

  // 3. 2차 교집합 (Intersection) 연산 - 병목 발생 구역!
  const ySet = new Set<number>(yCandidates.map((item) => item.id));
  const results: T[] = [];

  for (let i = 0; i < xCandidates.length; i++) {
    const item = xCandidates[i];
    if (ySet.has(item.id)) {
      results.push(item);
    }
  }

  const t2 = performance.now();
  const intersectionTimeMs = t2 - t1;

  return {
    results,
    binarySearchTimeMs,
    intersectionTimeMs,
    xCandidateCount: xCandidates.length,
    yCandidateCount: yCandidates.length,
  };
}

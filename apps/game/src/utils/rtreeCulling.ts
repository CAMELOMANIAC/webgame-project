import RBush from "rbush";

/**
 * Step 3: 2D R-tree (rbush) + STR Bulk-loading 공간 인덱싱 유틸리티
 */

export interface RTreeBBoxItem<T> {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  id: number;
  item: T;
}

/**
 * STR (Sort-Tile-Recursive) Bulk-loading 알고리즘을 사용하여 단 1회 만에 R-tree 2차원 인덱스 구축
 */
export function createRTreeIndex<T extends { id: number }>(
  items: T[],
  getBBox: (item: T) => { minX: number; minY: number; maxX: number; maxY: number }
): {
  tree: RBush<RTreeBBoxItem<T>>;
  buildTimeMs: number;
} {
  const t0 = performance.now();
  const tree = new RBush<RTreeBBoxItem<T>>();

  const bboxItems: RTreeBBoxItem<T>[] = items.map((item) => {
    const box = getBBox(item);
    return {
      ...box,
      id: item.id,
      item,
    };
  });

  // STR Bulk-loading (단 1회 O(N log N) 초기 단일 로딩)
  tree.load(bboxItems);

  const t1 = performance.now();
  return {
    tree,
    buildTimeMs: t1 - t0,
  };
}

/**
 * 2D 뷰포트 바운딩 박스로 O(log N) 2차원 공간 Pruning 탐색
 */
export function searchRTreeIndex<T>(
  tree: RBush<RTreeBBoxItem<T>>,
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
): {
  results: T[];
  searchTimeMs: number;
  foundCount: number;
} {
  const t0 = performance.now();
  const found = tree.search(bounds);
  const t1 = performance.now();

  return {
    results: found.map((f: RTreeBBoxItem<T>) => f.item),
    searchTimeMs: t1 - t0,
    foundCount: found.length,
  };
}

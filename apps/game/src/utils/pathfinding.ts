import mapData from "../assets/map_graph.json";

interface Node {
  x: number;
  y: number;
}

interface Edge {
  source: number;
  target: number;
  type: "minor" | "major" | "main";
}

const nodes = mapData.nodes as Node[];
const edges = mapData.edges as unknown as Edge[];

interface Neighbor {
  id: number;
  weight: number;
}

// 1. 인접 리스트를 캐싱 (모듈 초기화 시 1회 수행)
const adjacencyList = new Map<number, Neighbor[]>();

// 유클리드 거리 계산
function getDistance(n1: Node, n2: Node): number {
  return Math.sqrt((n1.x - n2.x) ** 2 + (n1.y - n2.y) ** 2);
}

// 도로 타입에 따른 가중치 배율 (대로변 선호)
const ROAD_MULTIPLIER = {
  main: 1.0,
  major: 1.2,
  minor: 1.5,
};

// 인접 리스트 생성
edges.forEach((edge) => {
  const u = edge.source;
  const v = edge.target;
  const nodeU = nodes[u];
  const nodeV = nodes[v];

  if (!nodeU || !nodeV) return;

  const baseDist = getDistance(nodeU, nodeV);
  const weight = baseDist * (ROAD_MULTIPLIER[edge.type] || 1.0);

  // 양방향 그래프 처리
  if (!adjacencyList.has(u)) adjacencyList.set(u, []);
  if (!adjacencyList.has(v)) adjacencyList.set(v, []);

  adjacencyList.get(u)!.push({ id: v, weight });
  adjacencyList.get(v)!.push({ id: u, weight });
});

/**
 * A* 알고리즘을 사용하여 최단 경로를 구합니다.
 * @param startId 시작 노드 인덱스
 * @param targetId 목적지 노드 인덱스
 * @returns 경로 노드 인덱스 배열 (경로가 없을 경우 빈 배열)
 */
export function findShortestPath(startId: number, targetId: number): number[] {
  if (startId === targetId) return [startId];
  if (startId < 0 || startId >= nodes.length || targetId < 0 || targetId >= nodes.length) {
    return [];
  }

  // gScore: 시작 노드로부터의 실제 이동 비용
  const gScore = new Map<number, number>();
  // fScore: gScore + heuristic(목적지까지의 남은 예상 비용)
  const fScore = new Map<number, number>();
  // cameFrom: 역추적을 위한 이전 노드 맵
  const cameFrom = new Map<number, number>();

  gScore.set(startId, 0);
  
  const startNode = nodes[startId]!;
  const targetNode = nodes[targetId]!;
  fScore.set(startId, getDistance(startNode, targetNode));

  // openSet: 탐색 대기 중인 노드들
  const openSet = new Set<number>([startId]);

  while (openSet.size > 0) {
    // fScore가 가장 낮은 노드를 openSet에서 선택
    let currentId = -1;
    let minFScore = Infinity;
    
    openSet.forEach((id) => {
      const score = fScore.get(id) ?? Infinity;
      if (score < minFScore) {
        minFScore = score;
        currentId = id;
      }
    });

    if (currentId === -1 || currentId === targetId) {
      break;
    }

    openSet.delete(currentId);

    const neighbors = adjacencyList.get(currentId) || [];
    const currentGScore = gScore.get(currentId) ?? Infinity;

    for (const neighbor of neighbors) {
      const tentativeGScore = currentGScore + neighbor.weight;
      const neighborGScore = gScore.get(neighbor.id) ?? Infinity;

      if (tentativeGScore < neighborGScore) {
        cameFrom.set(neighbor.id, currentId);
        gScore.set(neighbor.id, tentativeGScore);
        
        const neighborNode = nodes[neighbor.id]!;
        const hScore = getDistance(neighborNode, targetNode);
        fScore.set(neighbor.id, tentativeGScore + hScore);

        openSet.add(neighbor.id);
      }
    }
  }

  // targetId가 도달 불가능할 때 처리
  if (!cameFrom.has(targetId)) {
    return [];
  }

  // 경로 역추적 복원
  const path: number[] = [];
  let curr = targetId;
  while (curr !== startId) {
    path.push(curr);
    const prev = cameFrom.get(curr);
    if (prev === undefined) break;
    curr = prev;
  }
  path.push(startId);
  return path.reverse();
}

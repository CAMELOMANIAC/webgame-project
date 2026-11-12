import type { EnemyNoiseSignal } from "@webgame/types";
import mapData from "../../../../packages/types/src/assets/map_graph.json";

const cellSize = 128;
const hearingDistance = 135;
const radius = Math.ceil(Math.hypot(cellSize / 2, cellSize / 2));

export function findEnemyNoiseSignals(
  playerNodeId: number,
  ghostNodeIds: Iterable<string>,
): EnemyNoiseSignal[] {
  const player = mapData.nodes[playerNodeId];
  if (!player) return [];

  const areas = new Map<string, EnemyNoiseSignal>();
  for (const nodeId of ghostNodeIds) {
    const node = mapData.nodes[Number(nodeId)];
    if (!node) continue;

    const x = (Math.floor(node.x / cellSize) + 0.5) * cellSize;
    const y = (Math.floor(node.y / cellSize) + 0.5) * cellSize;
    // 감지 범위는 기존과 같이 구역 중심을 기준으로 한다.
    if (Math.hypot(x - player.x, y - player.y) <= hearingDistance)
      areas.set(`${x},${y}`, { x, y, radius });
  }
  return [...areas.values()].sort((a, b) => a.x - b.x || a.y - b.y);
}

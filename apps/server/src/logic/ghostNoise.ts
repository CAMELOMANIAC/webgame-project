import type { EnemyNoiseSignal } from "@webgame/types";
import mapData from "../../../../packages/types/src/assets/map_graph.json";

const cellSize = 48;
const hearingDistance = 140;
const radius = Math.ceil(Math.hypot(cellSize / 2, cellSize / 2));

const broadCellSize = 144;
const broadDistance = 420;
const broadRadius = Math.ceil(Math.hypot(broadCellSize / 2, broadCellSize / 2));

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

export function findBroadNoiseSignals(
  playerNodeId: number,
  ghostNodeIds: Iterable<string>,
): EnemyNoiseSignal[] {
  const player = mapData.nodes[playerNodeId];
  if (!player) return [];

  const areas = new Map<string, EnemyNoiseSignal>();
  for (const nodeId of ghostNodeIds) {
    const node = mapData.nodes[Number(nodeId)];
    if (!node) continue;

    const nearX = (Math.floor(node.x / cellSize) + 0.5) * cellSize;
    const nearY = (Math.floor(node.y / cellSize) + 0.5) * cellSize;
    if (Math.hypot(nearX - player.x, nearY - player.y) <= hearingDistance) {
      continue;
    }

    const x = (Math.floor(node.x / broadCellSize) + 0.5) * broadCellSize;
    const y = (Math.floor(node.y / broadCellSize) + 0.5) * broadCellSize;
    if (Math.hypot(x - player.x, y - player.y) <= broadDistance) {
      areas.set(`${x},${y}`, { x, y, radius: broadRadius, tier: "broad" });
    }
  }
  return [...areas.values()].sort((a, b) => a.x - b.x || a.y - b.y);
}

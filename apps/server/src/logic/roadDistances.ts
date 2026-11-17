import { applyExhaustedTravelMinutes, FATIGUE_RULES } from "@webgame/types";
import mapData from "../../../../packages/types/src/assets/map_graph.json";
import { gameRules } from "./rules";

const roads: { nodeId: number; length: number }[][] = mapData.nodes.map(
  () => [],
);

for (const { source, target } of mapData.edges) {
  const from = mapData.nodes[source]!;
  const to = mapData.nodes[target]!;
  const length = Math.hypot(from.x - to.x, from.y - to.y);
  roads[source]!.push({ nodeId: target, length });
  roads[target]!.push({ nodeId: source, length });
}

export function baseRoadTravelMinutes(from: number, to: number): number {
  const {
    stepUnitMinutes,
    maxEdgeMinutes,
    distancePerStepUnit,
    buildingMoveMinutes,
  } = gameRules.travel;
  if (from === to) return buildingMoveMinutes;
  const fromNode = mapData.nodes[from];
  const toNode = mapData.nodes[to];
  if (!fromNode || !toNode) return stepUnitMinutes;
  const length = Math.hypot(fromNode.x - toNode.x, fromNode.y - toNode.y);
  const rawMinutes = Math.round(length / distancePerStepUnit) * stepUnitMinutes;
  return Math.min(maxEdgeMinutes, Math.max(stepUnitMinutes, rawMinutes));
}

export function roadTravelMinutes(
  from: number,
  to: number,
  fatigue?: number,
): number {
  return applyExhaustedTravelMinutes(baseRoadTravelMinutes(from, to), fatigue);
}

export function roadFatigueCost(from: number, to: number): number {
  if (from === to) return FATIGUE_RULES.buildingMoveFatigueCost;
  const baseMinutes = baseRoadTravelMinutes(from, to);
  const steps = Math.max(
    1,
    Math.round(baseMinutes / gameRules.travel.stepUnitMinutes),
  );
  return steps * FATIGUE_RULES.fatiguePerStepUnit;
}

export function pathFatigueCost(path: number[]): number {
  let total = 0;
  for (let index = 1; index < path.length; index++) {
    total += roadFatigueCost(path[index - 1]!, path[index]!);
  }
  return total;
}

export function hasRoad(from: number, to: number): boolean {
  return roads[from]?.some((road) => road.nodeId === to) ?? false;
}

export function pathTravelVisits(
  path: number[],
  startTime = 0,
  fatigue?: number,
): { nodeId: number; time: number }[] {
  let current = startTime;
  const visits: { nodeId: number; time: number }[] = [];
  for (let index = 1; index < path.length; index++) {
    const from = path[index - 1]!;
    const to = path[index]!;
    current += roadTravelMinutes(from, to, fatigue);
    visits.push({ nodeId: to, time: current });
  }
  return visits;
}

export function pathTravelMinutes(path: number[], fatigue?: number): number {
  return pathTravelVisits(path, 0, fatigue).at(-1)?.time ?? 0;
}

export function nodesCloserThan(origin: number, minimumDistance: number) {
  const distances = new Map([[origin, 0]]);
  const pending = new Set([origin]);

  while (pending.size > 0) {
    let closest = origin;
    let distance = Infinity;
    for (const nodeId of pending) {
      const candidate = distances.get(nodeId)!;
      if (candidate < distance) {
        closest = nodeId;
        distance = candidate;
      }
    }
    pending.delete(closest);
    for (const neighbor of roads[closest] ?? []) {
      const total = distance + neighbor.length;
      if (
        total >= minimumDistance ||
        total >= (distances.get(neighbor.nodeId) ?? Infinity)
      )
        continue;
      distances.set(neighbor.nodeId, total);
      pending.add(neighbor.nodeId);
    }
  }

  return [...distances.keys()].map(String);
}

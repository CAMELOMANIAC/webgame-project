import mapData from "../../../../packages/types/src/assets/map_graph.json";

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

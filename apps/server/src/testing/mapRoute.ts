import mapData from "../../../../packages/types/src/assets/map_graph.json";

export function pathToNode(target: number) {
  const previous = new Map<number, number | null>([[0, null]]);
  const queue = [0];
  for (const node of queue) {
    if (node === target) break;
    for (const edge of mapData.edges) {
      const next =
        edge.source === node
          ? edge.target
          : edge.target === node
            ? edge.source
            : undefined;
      if (next !== undefined && !previous.has(next)) {
        previous.set(next, node);
        queue.push(next);
      }
    }
  }
  if (!previous.has(target)) throw new Error("Target is not reachable");
  const path = [target];
  let node = previous.get(target);
  while (node != null) {
    path.unshift(node);
    node = previous.get(node);
  }
  return path;
}

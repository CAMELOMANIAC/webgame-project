import { createHash } from "node:crypto";
import type { WeaponData } from "@webgame/types";
import { hasRoad, pathTravelVisits } from "./roadDistances";
import { gameRules } from "./rules";

export const patrolCombat = {
  name: "순찰 잔상",
  hp: 30,
  stamina: 100,
  staminaRegen: 5,
  weapon: {
    id: "hanlim-control-baton",
    name: "제식 충격봉",
    damage: 6,
    staminaCost: 3,
    cooldownTicks: 3,
    castTicks: 0,
    weight: 2,
    value: 30,
    attackType: "MELEE",
    iconKey: "STAFF",
  } satisfies WeaponData,
};

const routes = [
  { id: "patrol-01", entryNodeId: 0, nodes: [13, 16, 20, 48, 47, 16] },
  { id: "patrol-02", entryNodeId: 37, nodes: [35, 42, 39, 33] },
  { id: "patrol-03", entryNodeId: 93, nodes: [94, 104, 103, 55] },
];

const schedules = routes.map(({ id, entryNodeId, nodes }) => {
  const first = nodes[0]!;
  const loop = [...nodes, first];
  if (!loop.slice(1).every((node, index) => hasRoad(loop[index]!, node))) {
    throw new Error(`Patrol ${id} includes a disconnected road`);
  }
  const visits = pathTravelVisits(loop);
  const duration = visits.at(-1)!.time;
  const steps = [{ nodeId: first, time: 0 }, ...visits.slice(0, -1)];
  return { id, entryNodeId, duration, steps };
});

export function patrolsForRaid(raidId: string, entryNodeId: number) {
  const preferred = schedules.findIndex(
    (route) => route.entryNodeId === entryNodeId,
  );
  const start = Math.max(0, preferred);
  return [...schedules.slice(start), ...schedules.slice(0, start)]
    .slice(0, gameRules.ghost.patrolTrackedCount)
    .map(({ id, steps, duration }) => {
      const phase = createHash("sha256")
        .update(`${raidId}:${id}`)
        .digest()
        .readUInt32BE(0);
      const offset = steps[phase % steps.length]!.time;
      return {
        id,
        stepsNear(time: number) {
          const cycle = Math.floor((time + offset) / duration);
          return [cycle - 1, cycle, cycle + 1].flatMap((repeat) =>
            steps.map((step) => ({
              nodeId: String(step.nodeId),
              time: repeat * duration + step.time - offset,
            })),
          );
        },
      };
    });
}

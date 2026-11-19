import { createHash } from "node:crypto";
import {
  type DistrictKind,
  type EnemyArchetype,
  getEnemyArchetypeById,
  selectEnemyArchetype,
} from "@webgame/types";
import { hasRoad, pathTravelVisits } from "./roadDistances";
import { gameRules } from "./rules";

interface PatrolRouteDefinition {
  id: string;
  entryNodeId: number;
  districtKind: DistrictKind;
  nodes: number[];
}

const routes: readonly PatrolRouteDefinition[] = [
  {
    id: "patrol-01",
    entryNodeId: 0,
    districtKind: "RESIDENTIAL",
    nodes: [13, 16, 20, 48, 47, 16],
  },
  {
    id: "patrol-02",
    entryNodeId: 37,
    districtKind: "COMMERCIAL",
    nodes: [35, 42, 39, 33],
  },
  {
    id: "patrol-03",
    entryNodeId: 93,
    districtKind: "INDUSTRIAL",
    nodes: [94, 104, 103, 55],
  },
  {
    id: "patrol-04",
    entryNodeId: 316,
    districtKind: "INDUSTRIAL",
    nodes: [265, 264, 201, 197, 259, 266],
  },
  {
    id: "patrol-05",
    entryNodeId: 443,
    districtKind: "INDUSTRIAL",
    nodes: [435, 434, 407, 240, 433, 437],
  },
  {
    id: "patrol-06",
    entryNodeId: 290,
    districtKind: "COMMERCIAL",
    nodes: [282, 277, 250, 247, 254, 280],
  },
  {
    id: "patrol-07",
    entryNodeId: 612,
    districtKind: "INFRA",
    nodes: [612, 609, 607, 605, 610],
  },
  {
    id: "patrol-08",
    entryNodeId: 741,
    districtKind: "MEDICAL",
    nodes: [741, 739, 676, 672, 738, 740],
  },
];

const routeById = new Map(routes.map((route) => [route.id, route]));

/**
 * 순찰 ID와 현재 탐사 경과 시간(분)에 맞는 SF 적대 아키타입을 결정합니다.
 * 시간이 경과할수록 파밍을 마친 플레이어 고스트처럼 1 -> 2 -> 3티어 장비로 강해집니다.
 */
export function resolvePatrolArchetype(
  patrolId: string,
  timeMinutes: number,
): EnemyArchetype {
  const route = routeById.get(patrolId);
  const hash = createHash("sha256").update(patrolId).digest().readUInt32BE(0);
  // 초반 서부 주거지(patrol-01)는 첫 조우 밸런스를 위해 0~60분 구간에 초기 순찰 잔상을 고정 배정
  if (patrolId === "patrol-01" && timeMinutes <= 60) {
    const early = getEnemyArchetypeById("npc-patrol-early");
    if (early) return early;
  }
  return selectEnemyArchetype({
    timeMinutes,
    districtKind: route?.districtKind,
    patrolOnly: true,
    seed: hash,
  });
}

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

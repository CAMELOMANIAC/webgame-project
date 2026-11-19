import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  type BuildingCategory,
  CENTRAL_EXTRACTION_NODE_ID,
  CENTRAL_EXTRACTION_POS,
  CRAFT_BUILDING_LOCKDOWN_GRACE_MINUTES,
  getBuildingNormalizedDistance,
  isBuildingLockedDown,
  type MapBuilding,
  resolveBuildingLockdownMinute,
  resolveBuildingMaxCraftTier,
} from "@webgame/types";
import mapData from "../../../../packages/types/src/assets/map_graph.json";

import { gameRules } from "./rules";

const mapBuildings = mapData.buildings as MapBuilding[];

describe("중앙 단일 탈출구 및 점진적 외곽 건물 봉쇄 규칙", () => {
  it("단일 중앙 탈출구(node 169)와 다중 외곽 진입 지점을 사용한다", () => {
    assert.deepEqual(gameRules.extractionNodeIds, [CENTRAL_EXTRACTION_NODE_ID]);
    assert.ok(gameRules.entryNodeIds.length >= 4);
    assert.ok(!gameRules.entryNodeIds.includes(CENTRAL_EXTRACTION_NODE_ID));
  });

  it("레이드 시작 시점(t=0)에는 어떤 건물도 봉쇄되지 않으며 시간이 지날수록 외곽부터 점진적으로 봉쇄된다", () => {
    const seed = "raid-test-seed";
    const buildings = mapBuildings;

    const lockedAt0 = buildings.filter((b) => isBuildingLockedDown(b, 0, seed));
    assert.equal(lockedAt0.length, 0);

    const lockedAt60 = buildings.filter((b) =>
      isBuildingLockedDown(b, 60, seed),
    );
    const lockedAt180 = buildings.filter((b) =>
      isBuildingLockedDown(b, 180, seed),
    );
    const lockedAt360 = buildings.filter((b) =>
      isBuildingLockedDown(b, 360, seed),
    );

    assert.ok(lockedAt60.length > 0, "초반(60분)부터 외곽 건물이 점진적으로 봉쇄 시작");
    assert.ok(
      lockedAt60.length < lockedAt180.length &&
        lockedAt180.length < lockedAt360.length,
      "시간이 지날수록 봉쇄 건물 수가 단조 증가",
    );

    // 외곽 점찍기 확인: 60분 시점에 봉쇄된 건물들의 평균 거리는 아직 남아있는 건물들보다 더 외곽이어야 함
    const avgLockedDist =
      lockedAt60.reduce((acc, b) => acc + getBuildingNormalizedDistance(b), 0) /
      lockedAt60.length;
    const openAt60 = buildings.filter((b) => !isBuildingLockedDown(b, 60, seed));
    const avgOpenDist =
      openAt60.reduce((acc, b) => acc + getBuildingNormalizedDistance(b), 0) /
      openAt60.length;
    assert.ok(avgLockedDist > avgOpenDist);
  });

  it("조합 설비 건물은 동일 좌표의 일반 건물보다 정확히 120분 느리게 봉쇄된다", () => {
    const seed = "raid-grace-check";
    const coords = [{ x: CENTRAL_EXTRACTION_POS.x + 700, y: CENTRAL_EXTRACTION_POS.y }];
    const normalMin = resolveBuildingLockdownMinute(
      { id: 999, coordinates: coords },
      seed,
    );
    const craftMin = resolveBuildingLockdownMinute(
      { id: 999, coordinates: coords, category: "MEDICAL" },
      seed,
    );
    assert.equal(craftMin - normalMin, CRAFT_BUILDING_LOCKDOWN_GRACE_MINUTES);
  });

  it("중앙 안전 반경 내부 건물은 봉쇄되지 않는다", () => {
    const coreBuilding = {
      id: 1,
      coordinates: [{ x: CENTRAL_EXTRACTION_POS.x + 10, y: CENTRAL_EXTRACTION_POS.y }],
    };
    assert.equal(resolveBuildingLockdownMinute(coreBuilding, "seed"), Number.POSITIVE_INFINITY);
    assert.equal(isBuildingLockedDown(coreBuilding, 9999, "seed"), false);
  });

  it("모든 조합 설비 카테고리는 중앙에 최소 1개의 T2 설비를 보유하고 외곽 설비는 T1 전용으로 동작한다", () => {
    const categories: BuildingCategory[] = [
      "MEDICAL",
      "PUBLIC",
      "CULTURAL",
      "LOGISTICS",
      "COMMERCIAL",
      "INFRA",
    ];

    for (const cat of categories) {
      const catBuildings = mapBuildings.filter(
        (b) => b.category === cat,
      );
      const t2Buildings = catBuildings.filter(
        (b) => resolveBuildingMaxCraftTier(b) === 2,
      );
      assert.ok(
        t2Buildings.length >= 1,
        `${cat} 카테고리에 중앙 T2 설비가 최소 1개 존재해야 함`,
      );
    }

    const outerCraft = {
      coordinates: [{ x: CENTRAL_EXTRACTION_POS.x + 700, y: CENTRAL_EXTRACTION_POS.y }],
      category: "LOGISTICS" as const,
    };
    const innerCraft = {
      coordinates: [{ x: CENTRAL_EXTRACTION_POS.x + 100, y: CENTRAL_EXTRACTION_POS.y }],
      category: "LOGISTICS" as const,
    };
    assert.equal(resolveBuildingMaxCraftTier(outerCraft), 1);
    assert.equal(resolveBuildingMaxCraftTier(innerCraft), 2);
  });
});

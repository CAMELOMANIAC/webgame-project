import assert from "node:assert/strict";
import test from "node:test";
import {
  getCatalogItemById,
  ALL_BUILDING_EVENTS,
  getBuildingEventById,
  getEnemyArchetypeById,
  hasBuildingChoiceCondition,
  type NormalBuildingImageKey,
  resolveBuildingIntroEvent,
  STORY_BUILDING_EVENTS,
} from "@webgame/types";

const ALL_NORMAL_IMAGE_KEYS: readonly NormalBuildingImageKey[] = [
  "apartment",
  "villa",
  "luxury_house",
  "commercial_street",
  "office_building",
  "factory",
  "warehouse",
  "lab_building",
  "utility_facility",
];

test("모든 스토리 건물 이벤트는 고유 ID, 유효한 보상 아이템, 유효한 적 아키타입 ID를 가진다", () => {
  assert.ok(STORY_BUILDING_EVENTS.length >= 18);
  const seenIds = new Set<string>();

  for (const event of STORY_BUILDING_EVENTS) {
    assert.equal(seenIds.has(event.id), false, `duplicate event id: ${event.id}`);
    seenIds.add(event.id);
    assert.ok(event.choices && event.choices.length >= 2, `event ${event.id} needs choices`);

    for (const choice of event.choices) {
      for (const outcome of choice.outcomes ?? []) {
        for (const rewardId of outcome.rewardItemIds ?? []) {
          assert.ok(
            getCatalogItemById(rewardId),
            `invalid rewardItemId ${rewardId} in ${event.id}`,
          );
        }
        if (outcome.encounterEnemyId) {
          assert.ok(
            getEnemyArchetypeById(outcome.encounterEnemyId),
            `invalid encounterEnemyId ${outcome.encounterEnemyId} in ${event.id}`,
          );
        }
      }
    }
  }
});

test("모든 일반 건물 이미지 유형(luxury_house 포함)에 최소 1개 이상의 스토리 이벤트가 존재한다", () => {
  for (const key of ALL_NORMAL_IMAGE_KEYS) {
    const count = STORY_BUILDING_EVENTS.filter((e) => e.imageKey === key).length;
    assert.ok(count >= 1, `missing story event for imageKey=${key}`);
  }
});

test("동일 유형 건물에 여러 스토리 이벤트가 있을 때 건물 ID에 따라 다양하게 분산 선택되고 완료 시 제외된다", () => {
  const first = resolveBuildingIntroEvent(
    { id: 100, height: 20 },
    { kind: "RESIDENTIAL" },
    [],
  );
  const second = resolveBuildingIntroEvent(
    { id: 101, height: 20 },
    { kind: "RESIDENTIAL" },
    [],
  );
  assert.notEqual(first.id, second.id);

  const afterFirstCompleted = resolveBuildingIntroEvent(
    { id: 100, height: 20 },
    { kind: "RESIDENTIAL" },
    [first.id],
  );
  assert.notEqual(afterFirstCompleted.id, first.id);
});

test("선택지 조건(태그·단일 아이템·복수 아이템) 판정이 정확하게 동작한다", () => {
  assert.equal(
    hasBuildingChoiceCondition(
      {
        condition: {
          requireAnyItemIds: ["mat-lighter", "mat-fuel"],
          label: "라이터 또는 연료",
        },
      },
      ["mat-fuel"],
    ),
    true,
  );
  assert.equal(
    hasBuildingChoiceCondition(
      {
        condition: {
          requireAnyItemIds: ["mat-lighter", "mat-fuel"],
          label: "라이터 또는 연료",
        },
      },
      ["mat-wire"],
    ),
    false,
  );
  assert.equal(
    hasBuildingChoiceCondition(
      { condition: { requireTag: "TECH", label: "기계" } },
      ["eq-inf-t1"],
    ),
    true,
  );
});

test("모든 건물 이벤트 ID는 고유하며 확정된 ID로 같은 이벤트를 다시 찾을 수 있다", () => {
  const ids = ALL_BUILDING_EVENTS.map((event) => event.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const event of ALL_BUILDING_EVENTS) {
    assert.equal(getBuildingEventById(event.id), event);
  }
  const unarmed = resolveBuildingIntroEvent({ id: 100, height: 20 }, { kind: "RESIDENTIAL" }, [], {
    isUnarmed: true,
  });
  assert.equal(getBuildingEventById(unarmed.id), unarmed);
  assert.equal(getBuildingEventById(undefined), undefined);
  assert.equal(getBuildingEventById("missing-event"), undefined);
});

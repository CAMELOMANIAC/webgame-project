import assert from "node:assert/strict";
import { mock, test } from "node:test";
import {
  STORY_BUILDING_EVENTS,
  calculateBaseRecovery,
  calculateLiveBaseRecovery,
  hasBuildingChoiceCondition,
  resolveBuildingIntroEvent,
} from "@webgame/types";
import { buildApp } from "./app";
import { createDatabase } from "./db";
import { findEnemyNoiseSignals } from "./logic/ghostNoise";
import {
  pathFatigueCost,
  pathTravelMinutes,
  pathTravelVisits,
  roadFatigueCost,
  roadTravelMinutes,
} from "./logic/roadDistances";
import { extractRaidExploration } from "./services/raid";

// 실제 접속은 하지 않는다. DB 의존 API는 주입한 클라이언트의 메서드로 대체한다.
function createTestDb() {
  return createDatabase("postgresql://test:test@127.0.0.1:1/webgame_test");
}

test("앱 생성과 상태 조회는 포트를 열거나 DB에 접속하지 않는다", async (t) => {
  const app = buildApp({ database: createTestDb(), logger: false });
  t.after(() => app.close());
  assert.equal(app.server.listening, false);
  const response = await app.inject({ method: "GET", url: "/health" });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { status: "ok" });
  assert.equal(app.server.listening, false);
});

test("DB 의존 API는 주입한 데이터베이스를 사용한다", async (t) => {
  const database = createTestDb();
  const findUsers = mock.fn(async () => [
    { id: "test-user", nickname: "테스트 생존자" },
  ]);
  const originalFindMany = database.query.users.findMany;
  Reflect.set(database.query.users, "findMany", findUsers);
  const app = buildApp({ database, logger: false });
  t.after(async () => {
    await app.close();
    Reflect.set(database.query.users, "findMany", originalFindMany);
  });
  const response = await app.inject({ method: "GET", url: "/users" });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json()[0].id, "test-user");
  assert.equal(findUsers.mock.callCount(), 1);
});

test("전투 API는 잘못된 입력을 거부한다", async (t) => {
  const app = buildApp({ database: createTestDb(), logger: false });
  t.after(() => app.close());
  const response = await app.inject({
    method: "POST",
    url: "/battle/simulate",
    payload: {},
  });
  assert.equal(response.statusCode, 400);
});

test("전투 API는 DB 없이 시뮬레이션 로그를 반환한다", async (t) => {
  const app = buildApp({ database: createTestDb(), logger: false });
  t.after(() => app.close());
  const response = await app.inject({
    method: "POST",
    url: "/battle/simulate",
    payload: { players: [] },
  });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json().initialState.players, []);
  assert.deepEqual(response.json().result, {
    winnerTeamId: null,
    reason: "DRAW",
    durationTicks: 0,
  });
  assert.equal(response.json().timeline[0].events[0].type, "BATTLE_END");
});

test("도로 이동 시간은 실제 간선 길이에 비례해 10분~60분 단위로 누적된다", () => {
  assert.equal(roadTravelMinutes(0, 1), 10);
  assert.equal(roadTravelMinutes(1, 26), 30);
  assert.equal(roadTravelMinutes(26, 28), 20);
  assert.equal(roadTravelMinutes(28, 28), 10);
  assert.deepEqual(pathTravelVisits([0, 1, 26, 28], 0), [
    { nodeId: 1, time: 10 },
    { nodeId: 26, time: 40 },
    { nodeId: 28, time: 60 },
  ]);
  assert.equal(pathTravelMinutes([0, 1, 26, 28]), 60);

  // 피로도 소모량 및 고갈(0) 시 이동 시간 1.5배(10분 단위 올림) 증가
  assert.equal(roadFatigueCost(0, 1), 1);
  assert.equal(roadFatigueCost(1, 26), 3);
  assert.equal(roadFatigueCost(28, 28), 2);
  assert.equal(pathFatigueCost([0, 1, 26, 28]), 6);

  assert.equal(roadTravelMinutes(0, 1, 0), 20);
  assert.equal(roadTravelMinutes(1, 26, 0), 50);
  assert.equal(roadTravelMinutes(26, 28, 0), 30);
  assert.equal(roadTravelMinutes(28, 28, 0), 20);
  assert.equal(pathTravelMinutes([0, 1, 26, 28], 0), 100);
});

test("적 소음은 감지 범위 안의 서로 다른 구역을 모두 반환한다", () => {
  const near = { x: 216, y: 408, radius: 34 };
  const far = { x: 264, y: 408, radius: 34 };
  assert.deepEqual(findEnemyNoiseSignals(1, ["26"]), [near]);
  assert.deepEqual(findEnemyNoiseSignals(1, ["26", "28", "1130", "7", "8"]), [near, far]);
  assert.deepEqual(findEnemyNoiseSignals(1, ["1130"]), []);
});

test("건물 이벤트 API는 잘못된 액션을 거부하고 exploration 추출은 비어 있으면 undefined를 반환한다", async (t) => {
  assert.equal(extractRaidExploration(null), undefined);
  assert.equal(
    extractRaidExploration({ visitedEdges: ["0-1"], remainingDistance: 0 }),
    undefined,
  );
  assert.deepEqual(
    extractRaidExploration({
      visitedEdges: [],
      remainingDistance: 0,
      lootedBuildingIds: [42],
      districtLootCounts: { "west-res-1": 1 },
    }),
    {
      lootedBuildingIds: [42],
      usedCraftBuildingIds: [],
      buildingEvents: {},
    },
  );

  const database = createTestDb();
  Reflect.set(database.query.users, "findFirst", async () => ({
    id: "test-user",
  }));
  Reflect.set(database.query.characters, "findFirst", async () => ({
    userId: "test-user",
  }));
  const app = buildApp({ database, logger: false });
  t.after(() => app.close());

  const invalid = await app.inject({
    method: "POST",
    url: "/character/char-1/raid/building/action",
    headers: { "x-dev-user-id": "test-user" },
    payload: {
      raidId: "00000000-0000-0000-0000-000000000001",
      expectedVersion: 0,
      requestId: "00000000-0000-0000-0000-000000000002",
      action: "INVALID",
    },
  });
  assert.equal(invalid.statusCode, 400);

  const invalidLoot = await app.inject({
    method: "POST",
    url: "/character/char-1/raid/loot/action",
    headers: { "x-dev-user-id": "test-user" },
    payload: {
      raidId: "00000000-0000-0000-0000-000000000001",
      expectedVersion: 0,
      requestId: "00000000-0000-0000-0000-000000000003",
      action: "INVALID",
    },
  });
  assert.equal(invalidLoot.statusCode, 400);
});

test("extractRaidExploration은 pendingLoot 유무에 따라 조건부로 전리품 목록을 포함한다", () => {
  assert.equal(
    extractRaidExploration({
      visitedEdges: [],
      remainingDistance: 0,
      pendingLoot: [],
    }),
    undefined,
  );
  const sampleLoot = [
    {
      id: "loot-1",
      weaponMasterId: "mat-scrap",
      name: "고철 파편",
      quantity: 1,
      weight: 1,
      value: 20,
      iconKey: "AXE",
      source: "SEARCH" as const,
    },
  ];
  assert.deepEqual(
    extractRaidExploration({
      visitedEdges: [],
      remainingDistance: 0,
      pendingLoot: sampleLoot,
    }),
    {
      lootedBuildingIds: [],
      usedCraftBuildingIds: [],
      buildingEvents: {},
      pendingLoot: sampleLoot,
    },
  );
});

test("건물 이벤트 선택지 조건 판정과 레이드당 1회 제한이 정확히 동작한다", () => {
  const storyEvent = STORY_BUILDING_EVENTS.find(
    (e) => e.id === "story-evacuation-echo",
  );
  assert.ok(storyEvent);
  const medicalChoice = storyEvent.choices?.find((c) => c.id === "medical-port");
  assert.ok(medicalChoice);

  assert.equal(hasBuildingChoiceCondition(medicalChoice, ["mat-tape"]), false);
  assert.equal(hasBuildingChoiceCondition(medicalChoice, ["mat-electrolyte"]), true);

  const villa = { id: 999, height: 28 };
  const district = { kind: "RESIDENTIAL" as const };
  assert.equal(
    resolveBuildingIntroEvent(villa, district, []).id,
    "story-evacuation-echo",
  );
  assert.equal(
    resolveBuildingIntroEvent(villa, district, ["story-evacuation-echo"]).id,
    "district-residential-villa",
  );

  const broadcast = STORY_BUILDING_EVENTS.find(
    (e) => e.id === "story-anomalous-broadcast",
  );
  const shuntChoice = broadcast?.choices?.find((c) => c.id === "shunt-relay");
  assert.ok(shuntChoice);
  assert.equal(hasBuildingChoiceCondition(shuntChoice, ["mat-tape"]), false);
  assert.equal(hasBuildingChoiceCondition(shuntChoice, ["mat-battery"]), true);
  assert.equal(hasBuildingChoiceCondition(shuntChoice, ["mat-relay"]), true);
});

test("거점 복귀 시각 기반 자연 회복이 15초당 HP +1, 피로도 +1로 정확히 계산된다", () => {
  const returnedAt = new Date("2026-11-17T00:00:00.000Z");

  // 53초 경과 -> 3틱(45초) 완료, 다음 틱(60초)까지 7초 남음
  const after53s = calculateBaseRecovery({
    hp: 10,
    maxHp: 100,
    fatigue: 20,
    maxFatigue: 100,
    isRaiding: false,
    returnedAt,
    now: new Date("2026-11-17T00:00:53.000Z"),
  });
  assert.deepEqual(after53s, {
    hp: 13,
    fatigue: 23,
    isRecovering: true,
    nextTickInMs: 7000,
  });

  // 클라이언트 라이브 계산: 서버 응답(53초 시점 hp=13, fatigue=23) 후 7초 경과 -> 1틱 추가 (hp=14, fatigue=24)
  const liveAfter7s = calculateLiveBaseRecovery({
    hp: after53s.hp,
    maxHp: 100,
    fatigue: after53s.fatigue,
    maxFatigue: 100,
    isRaiding: false,
    returnedAt,
    serverTime: "2026-11-17T00:00:53.000Z",
    elapsedSinceResponseMs: 7000,
  });
  assert.deepEqual(liveAfter7s, {
    hp: 14,
    fatigue: 24,
    isRecovering: true,
    nextTickInMs: 15_000,
  });

  // 최대치 도달 시 상한 고정 및 회복 종료
  const maxed = calculateBaseRecovery({
    hp: 95,
    maxHp: 100,
    fatigue: 98,
    maxFatigue: 100,
    isRaiding: false,
    returnedAt,
    now: new Date("2026-11-17T00:05:00.000Z"),
  });
  assert.deepEqual(maxed, {
    hp: 100,
    fatigue: 100,
    isRecovering: false,
    nextTickInMs: null,
  });

  // 탐사 중에는 회복하지 않는다
  const whileRaiding = calculateBaseRecovery({
    hp: 10,
    maxHp: 100,
    fatigue: 20,
    maxFatigue: 100,
    isRaiding: true,
    returnedAt,
    now: new Date("2026-11-17T00:05:00.000Z"),
  });
  assert.deepEqual(whileRaiding, {
    hp: 10,
    fatigue: 20,
    isRecovering: false,
    nextTickInMs: null,
  });
});


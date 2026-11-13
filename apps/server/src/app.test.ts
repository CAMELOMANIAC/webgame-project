import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { buildApp } from "./app";
import { createDatabase } from "./db";
import { findEnemyNoiseSignals } from "./logic/ghostNoise";
import {
  pathTravelMinutes,
  pathTravelVisits,
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
});

test("적 소음은 감지 범위 안의 서로 다른 구역을 모두 반환한다", () => {
  const east = { x: 192, y: 448, radius: 91 };
  const west = { x: 64, y: 448, radius: 91 };
  assert.deepEqual(findEnemyNoiseSignals(1, ["26"]), [east]);
  assert.deepEqual(findEnemyNoiseSignals(1, ["26", "28", "1130", "7", "8"]), [west, east]);
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
      districtLootCounts: { "west-res-1": 1 },
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
});

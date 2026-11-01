import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { buildApp } from "./app";
import { createDatabase } from "./db";

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

import assert from "node:assert/strict";
import { test } from "node:test";
import { buildApp } from "./app";
import { createDatabase } from "./db";

function createTestDb() {
  return createDatabase("postgresql://test:test@127.0.0.1:1/webgame_test");
}

test("계정을 선택하지 않으면 개인 데이터에 접근하지 못한다", async (t) => {
  const app = buildApp({ database: createTestDb(), logger: false });
  t.after(() => app.close());
  const response = await app.inject({
    method: "GET",
    url: "/user/user/character",
  });
  assert.equal(response.statusCode, 401);
});

test("선택한 계정이 다른 사용자의 캐릭터·창고에 접근하지 못한다", async (t) => {
  const database = createTestDb();
  Reflect.set(database.query.users, "findFirst", async () => ({
    id: "selected-user",
  }));
  Reflect.set(database.query.characters, "findFirst", async () => ({
    userId: "other-user",
  }));
  const app = buildApp({ database, logger: false });
  t.after(() => app.close());
  const headers = { "x-dev-user-id": "selected-user" };
  assert.equal(
    (
      await app.inject({
        method: "GET",
        url: "/user/other-user/stash",
        headers,
      })
    ).statusCode,
    403,
  );
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: "/character/other/raid/start",
        headers,
      })
    ).statusCode,
    403,
  );
});

test("개발용 계정 선택이 비활성화되면 헤더로 우회하지 못한다", async (t) => {
  const app = buildApp({
    database: createTestDb(),
    logger: false,
    developmentAuth: false,
  });
  t.after(() => app.close());
  assert.equal(
    (await app.inject({ method: "GET", url: "/dev/users" })).statusCode,
    404,
  );
  assert.equal(
    (await app.inject({ method: "GET", url: "/dev/character-variants" }))
      .statusCode,
    404,
  );
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: "/dev/user/u/characters",
        headers: { "x-dev-user-id": "u" },
        payload: { variantId: "legacy-origin" },
      })
    ).statusCode,
    404,
  );
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: "/battle/simulate",
        payload: { players: [] },
      })
    ).statusCode,
    404,
  );
  assert.equal(
    (
      await app.inject({
        method: "GET",
        url: "/user/u/character",
        headers: { "x-dev-user-id": "u" },
      })
    ).statusCode,
    503,
  );
});

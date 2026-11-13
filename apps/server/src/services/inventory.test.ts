import assert from "node:assert/strict";
import { mock, test } from "node:test";
import {
  CRAFTING_MATERIALS,
  swapEquipmentBackpack,
} from "@webgame/types";
import { buildApp } from "../app";
import { createDatabase } from "../db";
import {
  countItems,
  equipItem,
  EquipItemSchema,
  InventoryError,
  MoveItemSchema,
  reconcileLoadoutWithStash,
  SlotsSchema,
  withInventoryTransaction,
} from "./inventory";

function createTestDb() {
  return createDatabase("postgresql://test:test@127.0.0.1:1/webgame_test");
}

function createSerializationError(code = "40001") {
  return Object.assign(new Error("serialization failure"), { code });
}

test("아이템 수량은 장착 개수와 가방 묶음 수량을 합산한다", () => {
  const counts = countItems(
    [{ weaponMasterId: "a" }],
    [
      { weaponMasterId: "a", quantity: 3 },
      { weaponMasterId: "b", quantity: 2 },
    ],
  );
  assert.equal(counts.get("a"), 4);
  assert.equal(counts.get("b"), 2);
  assert.throws(
    () => countItems([], [{ weaponMasterId: "a", quantity: -1 }]),
    InventoryError,
  );
});

test("슬롯 범위·정수·중복과 잘못된 수량을 거부한다", () => {
  const entry = { weaponMasterId: "a", slotIndex: 0, quantity: 1 };
  for (const slotIndex of [-1, 32, 0.5]) {
    assert.equal(
      SlotsSchema.safeParse({
        equipment: [],
        inventory: [{ ...entry, slotIndex }],
      }).success,
      false,
    );
  }
  for (const quantity of [0, -1, 0.5]) {
    assert.equal(
      SlotsSchema.safeParse({
        equipment: [],
        inventory: [{ ...entry, quantity }],
      }).success,
      false,
    );
  }
  assert.equal(
    SlotsSchema.safeParse({ equipment: [], inventory: [entry, entry] }).success,
    false,
  );
  assert.equal(
    EquipItemSchema.safeParse({ weaponMasterId: "a", slotIndex: 6 }).success,
    false,
  );
  assert.equal(
    MoveItemSchema.safeParse({
      direction: "to_stash",
      weaponMasterId: "a",
      slotIndex: 1.5,
    }).success,
    false,
  );
});

test("직렬화 충돌만 재시도하며 트랜잭션 격리 수준을 지정한다", async (t) => {
  const database = createTestDb();
  t.after(() => database.$disconnect());
  const conflict = createSerializationError("40001");
  let attempts = 0;
  const transaction = mock.fn(async (_action: unknown, options: unknown) => {
    attempts++;
    assert.deepEqual(options, { isolationLevel: "serializable" });
    if (attempts < 3) throw conflict;
    return "ok";
  });
  Reflect.set(database, "transaction", transaction);
  assert.equal(
    await withInventoryTransaction(database, async () => "unused"),
    "ok",
  );
  assert.equal(transaction.mock.callCount(), 3);
});

test("일반 오류는 재시도하지 않으며 반복 충돌은 409 오류로 종료한다", async (t) => {
  const database = createTestDb();
  t.after(() => database.$disconnect());
  const ordinary = mock.fn(async () => {
    throw new Error("ordinary");
  });
  Reflect.set(database, "transaction", ordinary);
  await assert.rejects(
    () => withInventoryTransaction(database, async () => undefined),
    /ordinary/,
  );
  assert.equal(ordinary.mock.callCount(), 1);
  const conflict = mock.fn(async () => {
    throw createSerializationError("40001");
  });
  Reflect.set(database, "transaction", conflict);
  await assert.rejects(
    () => withInventoryTransaction(database, async () => undefined),
    (error: unknown) =>
      error instanceof InventoryError && error.statusCode === 409,
  );
  assert.equal(conflict.mock.callCount(), 5);
});

test("행 잠금의 PostgreSQL 직렬화 오류도 재시도한다", async (t) => {
  const database = createTestDb();
  t.after(() => database.$disconnect());
  let count = 0;
  Reflect.set(database, "transaction", async () => {
    if (++count === 1)
      throw Object.assign(new Error("wrapped"), {
        cause: createSerializationError("40P01"),
      });
    return "ok";
  });
  assert.equal(
    await withInventoryTransaction(database, async () => undefined),
    "ok",
  );
  assert.equal(count, 2);
});

test("잘못된 아이템 요청은 DB 접근 전에 API에서 거부한다", async (t) => {
  const database = createTestDb();
  const app = buildApp({ database, logger: false });
  t.after(() => app.close());
  const transaction = mock.fn(async () => {
    throw new Error("DB must not be accessed");
  });
  Reflect.set(database, "transaction", transaction);
  Reflect.set(database.query.users, "findFirst", async () => ({
    id: "test-user",
  }));
  Reflect.set(database.query.characters, "findFirst", async () => ({
    userId: "test-user",
  }));
  const requests = [
    {
      method: "POST" as const,
      url: "/character/c/slots/sync",
      payload: {
        equipment: [],
        inventory: [{ weaponMasterId: "a", slotIndex: 0, quantity: -1 }],
      },
    },
    {
      method: "PATCH" as const,
      url: "/character/c/equipment",
      payload: { weaponMasterId: "a", slotIndex: 99 },
    },
    {
      method: "POST" as const,
      url: "/character/c/inventory/move",
      payload: { weaponMasterId: "a", direction: "to_stash", slotIndex: -1 },
    },
    {
      method: "POST" as const,
      url: "/character/c/raid/start",
      payload: {
        equipment: [{ weaponMasterId: "a", slotIndex: 9 }],
        inventory: [],
      },
    },
  ];
  for (const request of requests)
    assert.equal(
      (
        await app.inject({
          ...request,
          headers: { "x-dev-user-id": "test-user" },
        })
      ).statusCode,
      400,
    );
  assert.equal(transaction.mock.callCount(), 0);
});

test("배치 정산은 캐릭터와 창고의 총 수량을 보존하고 초과 요청을 거부한다", () => {
  const pool = new Map([
    ["rifle", 2],
    ["medkit", 3],
  ]);
  const stashCounts = new Map([
    ["rifle", 1],
    ["medkit", 2],
  ]);
  const requested = new Map([
    ["rifle", 2],
    ["medkit", 1],
  ]);
  const nextStash = reconcileLoadoutWithStash(pool, stashCounts, requested);
  assert.equal(nextStash.get("rifle"), 0);
  assert.equal(nextStash.has("medkit"), false);

  const storedToStash = reconcileLoadoutWithStash(
    pool,
    stashCounts,
    new Map([["rifle", 1]]),
  );
  assert.equal(storedToStash.has("rifle"), false);
  assert.equal(storedToStash.get("medkit"), 3);

  assert.throws(
    () =>
      reconcileLoadoutWithStash(
        pool,
        stashCounts,
        new Map([["rifle", 3]]),
      ),
    InventoryError,
  );
});

test("일괄 장비 해제 API는 소유권을 검증하고 탐사 중 409 오류를 반환한다", async (t) => {
  const database = createTestDb();
  const app = buildApp({ database, logger: false });
  t.after(() => app.close());

  Reflect.set(database.query.users, "findFirst", async () => ({
    id: "test-user",
  }));
  Reflect.set(database.query.characters, "findFirst", async () => ({
    userId: "other-user",
  }));

  for (const url of [
    "/character/c/equipment/unequip-all",
    "/character/c/equipment/unequip-others",
  ]) {
    const forbidden = await app.inject({
      method: "POST",
      url,
      headers: { "x-dev-user-id": "test-user" },
    });
    assert.equal(forbidden.statusCode, 403);
  }

  Reflect.set(database.query.characters, "findFirst", async () => ({
    userId: "test-user",
  }));
  Reflect.set(database, "transaction", async () => {
    throw new InventoryError("Stash is unavailable during a raid", 409);
  });

  for (const url of [
    "/character/c/equipment/unequip-all",
    "/character/c/equipment/unequip-others",
  ]) {
    const conflict = await app.inject({
      method: "POST",
      url,
      headers: { "x-dev-user-id": "test-user" },
    });
    assert.equal(conflict.statusCode, 409);
  }
});

test("MATERIAL 아이템은 장착 슬롯 스왑과 서버 장착 API에서 모두 거부된다", async () => {
  const mat = CRAFTING_MATERIALS[0]!;
  const swapResult = swapEquipmentBackpack(
    [
      { id: "empty-wpn-0", slotIndex: 0, weaponMaster: null },
    ],
    [
      {
        id: "inv-mat-1",
        slotIndex: 0,
        quantity: 1,
        weaponMaster: {
          id: mat.id,
          name: mat.name,
          damage: mat.damage,
          staminaCost: mat.staminaCost,
          cooldownTicks: mat.cooldownTicks,
          castTicks: mat.castTicks,
          weight: mat.weight,
          value: mat.value,
          attackType: mat.attackType,
          iconKey: mat.iconKey,
          effect: mat.effect,
        },
      },
    ],
    0,
    0,
  );
  assert.equal(swapResult, false);

  const database = createTestDb();
  Reflect.set(database, "transaction", async (cb: (tx: unknown) => Promise<unknown>) =>
    cb({
      query: {
        characters: { findFirst: async () => ({ id: "c1", maxWeight: 50 }) },
        characterWeapons: { findFirst: async () => undefined },
        weaponMasters: { findMany: async () => [] },
      },
    }),
  );

  await assert.rejects(
    equipItem(database, "c1", { slotIndex: 0, weaponMasterId: mat.id }),
    (err: unknown) =>
      err instanceof InventoryError && err.message === "Materials cannot be equipped",
  );
});

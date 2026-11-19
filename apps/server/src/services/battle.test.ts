import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { healingWeapon } from "@webgame/types";
import {
  characters,
  characterWeapons,
  createDatabase,
  raidInventoryItems,
  type TransactionClient,
} from "../db";
import { applyBattleSettlement, executeMonsterBattle, toBattleWeapon } from "./battle";

function fixture({ armed = true, enemyArmed = false, hp = 35 } = {}) {
  const database = createDatabase(
    "postgresql://test:test@127.0.0.1:1/webgame_test",
  );
  const baseWeapon = {
    id: "attack",
    name: "Test Rifle",
    damage: 100,
    staminaCost: 10,
    cooldownTicks: 0,
    castTicks: 0,
    weight: 1,
    value: 1,
    description: null,
    attackType: "RANGED" as const,
    iconKey: "RIFLE",
    effect: null,
  };
  const character = {
    id: "character",
    userId: "user",
    variantId: "legacy-origin",
    displayName: null,
    createdAt: new Date(),
    activeRaidId: null,
    hp,
    maxHp: 150,
    stamina: 120,
    maxStamina: 120,
    staminaRegen: 0,
    fatigue: 100,
    maxFatigue: 100,
    weight: 0,
    maxWeight: 60,
    time: 0,
    currentNodeId: 0,
    isRaiding: true,
    user: { nickname: "Player" },
    variant: { definition: { id: "legacy-survivor", name: "Player" } },
    weapons: armed
      ? [
          {
            slotIndex: 0,
            weaponMaster: {
              ...baseWeapon,
              id: "heal",
              name: "Life-saver",
              damage: 0,
              staminaCost: 20,
              effect: healingWeapon.effect,
            },
          },
          { slotIndex: 1, weaponMaster: baseWeapon },
        ]
      : [],
  };
  const update = mock.fn(async (args: { data: unknown }) => args.data);
  const createItem = mock.fn(async (values: unknown) => values);
  const deleteItems = mock.fn(async () => ({ count: 1 }));
  const deleteEquipment = mock.fn(async () => ({ count: 1 }));

  Reflect.set(database.query.characters, "findFirst", async () => character);
  Reflect.set(database.query.monsterMasters, "findMany", async () => [
    {
      id: "enemy",
      name: "Test Enemy",
      hp: 40,
      maxHp: 40,
      stamina: 100,
      maxStamina: 100,
      staminaRegen: 0,
      level: 1,
      weapons: enemyArmed
        ? [{ slotIndex: 0, weaponMasterId: baseWeapon.id, weaponMaster: baseWeapon }]
        : [],
    },
  ]);
  Reflect.set(database.query.weaponMasters, "findFirst", async () => baseWeapon);
  Reflect.set(database.query.raidInventoryItems, "findMany", async () => []);
  Reflect.set(
    database.query.characterWeapons,
    "findMany",
    async () => character.weapons,
  );

  Reflect.set(database, "update", (table: unknown) => ({
    set: (data: unknown) => ({
      where: async () => {
        if (table === characters) {
          await update({ data });
        }
      },
    }),
  }));
  Reflect.set(database, "insert", (table: unknown) => ({
    values: async (values: unknown) => {
      if (table === raidInventoryItems) {
        await createItem(values);
      }
    },
  }));
  Reflect.set(database, "delete", (table: unknown) => ({
    where: async () => {
      if (table === raidInventoryItems) {
        await deleteItems();
      } else if (table === characterWeapons) {
        await deleteEquipment();
      }
    },
  }));

  const transaction = mock.fn(
    async (callback: (tx: TransactionClient) => Promise<unknown>) =>
      callback(database as unknown as TransactionClient),
  );
  Reflect.set(database, "transaction", transaction);
  return {
    database,
    update,
    createItem,
    deleteItems,
    deleteEquipment,
    transaction,
  };
}

test("전투 정산은 회복을 포함한 최종 체력을 유지하고 스태미너는 최대치로 복구한다", async (t) => {
  const { database, update, createItem, transaction } = fixture();
  t.after(() => database.$disconnect());
  const result = await executeMonsterBattle(database, "character");
  const finalPlayer = result.finalState.players[0];
  assert.equal(finalPlayer?.id, "character");
  assert.equal(finalPlayer?.name, "Player");
  assert.equal(result.playerDied, false);
  assert.equal(result.result.winnerTeamId, "TeamA");
  assert.equal(finalPlayer?.hp, 85);
  assert.deepEqual(update.mock.calls[0]?.arguments[0].data, {
    hp: finalPlayer?.hp,
    stamina: 120,
    weight: 2,
  });
  assert.equal(transaction.mock.callCount(), 1);
  assert.equal(createItem.mock.callCount(), 1);
  assert.equal(result.rewardItemName, "Test Rifle");
});

test("사망 정산은 장비와 가방을 비우고 HP 1·피로도 0 및 복귀 시각을 기록한다", async (t) => {
  const { database, update, createItem, deleteItems, deleteEquipment } =
    fixture({ armed: false, enemyArmed: true, hp: 1 });
  t.after(() => database.$disconnect());
  const result = await executeMonsterBattle(database, "character");
  assert.equal(result.playerDied, true);
  assert.equal(result.finalState.players[0]?.hp, 0);
  assert.equal(result.rewardItemName, null);
  assert.equal(createItem.mock.callCount(), 0);
  assert.equal(deleteItems.mock.callCount(), 1);
  assert.equal(deleteEquipment.mock.callCount(), 1);
  const updateData = update.mock.calls[0]?.arguments[0].data as Record<
    string,
    unknown
  >;
  assert.ok(updateData.returnedAt instanceof Date);
  assert.deepEqual(
    { ...updateData, returnedAt: undefined },
    {
      isRaiding: false,
      hp: 1,
      stamina: 120,
      fatigue: 0,
      returnedAt: undefined,
      time: 0,
      currentNodeId: 0,
      weight: 0,
      activeFoodBuff: null,
    },
  );
});

test("최대 틱 종료는 승리 보상을 지급하지 않는다", async (t) => {
  const { database, createItem } = fixture({ armed: false });
  t.after(() => database.$disconnect());
  const result = await executeMonsterBattle(database, "character");
  assert.equal(result.result.reason, "MAX_TICKS");
  assert.equal(result.playerDied, false);
  assert.equal(result.rewardItemName, null);
  assert.equal(createItem.mock.callCount(), 0);
});

test("SF 명칭으로 바꿔도 공격 방식·아이콘·회복 효과는 명시적 데이터를 따른다", () => {
  const weapon = toBattleWeapon({
    id: "sf-weapon",
    name: "구호용 주입기",
    damage: 0,
    staminaCost: 1,
    cooldownTicks: 0,
    castTicks: 0,
    weight: 1,
    value: 1,
    description: null,
    attackType: "RANGED",
    iconKey: "HEAL",
    effect: { type: "HEAL", amount: 50, hpThreshold: 0.5, oncePerBattle: true },
  });
  assert.equal(weapon.attackType, "RANGED");
  assert.equal(weapon.iconKey, "HEAL");
  assert.equal(weapon.effect?.amount, 50);
});

test("deferLootToPending 옵션 시 전투 승리 보상을 가방에 바로 넣지 않고 rewardItem으로 반환한다", async (t) => {
  const { database, createItem } = fixture();
  t.after(() => database.$disconnect());

  // 가방 32칸이 모두 찼고 캐릭터 maxWeight를 낮게 설정해도 rewardItem은 정상 반환되어야 한다.
  Reflect.set(
    database.query.raidInventoryItems,
    "findMany",
    async () =>
      Array.from({ length: 32 }, (_, slotIndex) => ({
        slotIndex,
        quantity: 1,
        weaponMaster: { weight: 1 },
      })),
  );

  const immediateLog = await executeMonsterBattle(database, "character");
  createItem.mock.resetCalls();

  const character = {
    id: "character",
    userId: "user",
    variantId: "legacy-origin",
    displayName: null,
    createdAt: new Date(),
    activeRaidId: null,
    hp: 35,
    maxHp: 150,
    stamina: 120,
    maxStamina: 120,
    staminaRegen: 0,
    fatigue: 100,
    maxFatigue: 100,
    weight: 33,
    maxWeight: 1,
    time: 0,
    currentNodeId: 0,
    isRaiding: true,
    returnedAt: null,
    variantLevel: 1,
    variantExp: 0,
    activeFoodBuff: null,
    geneProfile: null,
  };

  const deferredResult = await applyBattleSettlement(
    database as unknown as TransactionClient,
    character,
    immediateLog,
    ["attack"],
    { deferLootToPending: true },
  );

  assert.equal(deferredResult.playerDied, false);
  assert.equal(createItem.mock.callCount(), 0);
  assert.equal(deferredResult.rewardItemName, "Test Rifle");
  assert.deepEqual(deferredResult.rewardItem, {
    weaponMasterId: "attack",
    name: "Test Rifle",
    weight: 1,
    value: 1,
    iconKey: "RIFLE",
    quantity: 1,
  });
});

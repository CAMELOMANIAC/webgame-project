import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { PrismaClient, type Prisma } from "@prisma/client";
import { healingWeapon } from "@webgame/types";
import { executeMonsterBattle, toBattleWeapon } from "./battle";

function fixture({ armed = true, enemyArmed = false, hp = 35 } = {}) {
  const database = new PrismaClient({
    datasources: {
      db: { url: "postgresql://test:test@127.0.0.1:1/webgame_test" },
    },
  });
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
    attackType: "RANGED",
    iconKey: "RIFLE",
    effect: null,
  };
  const character = {
    id: "character",
    userId: "user",
    hp,
    maxHp: 150,
    stamina: 120,
    maxStamina: 120,
    staminaRegen: 0,
    weight: 0,
    maxWeight: 60,
    time: 0,
    currentNodeId: 0,
    isRaiding: true,
    user: { nickname: "Player" },
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
  const createItem = mock.fn(async () => ({}));
  const deleteItems = mock.fn(async () => ({ count: 1 }));
  const deleteEquipment = mock.fn(async () => ({ count: 1 }));
  Reflect.set(database.character, "findUnique", async () => character);
  Reflect.set(database.character, "update", update);
  Reflect.set(database.monsterMaster, "findMany", async () => [
    {
      id: "enemy",
      name: "Test Enemy",
      hp: 40,
      maxHp: 40,
      stamina: 100,
      maxStamina: 100,
      staminaRegen: 0,
      level: 1,
      weapons: enemyArmed ? [{ slotIndex: 0, weaponMaster: baseWeapon }] : [],
    },
  ]);
  Reflect.set(database.weaponMaster, "findFirst", async () => baseWeapon);
  Reflect.set(database.weaponMaster, "findUnique", async () => baseWeapon);
  Reflect.set(database.raidInventoryItem, "findMany", async () => []);
  Reflect.set(database.raidInventoryItem, "create", createItem);
  Reflect.set(database.raidInventoryItem, "deleteMany", deleteItems);
  Reflect.set(database.characterWeapon, "deleteMany", deleteEquipment);
  Reflect.set(
    database.characterWeapon,
    "findMany",
    async () => character.weapons,
  );
  const transaction = mock.fn(
    async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
      callback(database),
  );
  Reflect.set(database, "$transaction", transaction);
  return {
    database,
    update,
    createItem,
    deleteItems,
    deleteEquipment,
    transaction,
  };
}

test("전투 정산은 회복을 포함한 최종 체력·스태미나와 보상을 함께 저장한다", async (t) => {
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
    stamina: finalPlayer?.stamina,
    weight: 2,
  });
  assert.equal(transaction.mock.callCount(), 1);
  assert.equal(createItem.mock.callCount(), 1);
  assert.equal(result.rewardItemName, "Test Rifle");
});

test("사망 정산은 장비와 가방을 비우고 캐릭터 최대치로 복구한다", async (t) => {
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
  assert.deepEqual(update.mock.calls[0]?.arguments[0].data, {
    isRaiding: false,
    hp: 150,
    stamina: 120,
    time: 0,
    currentNodeId: 0,
    weight: 0,
  });
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

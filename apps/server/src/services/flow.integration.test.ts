import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { integrationFixture } from "../testing/integrationFixture";
import { extractRaid, fightRaidMonster, startRaid } from "./raid";
import { claimBasicSupplies } from "./supplies";

test("실제 DB: 기본 장비 지원은 빈 소지품·창고에서 한 번만 지급한다", async (t) => {
  const { db, user, character } = await integrationFixture(t);
  await claimBasicSupplies(db, user.id, character.id);
  assert.equal(
    await db.characterWeapon.count({ where: { characterId: character.id } }),
    1,
  );
  await assert.rejects(
    () => claimBasicSupplies(db, user.id, character.id),
    /existing equipment/,
  );
});

test("실제 DB: 탐사 중에는 구호 장비를 받을 수 없다", async (t) => {
  const { db, user, character } = await integrationFixture(t);
  await startRaid(db, user.id, character.id);
  await assert.rejects(
    () => claimBasicSupplies(db, user.id, character.id),
    /at the base/,
  );
});

test("실제 DB: 사망은 탐사를 종료하고 소지품을 소실시킨 뒤 재출격을 허용한다", async (t) => {
  const { db, user, character, weapon, monsterIds } =
    await integrationFixture(t);
  await db.character.update({
    where: { id: character.id },
    data: { hp: 1, maxHp: 150, stamina: 40, maxStamina: 120 },
  });
  await db.weaponMaster.update({
    where: { id: weapon.id },
    data: { damage: 10000 },
  });
  await db.raidInventoryItem.create({
    data: {
      characterId: character.id,
      weaponMasterId: weapon.id,
      slotIndex: 0,
      quantity: 2,
    },
  });
  const monster = await db.monsterMaster.create({
    data: {
      name: `Lethal-${randomUUID()}`,
      hp: 100,
      maxHp: 100,
      stamina: 100,
      maxStamina: 100,
      staminaRegen: 10,
      level: 999,
      weapons: { create: { weaponMasterId: weapon.id, slotIndex: 0 } },
    },
  });
  monsterIds.push(monster.id);
  const { raid } = await startRaid(db, user.id, character.id);
  const result = await fightRaidMonster(
    db,
    user.id,
    character.id,
    { raidId: raid.id, expectedVersion: raid.version, requestId: randomUUID() },
    999,
  );
  assert.equal(result.playerDied, true);
  assert.equal(result.raid.status, "DEAD");
  const saved = await db.character.findUniqueOrThrow({
    where: { id: character.id },
  });
  assert.equal(saved.activeRaidId, null);
  assert.equal(saved.isRaiding, false);
  assert.equal(saved.hp, 150);
  assert.equal(saved.stamina, 120);
  assert.equal(saved.weight, 0);
  assert.equal(
    await db.raidInventoryItem.count({ where: { characterId: character.id } }),
    0,
  );
  assert.equal(
    await db.characterWeapon.count({ where: { characterId: character.id } }),
    0,
  );
  await claimBasicSupplies(db, user.id, character.id);
  const next = await startRaid(db, user.id, character.id);
  assert.notEqual(next.raid.id, raid.id);
});

test("실제 DB: 탈출 정산 후 다시 조회해도 창고 수량과 상태가 유지된다", async (t) => {
  const { db, user, character, weapon } = await integrationFixture(t);
  await db.raidInventoryItem.create({
    data: {
      characterId: character.id,
      weaponMasterId: weapon.id,
      slotIndex: 0,
      quantity: 2,
    },
  });
  const { raid } = await startRaid(db, user.id, character.id);
  await extractRaid(db, user.id, character.id, {
    raidId: raid.id,
    expectedVersion: raid.version,
    requestId: randomUUID(),
  });
  await db.$disconnect();
  const restored = await db.character.findUniqueOrThrow({
    where: { id: character.id },
  });
  assert.equal(restored.isRaiding, false);
  assert.equal(
    (
      await db.stashItem.findFirstOrThrow({
        where: { userId: user.id, weaponMasterId: weapon.id },
      })
    ).quantity,
    2,
  );
});

test("실제 DB: 가방이 가득 차면 승리 보상을 추가하지 않는다", async (t) => {
  const { db, user, character, weapon, monsterIds } = await integrationFixture(
    t,
    500,
  );
  await db.weaponMaster.update({
    where: { id: weapon.id },
    data: { damage: 1000 },
  });
  await db.characterWeapon.create({
    data: {
      characterId: character.id,
      weaponMasterId: weapon.id,
      slotIndex: 0,
    },
  });
  await db.raidInventoryItem.createMany({
    data: Array.from({ length: 32 }, (_, slotIndex) => ({
      characterId: character.id,
      weaponMasterId: weapon.id,
      slotIndex,
      quantity: 1,
    })),
  });
  const monster = await db.monsterMaster.create({
    data: {
      name: `FullBag-${randomUUID()}`,
      hp: 4,
      maxHp: 4,
      stamina: 100,
      maxStamina: 100,
      staminaRegen: 0,
      level: 999,
    },
  });
  monsterIds.push(monster.id);
  const { raid } = await startRaid(db, user.id, character.id);
  const result = await fightRaidMonster(
    db,
    user.id,
    character.id,
    { raidId: raid.id, expectedVersion: raid.version, requestId: randomUUID() },
    999,
  );
  assert.equal(result.result.winnerTeamId, "TeamA");
  assert.equal(result.rewardItemName, null);
  assert.equal(
    await db.raidInventoryItem.count({ where: { characterId: character.id } }),
    32,
  );
});

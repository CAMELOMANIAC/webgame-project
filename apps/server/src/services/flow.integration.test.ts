import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { and, eq } from "drizzle-orm";
import {
  characters,
  characterWeapons,
  monsterMasters,
  monsterWeapons,
  raidInventoryItems,
  stashItems,
  weaponMasters,
} from "../db";
import { integrationFixture } from "../testing/integrationFixture";
import { extractRaid, fightRaidMonster, startRaid } from "./raid";

test("실제 DB: 사망은 탐사를 종료하고 소지품을 소실시킨 뒤 재출격을 허용한다", async (t) => {
  const { db, user, character, weapon, monsterIds } =
    await integrationFixture(t);
  await db
    .update(characters)
    .set({ hp: 1, maxHp: 150, stamina: 40, maxStamina: 120 })
    .where(eq(characters.id, character.id));
  await db
    .update(weaponMasters)
    .set({ damage: 10000 })
    .where(eq(weaponMasters.id, weapon.id));
  await db.insert(raidInventoryItems).values({
    characterId: character.id,
    weaponMasterId: weapon.id,
    slotIndex: 0,
    quantity: 2,
  });
  const [monster] = await db
    .insert(monsterMasters)
    .values({
      name: `Lethal-${randomUUID()}`,
      hp: 100,
      maxHp: 100,
      stamina: 100,
      maxStamina: 100,
      staminaRegen: 10,
      level: 999,
    })
    .returning();
  if (!monster) throw new Error("Failed to create test monster");
  await db.insert(monsterWeapons).values({
    monsterId: monster.id,
    weaponMasterId: weapon.id,
    slotIndex: 0,
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
  const saved = await db.query.characters.findFirst({
    where: eq(characters.id, character.id),
  });
  assert.equal(saved?.activeRaidId, null);
  assert.equal(saved?.isRaiding, false);
  assert.equal(saved?.hp, 150);
  assert.equal(saved?.stamina, 120);
  assert.equal(saved?.weight, 0);
  assert.equal(
    (
      await db.query.raidInventoryItems.findMany({
        where: eq(raidInventoryItems.characterId, character.id),
      })
    ).length,
    0,
  );
  assert.equal(
    (
      await db.query.characterWeapons.findMany({
        where: eq(characterWeapons.characterId, character.id),
      })
    ).length,
    0,
  );
  const next = await startRaid(db, user.id, character.id);
  assert.notEqual(next.raid.id, raid.id);
});

test("실제 DB: 탈출 정산 후 다시 조회해도 창고 수량과 상태가 유지된다", async (t) => {
  const { db, user, character, weapon } = await integrationFixture(t);
  await db.insert(raidInventoryItems).values({
    characterId: character.id,
    weaponMasterId: weapon.id,
    slotIndex: 0,
    quantity: 2,
  });
  const { raid } = await startRaid(db, user.id, character.id);
  await extractRaid(db, user.id, character.id, {
    raidId: raid.id,
    expectedVersion: raid.version,
    requestId: randomUUID(),
  });
  const restored = await db.query.characters.findFirst({
    where: eq(characters.id, character.id),
  });
  assert.equal(restored?.isRaiding, false);
  assert.equal(
    (
      await db.query.stashItems.findFirst({
        where: and(
          eq(stashItems.userId, user.id),
          eq(stashItems.weaponMasterId, weapon.id),
        ),
      })
    )?.quantity,
    2,
  );
});

test("실제 DB: 가방이 가득 차면 승리 보상을 추가하지 않는다", async (t) => {
  const { db, user, character, weapon, monsterIds } = await integrationFixture(
    t,
    500,
  );
  await db
    .update(weaponMasters)
    .set({ damage: 1000 })
    .where(eq(weaponMasters.id, weapon.id));
  await db.insert(characterWeapons).values({
    characterId: character.id,
    weaponMasterId: weapon.id,
    slotIndex: 0,
  });
  await db.insert(raidInventoryItems).values(
    Array.from({ length: 32 }, (_, slotIndex) => ({
      characterId: character.id,
      weaponMasterId: weapon.id,
      slotIndex,
      quantity: 1,
    })),
  );
  const [monster] = await db
    .insert(monsterMasters)
    .values({
      name: `FullBag-${randomUUID()}`,
      hp: 4,
      maxHp: 4,
      stamina: 100,
      maxStamina: 100,
      staminaRegen: 0,
      level: 999,
    })
    .returning();
  if (!monster) throw new Error("Failed to create test monster");
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
    (
      await db.query.raidInventoryItems.findMany({
        where: eq(raidInventoryItems.characterId, character.id),
      })
    ).length,
    32,
  );
});

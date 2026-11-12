import assert from "node:assert/strict";
import { test } from "node:test";
import { eq } from "drizzle-orm";
import { characters, raidInventoryItems, stashItems } from "../db";
import { integrationFixture as fixture } from "../testing/integrationFixture";
import {
  equipItem,
  InventoryError,
  moveStashItem,
  syncSlots,
} from "./inventory";

test("실제 DB: 슬롯 동기화는 묶음 수량과 무게를 보존한다", async (t) => {
  const { db, character, weapon, snapshot } = await fixture(t);
  await db.insert(raidInventoryItems).values({
    characterId: character.id,
    weaponMasterId: weapon.id,
    slotIndex: 0,
    quantity: 3,
  });
  const response = await syncSlots(db, character.id, {
    equipment: [{ weaponMasterId: weapon.id, slotIndex: 2 }],
    inventory: [{ weaponMasterId: weapon.id, slotIndex: 4, quantity: 2 }],
  });
  const saved = await snapshot();
  assert.equal(saved.equipment.length, 1);
  assert.equal(saved.inventory[0]?.quantity, 2);
  assert.equal(saved.character.weight, 6);
  assert.equal(response.weight, saved.character.weight);
  assert.equal(response.equipment[0]?.id, saved.equipment[0]?.id);
  assert.equal(response.inventory[0]?.id, saved.inventory[0]?.id);
  assert.equal(response.inventory[0]?.weaponMaster?.id, weapon.id);
});

test("실제 DB: 수량을 늘린 동기화 요청은 원본을 변경하지 않는다", async (t) => {
  const { db, character, weapon, snapshot } = await fixture(t);
  await db.insert(raidInventoryItems).values({
    characterId: character.id,
    weaponMasterId: weapon.id,
    slotIndex: 0,
    quantity: 3,
  });
  const before = await snapshot();
  await assert.rejects(
    () =>
      syncSlots(db, character.id, {
        equipment: [],
        inventory: [{ weaponMasterId: weapon.id, slotIndex: 0, quantity: 4 }],
      }),
    InventoryError,
  );
  assert.deepEqual(await snapshot(), before);
});

test("실제 DB: 장착·해제는 가방에서 한 개씩 이동한다", async (t) => {
  const { db, character, weapon, snapshot } = await fixture(t);
  await db.insert(raidInventoryItems).values({
    characterId: character.id,
    weaponMasterId: weapon.id,
    slotIndex: 0,
    quantity: 3,
  });
  await equipItem(db, character.id, {
    weaponMasterId: weapon.id,
    slotIndex: 0,
  });
  const equipped = await snapshot();
  assert.equal(equipped.equipment.length, 1);
  assert.equal(equipped.inventory[0]?.quantity, 2);
  assert.equal(equipped.character.weight, 6);
  await equipItem(db, character.id, { weaponMasterId: null, slotIndex: 0 });
  const unequipped = await snapshot();
  assert.equal(unequipped.equipment.length, 0);
  assert.equal(unequipped.inventory[0]?.quantity, 3);
});

test("실제 DB: 창고로 이동하면 묶음 전체 수량을 이관한다", async (t) => {
  const { db, user, character, weapon, snapshot } = await fixture(t);
  await db.insert(stashItems).values({
    userId: user.id,
    weaponMasterId: weapon.id,
    quantity: 2,
  });
  await db.insert(raidInventoryItems).values({
    characterId: character.id,
    weaponMasterId: weapon.id,
    slotIndex: 0,
    quantity: 3,
  });
  await moveStashItem(db, character.id, {
    direction: "to_stash",
    weaponMasterId: weapon.id,
    slotIndex: 0,
  });
  const saved = await snapshot();
  assert.equal(saved.inventory.length, 0);
  assert.equal(saved.stash[0]?.quantity, 5);
  assert.equal(saved.character.weight, 0);
});

test("실제 DB: 기존 창고 중복 행은 수량을 합쳐 보존한다", async (t) => {
  const { db, user, character, weapon, snapshot } = await fixture(t);
  await db.insert(stashItems).values(
    [2, 3].map((quantity) => ({
      userId: user.id,
      weaponMasterId: weapon.id,
      quantity,
    })),
  );
  const response = await moveStashItem(db, character.id, {
    direction: "to_backpack",
    weaponMasterId: weapon.id,
    slotIndex: 0,
  });
  const saved = await snapshot();
  assert.equal(saved.stash.length, 1);
  assert.equal(saved.stash[0]?.quantity, 4);
  assert.equal(saved.inventory[0]?.quantity, 1);
  assert.equal(response.stash[0]?.id, saved.stash[0]?.id);
  assert.equal(response.stash[0]?.quantity, 4);
  assert.equal(response.inventory[0]?.id, saved.inventory[0]?.id);
  assert.equal(response.weight, saved.character.weight);
});

test("실제 DB: 무게 초과 시 창고·가방 변경을 모두 원복한다", async (t) => {
  const { db, user, character, weapon, snapshot } = await fixture(t, 3);
  await db.insert(stashItems).values({
    userId: user.id,
    weaponMasterId: weapon.id,
    quantity: 2,
  });
  await moveStashItem(db, character.id, {
    direction: "to_backpack",
    weaponMasterId: weapon.id,
    slotIndex: 0,
  });
  const before = await snapshot();
  await assert.rejects(
    () =>
      moveStashItem(db, character.id, {
        direction: "to_backpack",
        weaponMasterId: weapon.id,
        slotIndex: 1,
      }),
    /weight/,
  );
  assert.deepEqual(await snapshot(), before);
});

test("실제 DB: 실패한 슬롯 재작성은 기존 슬롯과 ID를 복구한다", async (t) => {
  const { db, character, weapon, snapshot } = await fixture(t, 1);
  await db.insert(raidInventoryItems).values({
    characterId: character.id,
    weaponMasterId: weapon.id,
    slotIndex: 0,
    quantity: 1,
  });
  const before = await snapshot();
  await assert.rejects(
    () =>
      syncSlots(db, character.id, {
        equipment: [],
        inventory: [{ weaponMasterId: weapon.id, slotIndex: 2, quantity: 1 }],
      }),
    /weight/,
  );
  assert.deepEqual(await snapshot(), before);
});

test("실제 DB: 창고 마지막 한 개의 동시 이동은 하나만 성공한다", async (t) => {
  const { db, user, character, weapon, snapshot } = await fixture(t);
  await db.insert(stashItems).values({
    userId: user.id,
    weaponMasterId: weapon.id,
    quantity: 1,
  });
  const results = await Promise.allSettled(
    [0, 1].map((slotIndex) =>
      moveStashItem(db, character.id, {
        direction: "to_backpack",
        weaponMasterId: weapon.id,
        slotIndex,
      }),
    ),
  );
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  );
  const saved = await snapshot();
  assert.equal(
    saved.inventory.reduce((sum, item) => sum + item.quantity, 0),
    1,
  );
  assert.equal(saved.stash.length, 0);
});

test("실제 DB: 같은 가방 아이템의 동시 반환은 중복 지급하지 않는다", async (t) => {
  const { db, character, weapon, snapshot } = await fixture(t);
  await db.insert(raidInventoryItems).values({
    characterId: character.id,
    weaponMasterId: weapon.id,
    slotIndex: 0,
    quantity: 3,
  });
  const results = await Promise.allSettled(
    [0, 1].map(() =>
      moveStashItem(db, character.id, {
        direction: "to_stash",
        weaponMasterId: weapon.id,
        slotIndex: 0,
      }),
    ),
  );
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  );
  const saved = await snapshot();
  assert.equal(saved.inventory.length, 0);
  assert.equal(saved.stash[0]?.quantity, 3);
});

test("실제 DB: 탐사 중 창고 이동을 거부한다", async (t) => {
  const { db, user, character, weapon, snapshot } = await fixture(t);
  await db.insert(stashItems).values({
    userId: user.id,
    weaponMasterId: weapon.id,
    quantity: 1,
  });
  await db
    .update(characters)
    .set({ isRaiding: true })
    .where(eq(characters.id, character.id));
  const before = await snapshot();
  await assert.rejects(
    () =>
      moveStashItem(db, character.id, {
        direction: "to_backpack",
        weaponMasterId: weapon.id,
        slotIndex: 0,
      }),
    /raid/,
  );
  assert.deepEqual(await snapshot(), before);
});

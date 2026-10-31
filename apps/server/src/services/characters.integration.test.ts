import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { buildApp } from "../app";
import { integrationFixture } from "../testing/integrationFixture";
import { recruitDevelopmentCharacter, selectCharacter } from "./characters";
import { moveStashItem } from "./inventory";
import { extractRaid, startRaid } from "./raid";

test("실제 DB: 같은 인물·세계선의 두 개체는 체력과 장비·탐사 상태가 독립적이다", async (t) => {
  const { db, user, character, weapon } = await integrationFixture(t);
  const twin = await recruitDevelopmentCharacter(db, user.id, "legacy-origin");
  assert.notEqual(twin.id, character.id);
  assert.equal(twin.variantId, character.variantId);
  await db.character.update({ where: { id: character.id }, data: { hp: 37 } });
  await db.characterWeapon.create({
    data: {
      characterId: character.id,
      weaponMasterId: weapon.id,
      slotIndex: 0,
    },
  });
  await selectCharacter(db, user.id, twin.id);
  const { raid } = await startRaid(db, user.id, twin.id);
  assert.equal(
    (await db.character.findUniqueOrThrow({ where: { id: character.id } })).hp,
    37,
  );
  assert.equal(
    await db.characterWeapon.count({ where: { characterId: twin.id } }),
    0,
  );
  assert.equal(
    await db.raidSession.count({ where: { characterId: character.id } }),
    0,
  );
  assert.equal(raid.status, "ACTIVE");
  await assert.rejects(
    () => selectCharacter(db, user.id, character.id),
    /active raid/,
  );
  await assert.rejects(
    () => startRaid(db, user.id, character.id),
    /already in a raid/,
  );
  await assert.rejects(
    () =>
      moveStashItem(db, character.id, {
        direction: "to_backpack",
        weaponMasterId: weapon.id,
        slotIndex: 0,
      }),
    /during a raid/,
  );
  await extractRaid(db, user.id, twin.id, {
    raidId: raid.id,
    expectedVersion: raid.version,
    requestId: randomUUID(),
  });
  await selectCharacter(db, user.id, character.id);
  assert.equal(
    (await db.user.findUniqueOrThrow({ where: { id: user.id } }))
      .selectedCharacterId,
    character.id,
  );
});

test("실제 DB: 캐릭터 선택·추가와 다른 사용자 조회를 API에서 검증한다", async (t) => {
  const { db, user, character } = await integrationFixture(t);
  const other = await db.user.create({
    data: { email: `${randomUUID()}@example.test`, nickname: "Other" },
  });
  t.after(() => db.user.delete({ where: { id: other.id } }));
  const app = buildApp({ database: db, logger: false });
  t.after(() => app.close());
  const headers = { "x-dev-user-id": user.id };
  const roster = await app.inject({
    method: "GET",
    url: `/user/${user.id}/characters`,
    headers,
  });
  assert.equal(roster.json().selectedCharacterId, character.id);
  const details = await app.inject({
    method: "GET",
    url: `/character/${character.id}`,
    headers,
  });
  assert.equal(details.statusCode, 200);
  assert.equal(details.json().variant.definition.id, "legacy-survivor");
  assert.equal(details.json().user.email, undefined);
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: `/user/${other.id}/characters/${character.id}/select`,
        headers,
      })
    ).statusCode,
    403,
  );
  assert.equal(
    (
      await app.inject({
        method: "GET",
        url: `/character/${character.id}`,
        headers: { "x-dev-user-id": other.id },
      })
    ).statusCode,
    403,
  );
});

test("실제 DB: 개체 선택과 다른 개체 출격이 경쟁해도 선택·활성 탐사가 일치한다", async (t) => {
  const { db, user, character } = await integrationFixture(t);
  const twin = await recruitDevelopmentCharacter(
    db,
    user.id,
    "dev-survivor-beta",
  );
  await selectCharacter(db, user.id, character.id);
  const results = await Promise.allSettled([
    startRaid(db, user.id, character.id),
    selectCharacter(db, user.id, twin.id),
  ]);
  assert.ok(results.some((result) => result.status === "fulfilled"));
  const active = await db.character.findMany({
    where: { userId: user.id, isRaiding: true },
  });
  assert.ok(active.length <= 1);
  if (active[0])
    assert.equal(
      (await db.user.findUniqueOrThrow({ where: { id: user.id } }))
        .selectedCharacterId,
      active[0].id,
    );
});

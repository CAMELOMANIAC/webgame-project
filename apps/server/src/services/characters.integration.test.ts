import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { and, eq } from "drizzle-orm";
import { buildApp } from "../app";
import {
  characters,
  characterWeapons,
  raidSessions,
  users,
} from "../db";
import { integrationFixture } from "../testing/integrationFixture";
import { recruitDevelopmentCharacter, selectCharacter } from "./characters";
import { moveStashItem } from "./inventory";
import { extractRaid, startRaid } from "./raid";

test("실제 DB: 같은 변주의 두 개체는 체력과 장비·탐사 상태가 독립적이다", async (t) => {
  const { db, user, character, weapon } = await integrationFixture(t);
  const twin = await recruitDevelopmentCharacter(db, user.id, "legacy-origin");
  assert.notEqual(twin.id, character.id);
  assert.equal(twin.variantId, character.variantId);
  await db
    .update(characters)
    .set({ hp: 37 })
    .where(eq(characters.id, character.id));
  await db.insert(characterWeapons).values({
    characterId: character.id,
    weaponMasterId: weapon.id,
    slotIndex: 0,
  });
  await selectCharacter(db, user.id, twin.id);
  const { raid } = await startRaid(db, user.id, twin.id);
  assert.equal(
    (
      await db.query.characters.findFirst({
        where: eq(characters.id, character.id),
      })
    )?.hp,
    37,
  );
  assert.equal(
    (
      await db.query.characterWeapons.findMany({
        where: eq(characterWeapons.characterId, twin.id),
      })
    ).length,
    0,
  );
  assert.equal(
    (
      await db.query.raidSessions.findMany({
        where: eq(raidSessions.characterId, character.id),
      })
    ).length,
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
    (await db.query.users.findFirst({ where: eq(users.id, user.id) }))
      ?.selectedCharacterId,
    character.id,
  );
});

test("실제 DB: 캐릭터 선택·추가와 다른 사용자 조회를 API에서 검증한다", async (t) => {
  const { db, user, character } = await integrationFixture(t);
  const [other] = await db
    .insert(users)
    .values({
      email: `${randomUUID()}@example.test`,
      nickname: "Other",
    })
    .returning();
  if (!other) throw new Error("Failed to create other user");
  t.after(() => db.delete(users).where(eq(users.id, other.id)));
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

test("실제 DB: 개체 선택과 다른 개체 배치가 경쟁해도 선택·활성 탐사가 일치한다", async (t) => {
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
  const active = await db.query.characters.findMany({
    where: and(eq(characters.userId, user.id), eq(characters.isRaiding, true)),
  });
  assert.ok(active.length <= 1);
  if (active[0])
    assert.equal(
      (await db.query.users.findFirst({ where: eq(users.id, user.id) }))
        ?.selectedCharacterId,
      active[0].id,
    );
});

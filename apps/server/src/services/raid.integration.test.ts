import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { eq } from "drizzle-orm";
import mapData from "../../../../packages/types/src/assets/map_graph.json";
import { buildApp } from "../app";
import {
  characters,
  characterWeapons,
  monsterMasters,
  monsterWeapons,
  raidCommands,
  raidInventoryItems,
  raidSessions,
  stashItems,
  weaponMasters,
} from "../db";
import { integrationFixture } from "../testing/integrationFixture";
import { extractRaid, fightRaidMonster, navigateRaid, startRaid } from "./raid";

function command(raid: { id: string; version: number }) {
  return {
    raidId: raid.id,
    expectedVersion: raid.version,
    requestId: randomUUID(),
  };
}

const firstEdge = mapData.edges.find(
  (edge) => edge.source === 0 || edge.target === 0,
);
if (!firstEdge) throw new Error("Test map needs an edge from node zero");
const nextNode = firstEdge.source === 0 ? firstEdge.target : firstEdge.source;

test("실제 DB: 활성 세션이 없는 탐사 상태만 거점으로 복구한다", async (t) => {
  const { db, user, character, snapshot } = await integrationFixture(t);
  const app = buildApp({ database: db, logger: false });
  t.after(() => app.close());
  const recover = () =>
    app.inject({
      method: "POST",
      url: `/character/${character.id}/raid/recover`,
      headers: { "x-dev-user-id": user.id },
    });

  await db
    .update(characters)
    .set({ isRaiding: true, currentNodeId: nextNode, time: 4, hp: 10 })
    .where(eq(characters.id, character.id));
  assert.equal((await recover()).statusCode, 204);
  const { character: recovered } = await snapshot();
  assert.equal(recovered.isRaiding, false);
  assert.equal(recovered.activeRaidId, null);
  assert.equal(recovered.currentNodeId, 0);
  assert.equal(recovered.time, 0);
  assert.equal(recovered.hp, 10);

  const { raid } = await startRaid(db, user.id, character.id);
  assert.equal((await recover()).statusCode, 204);
  assert.equal((await snapshot()).character.activeRaidId, raid.id);

  await db
    .update(characters)
    .set({ activeRaidId: null })
    .where(eq(characters.id, character.id));
  assert.equal((await recover()).statusCode, 204);
  assert.equal((await snapshot()).character.isRaiding, true);
});

test("실제 DB: 중복 배치는 같은 탐사를 반환하고 체력을 초기화하지 않는다", async (t) => {
  const { db, user, character } = await integrationFixture(t);
  await db
    .update(characters)
    .set({ hp: 37, stamina: 42 })
    .where(eq(characters.id, character.id));
  const [first, second] = await Promise.all([
    startRaid(db, user.id, character.id),
    startRaid(db, user.id, character.id),
  ]);
  assert.equal(first.raid.id, second.raid.id);
  assert.equal(
    (
      await db.query.raidSessions.findMany({
        where: eq(raidSessions.characterId, character.id),
      })
    ).length,
    1,
  );
  const saved = await db.query.characters.findFirst({
    where: eq(characters.id, character.id),
  });
  assert.equal(saved?.hp, 37);
  assert.equal(saved?.stamina, 42);
});

test("실제 DB: 같은 이동 요청은 위치·버전을 한 번만 변경한다", async (t) => {
  const { db, user, character } = await integrationFixture(t);
  const { raid } = await startRaid(db, user.id, character.id);
  const input = { ...command(raid), path: [0, nextNode] };
  const first = await navigateRaid(
    db,
    user.id,
    character.id,
    input,
  );
  const again = await navigateRaid(db, user.id, character.id, input);
  assert.deepEqual(again, first);
  const saved = await db.query.raidSessions.findFirst({
    where: eq(raidSessions.id, raid.id),
  });
  assert.equal(saved?.version, 1);
  assert.equal(saved?.currentNodeId, nextNode);
  assert.equal(
    (
      await db.query.raidCommands.findMany({
        where: eq(raidCommands.raidId, raid.id),
      })
    ).length,
    1,
  );
  await assert.rejects(
    () =>
      navigateRaid(db, user.id, character.id, {
        ...input,
        path: [nextNode, 0],
      }),
    /different action/,
  );
  await assert.rejects(
    () =>
      navigateRaid(db, user.id, character.id, {
        ...command(raid),
        path: [nextNode, 0],
      }),
    /state changed/,
  );
});

test("실제 DB: 다른 사용자와 다른 출발 위치를 거부한다", async (t) => {
  const { db, user, character } = await integrationFixture(t);
  await assert.rejects(() => startRaid(db, randomUUID(), character.id), /own/);
  const { raid } = await startRaid(db, user.id, character.id);
  await assert.rejects(
    () =>
      navigateRaid(db, user.id, character.id, {
        ...command(raid),
        path: [nextNode, 0],
      }),
    /start at/,
  );
  const saved = await db.query.raidSessions.findFirst({
    where: eq(raidSessions.id, raid.id),
  });
  assert.equal(saved?.version, 0);
  assert.equal(saved?.currentNodeId, 0);
});

test("실제 DB: 중복 탈출 요청은 보상을 한 번만 이관한다", async (t) => {
  const { db, user, character, weapon } = await integrationFixture(t);
  await db.insert(raidInventoryItems).values({
    characterId: character.id,
    weaponMasterId: weapon.id,
    slotIndex: 0,
    quantity: 3,
  });
  const { raid } = await startRaid(db, user.id, character.id);
  const input = command(raid);
  const first = await extractRaid(db, user.id, character.id, input);
  assert.deepEqual(await extractRaid(db, user.id, character.id, input), first);
  assert.equal(
    (
      await db.query.stashItems.findFirst({
        where: eq(stashItems.userId, user.id),
      })
    )?.quantity,
    3,
  );
  assert.equal(
    (
      await db.query.raidInventoryItems.findMany({
        where: eq(raidInventoryItems.characterId, character.id),
      })
    ).length,
    0,
  );
  const saved = await db.query.characters.findFirst({
    where: eq(characters.id, character.id),
  });
  assert.equal(saved?.activeRaidId, null);
  assert.equal(saved?.isRaiding, false);
  await assert.rejects(
    () =>
      extractRaid(db, user.id, character.id, {
        ...input,
        requestId: randomUUID(),
      }),
    /not active/,
  );
});

test("실제 DB: 동일 전투 요청의 재시도는 추가 보상을 만들지 않는다", async (t) => {
  const { db, user, character, weapon, monsterIds } =
    await integrationFixture(t);
  await db
    .update(characters)
    .set({ hp: 1000, maxHp: 1000 })
    .where(eq(characters.id, character.id));
  await db
    .update(weaponMasters)
    .set({ damage: 100 })
    .where(eq(weaponMasters.id, weapon.id));
  await db.insert(characterWeapons).values({
    characterId: character.id,
    weaponMasterId: weapon.id,
    slotIndex: 0,
  });
  const [monster] = await db
    .insert(monsterMasters)
    .values({
      name: `RaidTest-${randomUUID()}`,
      hp: 4,
      maxHp: 4,
      stamina: 100,
      maxStamina: 100,
      staminaRegen: 0,
    })
    .returning();
  if (!monster) throw new Error("Failed to create test monster");
  monsterIds.push(monster.id);
  await db.insert(monsterWeapons).values({
    monsterId: monster.id,
    weaponMasterId: weapon.id,
    slotIndex: 0,
  });
  const { raid } = await startRaid(db, user.id, character.id);
  const input = command(raid);
  const first = await fightRaidMonster(db, user.id, character.id, input);
  assert.equal(first.playerDied, false);
  assert.deepEqual(
    await fightRaidMonster(db, user.id, character.id, input),
    first,
  );
  assert.equal(
    (
      await db.query.raidInventoryItems.findMany({
        where: eq(raidInventoryItems.characterId, character.id),
      })
    ).length,
    1,
  );
  assert.equal(
    (
      await db.query.raidCommands.findMany({
        where: eq(raidCommands.raidId, raid.id),
      })
    ).length,
    1,
  );
});

test("실제 DB: API 계정 선택과 소유권 검증을 적용한다", async (t) => {
  const { db, user, character } = await integrationFixture(t);
  const app = buildApp({ database: db, logger: false });
  t.after(() => app.close());
  const usersResp = await app.inject({ method: "GET", url: "/dev/users" });
  assert.ok(
    usersResp.json().some((entry: { id: string }) => entry.id === user.id),
  );
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: `/character/${character.id}/raid/start`,
      })
    ).statusCode,
    401,
  );
  const response = await app.inject({
    method: "POST",
    url: `/character/${character.id}/raid/start`,
    headers: { "x-dev-user-id": user.id },
  });
  assert.equal(response.statusCode, 200);
  const disabled = await app.inject({
    method: "PATCH",
    url: `/character/${character.id}/raid/status`,
    headers: { "x-dev-user-id": user.id },
    payload: { isRaiding: false },
  });
  assert.equal(disabled.statusCode, 405);
});

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { buildApp } from "../app";
import { firstMission } from "../logic/story";
import { integrationFixture } from "../testing/integrationFixture";
import { pathToNode } from "../testing/mapRoute";
import { acceptFirstMission, journalView, reportFirstMission } from "./quests";
import { extractRaid, fightRaidMonster, navigateRaid, startRaid } from "./raid";

function command(raid: { id: string; version: number }) {
  return {
    raidId: raid.id,
    expectedVersion: raid.version,
    requestId: randomUUID(),
  };
}

test("실제 DB: 임무 수락·회수·탈출·보고는 재시도해도 지원과 보상을 한 번씩 지급한다", async (t) => {
  const { db, user, character, weapon } = await integrationFixture(t);
  await db.character.update({
    where: { id: character.id },
    data: { hp: 1000, maxHp: 1000 },
  });
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
  assert.equal((await journalView(db, user.id)).mission.status, "OFFERED");
  const accepts = await Promise.all([
    acceptFirstMission(db, user.id),
    acceptFirstMission(db, user.id),
  ]);
  assert.equal(accepts[0]?.mission.status, "ACTIVE");
  const supply = () =>
    db.stashItem.findFirstOrThrow({
      where: { userId: user.id, weaponMasterId: firstMission.supplyWeaponId },
    });
  assert.equal((await supply()).quantity, 1);
  await assert.rejects(
    () => reportFirstMission(db, user.id),
    /Recover the record/,
  );
  const { raid } = await startRaid(db, user.id, character.id);
  await assert.rejects(() => reportFirstMission(db, user.id), /active raid/);
  const path = pathToNode(firstMission.targetNodeId);
  const input = { ...command(raid), path };
  const result = await navigateRaid(
    db,
    user.id,
    character.id,
    input,
    () => 0.99,
  );
  assert.equal(result.stopNodeId, firstMission.targetNodeId);
  assert.equal(result.battleLog?.encounter?.faction, "한림그룹");
  assert.equal((await journalView(db, user.id)).mission.status, "RECOVERED");
  assert.deepEqual(
    await navigateRaid(db, user.id, character.id, input),
    result,
  );
  const back = await navigateRaid(
    db,
    user.id,
    character.id,
    {
      ...command({ id: raid.id, version: result.raid.version }),
      path: [...path].reverse(),
    },
    () => 0.99,
  );
  await extractRaid(
    db,
    user.id,
    character.id,
    command({ id: raid.id, version: back.raid.version }),
  );
  assert.equal((await journalView(db, user.id)).mission.status, "READY");
  await db.$disconnect();
  const reports = await Promise.all([
    reportFirstMission(db, user.id),
    reportFirstMission(db, user.id),
  ]);
  assert.equal(reports[0]?.mission.status, "COMPLETE");
  assert.equal((await supply()).quantity, 2);
  assert.equal((await journalView(db, user.id)).records.length, 1);
  await acceptFirstMission(db, user.id);
  assert.equal((await supply()).quantity, 2);
  assert.equal(await db.questProgress.count({ where: { userId: user.id } }), 1);
});

test("실제 DB: 기록을 확보한 탐사에서 사망하면 다시 회수해야 한다", async (t) => {
  const { db, user, character, weapon, monsterIds } =
    await integrationFixture(t);
  await db.character.update({
    where: { id: character.id },
    data: { hp: 1000, maxHp: 1000 },
  });
  await db.weaponMaster.update({
    where: { id: weapon.id },
    data: { damage: 10000 },
  });
  await db.characterWeapon.create({
    data: {
      characterId: character.id,
      weaponMasterId: weapon.id,
      slotIndex: 0,
    },
  });
  await acceptFirstMission(db, user.id);
  const { raid } = await startRaid(db, user.id, character.id);
  const result = await navigateRaid(
    db,
    user.id,
    character.id,
    { ...command(raid), path: pathToNode(firstMission.targetNodeId) },
    () => 0.99,
  );
  assert.equal((await journalView(db, user.id)).mission.status, "RECOVERED");
  await db.character.update({ where: { id: character.id }, data: { hp: 1 } });
  const enemy = await db.monsterMaster.create({
    data: {
      name: "임무 패배 검증",
      hp: 100000,
      maxHp: 100000,
      stamina: 100,
      maxStamina: 100,
      staminaRegen: 10,
      level: 999,
      weapons: { create: { weaponMasterId: weapon.id, slotIndex: 0 } },
    },
  });
  monsterIds.push(enemy.id);
  const death = await fightRaidMonster(
    db,
    user.id,
    character.id,
    command({ id: raid.id, version: result.raid.version }),
    999,
  );
  assert.equal(death.playerDied, true);
  assert.equal((await journalView(db, user.id)).mission.status, "ACTIVE");
  await assert.rejects(
    () => reportFirstMission(db, user.id),
    /Recover the record/,
  );
});

test("실제 DB: 미공개 인물은 응답에서 숨기고 단일 인물·복수 개체 공개 단계를 구분한다", async (t) => {
  const { db, user } = await integrationFixture(t);
  const app = buildApp({ database: db, logger: false });
  t.after(() => app.close());
  const headers = { "x-dev-user-id": user.id };
  const read = () =>
    app.inject({ method: "GET", url: `/user/${user.id}/journal`, headers });
  const first = await read();
  assert.equal(first.statusCode, 200);
  assert.doesNotMatch(
    first.body,
    /owner-instance|executive-contact|경영 책임자/,
  );
  await db.user.update({ where: { id: user.id }, data: { storyTier: 2 } });
  const middle = await read();
  assert.equal(
    middle
      .json()
      .contacts.filter((contact: { id: string }) =>
        contact.id.startsWith("executive"),
      ).length,
    1,
  );
  assert.doesNotMatch(middle.body, /owner-instance/);
  await db.user.update({ where: { id: user.id }, data: { storyTier: 3 } });
  const late = await read();
  const identities = late
    .json()
    .contacts.filter((contact: { entityId?: string }) => contact.entityId)
    .map((contact: { entityId: string }) => contact.entityId);
  assert.equal(new Set(identities).size, 2);
  assert.equal(
    (
      await app.inject({
        method: "GET",
        url: "/user/someone-else/journal",
        headers,
      })
    ).statusCode,
    403,
  );
});

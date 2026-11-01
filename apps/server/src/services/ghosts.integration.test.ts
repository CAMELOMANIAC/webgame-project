import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { and, eq } from "drizzle-orm";
import mapData from "../../../../packages/types/src/assets/map_graph.json";
import { buildApp } from "../app";
import {
  characters,
  characterWeapons,
  ghostSnapshots,
  raidGhostEncounters,
  raidInventoryItems,
  stashItems,
  weaponMasters,
} from "../db";
import { gameRules } from "../logic/rules";
import { integrationFixture } from "../testing/integrationFixture";
import { nearestBuildingPath } from "../testing/mapRoute";
import { matchGhost } from "./ghosts";
import { extractRaid, navigateRaid, startRaid } from "./raid";

test("실제 DB: 위치·라운드 기록은 서버 장비를 복사하고 재시도해도 한 번만 남는다", async (t) => {
  const { db, user, character, weapon } = await integrationFixture(t);
  const other = await integrationFixture(t);
  await db.insert(characterWeapons).values({
    characterId: character.id,
    weaponMasterId: weapon.id,
    slotIndex: 0,
  });
  const { raid } = await startRaid(db, user.id, character.id);
  await startRaid(db, user.id, character.id);
  assert.equal(
    (
      await db.query.ghostSnapshots.findMany({
        where: eq(ghostSnapshots.raidId, raid.id),
      })
    ).length,
    1,
  );
  const edge = mapData.edges.find(
    (edge) => edge.source === 0 || edge.target === 0,
  )!;
  const node = edge.source === 0 ? edge.target : edge.source;
  const input = {
    raidId: raid.id,
    expectedVersion: 0,
    requestId: randomUUID(),
    path: [0, node],
  };
  await navigateRaid(db, user.id, character.id, input, () => 0.99);
  await navigateRaid(db, user.id, character.id, input, () => 0.99);
  assert.equal(
    (
      await db.query.ghostSnapshots.findMany({
        where: eq(ghostSnapshots.raidId, raid.id),
      })
    ).length,
    2,
  );
  await db
    .update(weaponMasters)
    .set({ damage: 9999 })
    .where(eq(weaponMasters.id, weapon.id));
  const match = await matchGhost(db, other.user.id, node, 1);
  assert.equal(match?.source.characterId, character.id);
  assert.equal(match?.round, 1);
  assert.equal(match?.combatant.weapons[0]?.damage, 1);
  assert.equal(await matchGhost(db, user.id, node, 1), null);
});

for (const lethal of [false, true])
  test(`실제 DB: 고스트 ${lethal ? "패배·사망" : "승리·탈출"}를 중복 없이 정산하고 원본 개체는 변경하지 않는다`, async (t) => {
    const player = await integrationFixture(t);
    const source = await integrationFixture(t);
    const path = nearestBuildingPath();
    const node = path.at(-1)!;
    await source.db
      .update(weaponMasters)
      .set({ damage: lethal ? 10000 : 1 })
      .where(eq(weaponMasters.id, source.weapon.id));
    await source.db.insert(characterWeapons).values({
      characterId: source.character.id,
      weaponMasterId: source.weapon.id,
      slotIndex: 0,
    });
    await source.db
      .update(characters)
      .set({ displayName: "같은 이름" })
      .where(eq(characters.id, source.character.id));
    const sourceRaid = (
      await startRaid(source.db, source.user.id, source.character.id)
    ).raid;
    await navigateRaid(
      source.db,
      source.user.id,
      source.character.id,
      {
        raidId: sourceRaid.id,
        expectedVersion: 0,
        requestId: randomUUID(),
        path,
      },
      () => 0.99,
    );
    await player.db
      .update(characters)
      .set({ hp: lethal ? 1 : 1000, maxHp: 1000, displayName: "같은 이름" })
      .where(eq(characters.id, player.character.id));
    if (!lethal) {
      await player.db
        .update(weaponMasters)
        .set({ damage: 1000 })
        .where(eq(weaponMasters.id, player.weapon.id));
      await player.db.insert(characterWeapons).values({
        characterId: player.character.id,
        weaponMasterId: player.weapon.id,
        slotIndex: 0,
      });
    }
    const raid = (
      await startRaid(player.db, player.user.id, player.character.id)
    ).raid;
    const command = {
      raidId: raid.id,
      expectedVersion: 0,
      requestId: randomUUID(),
      path,
    };
    const result = await navigateRaid(
      player.db,
      player.user.id,
      player.character.id,
      command,
      () => 0,
    );
    assert.equal(result.battleLog?.encounter?.kind, "GHOST");
    assert.equal(
      result.battleLog?.encounter?.sourceCharacterId,
      source.character.id,
    );
    assert.equal(result.battleLog?.playerDied, lethal);
    assert.deepEqual(
      await navigateRaid(
        player.db,
        player.user.id,
        player.character.id,
        command,
        () => 0,
      ),
      result,
    );
    assert.equal(
      (
        await player.db.query.raidGhostEncounters.findMany({
          where: eq(raidGhostEncounters.raidId, raid.id),
        })
      ).length,
      1,
    );
    assert.equal(
      await matchGhost(
        player.db,
        player.user.id,
        node,
        path.length - 1,
        new Date(),
        raid.id,
      ),
      null,
    );
    assert.equal(
      (
        await source.db.query.characters.findFirst({
          where: eq(characters.id, source.character.id),
        })
      )?.hp,
      100,
    );
    assert.equal(
      (
        await source.db.query.raidInventoryItems.findMany({
          where: eq(raidInventoryItems.characterId, source.character.id),
        })
      ).length,
      0,
    );
    if (lethal) {
      assert.equal(result.raid.status, "DEAD");
      assert.equal((await player.snapshot()).character.hp, 1000);
    } else {
      assert.equal(
        (
          await player.db.query.raidInventoryItems.findMany({
            where: eq(raidInventoryItems.characterId, player.character.id),
          })
        ).length,
        1,
      );
      const back = await navigateRaid(
        player.db,
        player.user.id,
        player.character.id,
        {
          raidId: raid.id,
          expectedVersion: result.raid.version,
          requestId: randomUUID(),
          path: [...path].reverse(),
        },
        () => 0.99,
      );
      await extractRaid(player.db, player.user.id, player.character.id, {
        raidId: raid.id,
        expectedVersion: back.raid.version,
        requestId: randomUUID(),
      });
      assert.equal(
        (
          await player.db.query.stashItems.findFirst({
            where: and(
              eq(stashItems.userId, player.user.id),
              eq(stashItems.weaponMasterId, source.weapon.id),
            ),
          })
        )?.quantity,
        1,
      );
    }
  });

test("실제 DB: 허용 라운드 밖·만료·이전 규칙·다른 위치의 기록은 매칭되지 않는다", async (t) => {
  const { db, user, character } = await integrationFixture(t);
  const other = await integrationFixture(t);
  const { raid } = await startRaid(db, user.id, character.id);
  const where = and(
    eq(ghostSnapshots.raidId, raid.id),
    eq(ghostSnapshots.round, 0),
    eq(ghostSnapshots.nodeId, "0"),
  );
  assert.ok(
    await matchGhost(db, other.user.id, 0, gameRules.ghost.roundTolerance),
  );
  assert.equal(
    await matchGhost(db, other.user.id, 0, gameRules.ghost.roundTolerance + 1),
    null,
  );
  assert.equal(await matchGhost(db, other.user.id, 999, 0), null);
  await db
    .update(ghostSnapshots)
    .set({ rulesVersion: 0 })
    .where(where);
  assert.equal(await matchGhost(db, other.user.id, 0, 0), null);
  await db
    .update(ghostSnapshots)
    .set({
      rulesVersion: gameRules.ghost.rulesVersion,
      createdAt: new Date(Date.now() - 8 * 86400000),
    })
    .where(where);
  assert.equal(await matchGhost(db, other.user.id, 0, 0), null);
});

test("실제 DB: 임의 능력치 저장과 day 입력을 거부하고 개인정보 없이 기록을 반환한다", async (t) => {
  const { db, user, character } = await integrationFixture(t);
  const other = await integrationFixture(t);
  await startRaid(db, user.id, character.id);
  const app = buildApp({ database: db, logger: false });
  t.after(() => app.close());
  const headers = { "x-dev-user-id": other.user.id };
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: "/ghost/snapshot",
        headers,
        payload: { userId: other.user.id, hp: 999999 },
      })
    ).statusCode,
    405,
  );
  assert.equal(
    (
      await app.inject({
        method: "GET",
        url: "/ghost/match?nodeId=0&day=0",
        headers,
      })
    ).statusCode,
    400,
  );
  const result = await app.inject({
    method: "GET",
    url: "/ghost/match?nodeId=0&round=0",
    headers,
  });
  assert.equal(result.statusCode, 200);
  assert.equal(result.json().user, undefined);
  assert.equal(result.json().source.characterId, character.id);
});

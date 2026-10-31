import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { buildApp } from "../app";
import mapData from "../../../../packages/types/src/assets/map_graph.json";
import { gameRules } from "../logic/rules";
import { integrationFixture } from "../testing/integrationFixture";
import { matchGhost } from "./ghosts";
import { extractRaid, navigateRaid, startRaid } from "./raid";
import { nearestBuildingPath } from "../testing/mapRoute";

test("실제 DB: 위치·라운드 기록은 서버 장비를 복사하고 재시도해도 한 번만 남는다", async (t) => {
  const { db, user, character, weapon } = await integrationFixture(t);
  const other = await integrationFixture(t);
  await db.characterWeapon.create({
    data: {
      characterId: character.id,
      weaponMasterId: weapon.id,
      slotIndex: 0,
    },
  });
  const { raid } = await startRaid(db, user.id, character.id);
  await startRaid(db, user.id, character.id);
  assert.equal(await db.ghostSnapshot.count({ where: { raidId: raid.id } }), 1);
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
  assert.equal(await db.ghostSnapshot.count({ where: { raidId: raid.id } }), 2);
  await db.weaponMaster.update({
    where: { id: weapon.id },
    data: { damage: 9999 },
  });
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
    await source.db.weaponMaster.update({
      where: { id: source.weapon.id },
      data: { damage: lethal ? 10000 : 1 },
    });
    await source.db.characterWeapon.create({
      data: {
        characterId: source.character.id,
        weaponMasterId: source.weapon.id,
        slotIndex: 0,
      },
    });
    await source.db.character.update({
      where: { id: source.character.id },
      data: { displayName: "같은 이름" },
    });
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
    await player.db.character.update({
      where: { id: player.character.id },
      data: { hp: lethal ? 1 : 1000, maxHp: 1000, displayName: "같은 이름" },
    });
    if (!lethal) {
      await player.db.weaponMaster.update({
        where: { id: player.weapon.id },
        data: { damage: 1000 },
      });
      await player.db.characterWeapon.create({
        data: {
          characterId: player.character.id,
          weaponMasterId: player.weapon.id,
          slotIndex: 0,
        },
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
      await player.db.raidGhostEncounter.count({ where: { raidId: raid.id } }),
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
        await source.db.character.findUniqueOrThrow({
          where: { id: source.character.id },
        })
      ).hp,
      100,
    );
    assert.equal(
      await source.db.raidInventoryItem.count({
        where: { characterId: source.character.id },
      }),
      0,
    );
    if (lethal) {
      assert.equal(result.raid.status, "DEAD");
      assert.equal((await player.snapshot()).character.hp, 1000);
    } else {
      assert.equal(
        await player.db.raidInventoryItem.count({
          where: { characterId: player.character.id },
        }),
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
          await player.db.stashItem.findFirstOrThrow({
            where: { userId: player.user.id, weaponMasterId: source.weapon.id },
          })
        ).quantity,
        1,
      );
    }
  });

test("실제 DB: 허용 라운드 밖·만료·이전 규칙·다른 위치의 기록은 매칭되지 않는다", async (t) => {
  const { db, user, character } = await integrationFixture(t);
  const other = await integrationFixture(t);
  const { raid } = await startRaid(db, user.id, character.id);
  const where = {
    raidId_round_nodeId: { raidId: raid.id, round: 0, nodeId: "0" },
  };
  assert.ok(
    await matchGhost(db, other.user.id, 0, gameRules.ghost.roundTolerance),
  );
  assert.equal(
    await matchGhost(db, other.user.id, 0, gameRules.ghost.roundTolerance + 1),
    null,
  );
  assert.equal(await matchGhost(db, other.user.id, 999, 0), null);
  await db.ghostSnapshot.update({ where, data: { rulesVersion: 0 } });
  assert.equal(await matchGhost(db, other.user.id, 0, 0), null);
  await db.ghostSnapshot.update({
    where,
    data: {
      rulesVersion: gameRules.ghost.rulesVersion,
      createdAt: new Date(Date.now() - 8 * 86400000),
    },
  });
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

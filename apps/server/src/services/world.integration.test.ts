import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { firstMissionNodeId } from "@webgame/types";
import { eq } from "drizzle-orm";
import {
  characters,
  characterWeapons,
  raidSessions,
  weaponMasters,
} from "../db";
import { integrationFixture } from "../testing/integrationFixture";
import { pathToNode } from "../testing/mapRoute";
import { recordGhosts } from "./ghosts";
import { navigateRaid, startRaid } from "./raid";

test("실제 DB: 임무를 수락하지 않은 개체는 중계 시설에서 통제 요원과 자동 조우하지 않는다", async (t) => {
  const { db, user, character } = await integrationFixture(t);
  const { raid } = await startRaid(db, user.id, character.id);
  const path = pathToNode(firstMissionNodeId);
  const result = await navigateRaid(db, user.id, character.id, {
    raidId: raid.id,
    expectedVersion: 0,
    requestId: randomUUID(),
    path,
  });
  assert.equal(result.encounterTriggered, false);
  assert.equal(result.raid.currentNodeId, firstMissionNodeId);
  assert.equal(result.raid.round, path.length - 1);
});

test("실제 DB: 같은 라운드의 역방향 이동과 조우하고 다음 이동에서 빈자리만 보충한다", async (t) => {
  const player = await integrationFixture(t);
  const source = await integrationFixture(t);
  const ended = await integrationFixture(t);
  const retained = await integrationFixture(t);
  const replacement = await integrationFixture(t);
  const sourceRaid = (
    await startRaid(source.db, source.user.id, source.character.id)
  ).raid;
  const endedRaid = (
    await startRaid(ended.db, ended.user.id, ended.character.id)
  ).raid;
  const retainedRaid = (
    await startRaid(retained.db, retained.user.id, retained.character.id)
  ).raid;
  const replacementRaid = (
    await startRaid(
      replacement.db,
      replacement.user.id,
      replacement.character.id,
    )
  ).raid;

  const path = pathToNode(27);
  assert.deepEqual(path, [0, 1, 26, 28, 27]);
  const putSteps = (
    actor: typeof source,
    raidId: string,
    visits: { nodeId: number; round: number }[],
  ) =>
    actor.db.transaction((tx) =>
      recordGhosts(tx, actor.character.id, raidId, visits),
    );

  await putSteps(source, sourceRaid.id, [
    { nodeId: 26, round: 1 },
    { nodeId: 1, round: 2 },
    { nodeId: 28, round: 3 },
  ]);
  await putSteps(ended, endedRaid.id, [{ nodeId: 47, round: 1 }]);
  await putSteps(retained, retainedRaid.id, [
    { nodeId: 47, round: 1 },
    { nodeId: 49, round: 3 },
  ]);
  await putSteps(replacement, replacementRaid.id, [{ nodeId: 28, round: 3 }]);

  await player.db
    .update(characters)
    .set({ hp: 1000, maxHp: 1000 })
    .where(eq(characters.id, player.character.id));
  await player.db
    .update(weaponMasters)
    .set({ damage: 1000 })
    .where(eq(weaponMasters.id, player.weapon.id));
  await player.db.insert(characterWeapons).values({
    characterId: player.character.id,
    weaponMasterId: player.weapon.id,
    slotIndex: 0,
  });

  const raid = (await startRaid(player.db, player.user.id, player.character.id))
    .raid;
  const move = (version: number, path: number[]) =>
    navigateRaid(player.db, player.user.id, player.character.id, {
      raidId: raid.id,
      expectedVersion: version,
      requestId: randomUUID(),
      path,
    });
  const roster = async () =>
    (
      await player.db.query.raidSessions.findFirst({
        where: eq(raidSessions.id, raid.id),
      })
    )?.ghostRoster;
  const first = await move(0, path.slice(0, 2));
  assert.equal(first.encounterTriggered, false);
  assert.equal((await roster())?.tracks.length, 3);

  const second = await move(1, path.slice(1));
  assert.equal(second.stopNodeId, 26);
  assert.equal(second.raid.round, 2);
  assert.equal(second.battleLog?.encounter?.kind, "GHOST");
  assert.equal(
    second.battleLog?.encounter?.sourceCharacterId,
    source.character.id,
  );
  const saved = await roster();
  assert.deepEqual(saved?.defeatedCharacterIds, [source.character.id]);
  assert.deepEqual(
    saved?.tracks.map((track) => track.sourceRaidId),
    [retainedRaid.id],
  );

  const third = await move(2, path.slice(2));
  assert.equal(third.stopNodeId, 28);
  assert.equal(third.raid.round, 3);
  assert.equal(
    third.battleLog?.encounter?.sourceCharacterId,
    replacement.character.id,
  );
  assert.deepEqual((await roster())?.defeatedCharacterIds, [
    source.character.id,
    replacement.character.id,
  ]);
  assert.deepEqual(
    (await roster())?.tracks.map((track) => track.sourceRaidId),
    [retainedRaid.id],
  );
});

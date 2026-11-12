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
import { pathTravelMinutes } from "../logic/roadDistances";
import { gameRules } from "../logic/rules";
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
  assert.equal(result.raid.time, pathTravelMinutes(path));
});

test("실제 DB: 먼 진입 기록을 추적하고 빈자리는 현재 위치에서 떨어진 고스트만 채운다", async (t) => {
  const player = await integrationFixture(t);
  const source = await integrationFixture(t);
  const ended = await integrationFixture(t);
  const retained = await integrationFixture(t);
  const replacement = await integrationFixture(t);
  const nearby = await integrationFixture(t);
  const farEntry = gameRules.entryNodeIds[1]!;
  const sourceRaid = (
    await startRaid(
      source.db,
      source.user.id,
      source.character.id,
      undefined,
      farEntry,
    )
  ).raid;
  const endedRaid = (
    await startRaid(
      ended.db,
      ended.user.id,
      ended.character.id,
      undefined,
      farEntry,
    )
  ).raid;
  const retainedRaid = (
    await startRaid(
      retained.db,
      retained.user.id,
      retained.character.id,
      undefined,
      farEntry,
    )
  ).raid;
  const nearbyRaid = (
    await startRaid(nearby.db, nearby.user.id, nearby.character.id)
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
    visits: { nodeId: number; time: number }[],
  ) =>
    actor.db.transaction((tx) =>
      recordGhosts(tx, actor.character.id, raidId, visits),
    );

  await putSteps(source, sourceRaid.id, [
    { nodeId: 47, time: 10 },
    { nodeId: 26, time: 40 },
    { nodeId: 1, time: 70 },
    { nodeId: 28, time: 90 },
  ]);
  await putSteps(ended, endedRaid.id, [{ nodeId: 47, time: 10 }]);
  await putSteps(retained, retainedRaid.id, [
    { nodeId: 47, time: 10 },
    { nodeId: 49, time: 120 },
  ]);
  await putSteps(replacement, replacementRaid.id, [
    { nodeId: 93, time: 80 },
    { nodeId: 94, time: 90 },
  ]);
  await putSteps(nearby, nearbyRaid.id, [
    { nodeId: 1, time: 10 },
    { nodeId: 28, time: 80 },
  ]);

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
  assert.deepEqual(
    new Set((await roster())?.tracks.map((track) => track.sourceRaidId)),
    new Set([sourceRaid.id, endedRaid.id, retainedRaid.id]),
  );

  const second = await move(1, path.slice(1));
  assert.equal(second.stopNodeId, 26);
  assert.equal(second.raid.time, 40);
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
  assert.equal(third.encounterTriggered, false);
  assert.equal(third.raid.currentNodeId, 27);
  assert.deepEqual((await roster())?.defeatedCharacterIds, [
    source.character.id,
  ]);
  assert.deepEqual(
    (await roster())?.tracks.map((track) => track.sourceRaidId),
    [retainedRaid.id, replacementRaid.id],
  );
});

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

import { and, eq } from "drizzle-orm";

import {
  characters,
  characterWeapons,
  questDeliveries,
  questProgresses,
  stashItems,
  weaponMasters,
} from "../db";
import { firstMission, MISSION_CHAIN } from "../logic/story";
import { integrationFixture } from "../testing/integrationFixture";
import { pathToNode } from "../testing/mapRoute";
import {
  acceptFirstMission,
  advanceQuestDialogue,
  getQuestDialogue,
  journalView,
  markQuestDialogueRead,
  reportFirstMission,
} from "./quests";
import { extractRaid, navigateRaid, startRaid } from "./raid";

function command(raid: { id: string; version: number }) {
  return { raidId: raid.id, expectedVersion: raid.version, requestId: randomUUID() };
}

async function stashQuantity(
  db: Awaited<ReturnType<typeof integrationFixture>>["db"],
  userId: string,
  itemId: string,
) {
  const rows = await db.query.stashItems.findMany({
    where: and(eq(stashItems.userId, userId), eq(stashItems.weaponMasterId, itemId)),
  });
  return rows.reduce((sum, row) => sum + row.quantity, 0);
}

async function strongCharacter(fixture: Awaited<ReturnType<typeof integrationFixture>>) {
  const { db, character, weapon } = fixture;
  await db.update(characters).set({ hp: 1000, maxHp: 1000 }).where(eq(characters.id, character.id));
  await db.update(weaponMasters).set({ damage: 10000 }).where(eq(weaponMasters.id, weapon.id));
  await db.insert(characterWeapons).values({
    characterId: character.id,
    weaponMasterId: weapon.id,
    slotIndex: 0,
  });
}

test("실제 DB: 대화 진행은 같은 요청 재시도·중복 클릭·오래된 순번에도 지급품을 한 번만 준다", async (t) => {
  const { db, user } = await integrationFixture(t);
  const opened = await getQuestDialogue(db, user.id, firstMission.id);
  assert.equal(opened.status, "OFFERED");
  assert.equal(opened.pending.kind, "CHOICE");
  assert.ok(opened.transcript.length > 0);
  assert.ok(opened.transcript.every((entry) => entry.speaker.kind === "NPC"));
  const choiceId = opened.pending.kind === "CHOICE" ? opened.pending.choices[0]!.id : "";

  const request = { requestId: randomUUID(), expectedSeq: opened.seq, choiceId };
  const [first, again] = await Promise.all([
    advanceQuestDialogue(db, user.id, firstMission.id, request),
    advanceQuestDialogue(db, user.id, firstMission.id, request),
  ]);
  assert.ok(first.ok && again.ok);
  assert.equal(first.dialogue.status, "ACTIVE");
  assert.deepEqual(again.dialogue.seq, first.dialogue.seq);

  const doubleClick = await advanceQuestDialogue(db, user.id, firstMission.id, {
    ...request,
    requestId: randomUUID(),
  });
  assert.equal(doubleClick.ok, false);
  assert.equal(doubleClick.dialogue.pending.kind, "AWAIT_OBJECTIVE");

  await assert.rejects(
    () =>
      advanceQuestDialogue(db, user.id, firstMission.id, {
        ...request,
        choiceId: "something-else",
      }),
    /different action/,
  );
  assert.equal(await stashQuantity(db, user.id, firstMission.supplyWeaponId), 1);
  const view = await getQuestDialogue(db, user.id, firstMission.id);
  assert.ok(view.transcript.some((entry) => entry.speaker.kind === "PLAYER"));
  assert.ok(view.transcript.some((entry) => entry.speaker.kind === "SYSTEM" && entry.text.startsWith("[지급]")));
  assert.equal((await journalView(db, user.id)).activeObjectives[0]?.targetNodeId, firstMission.targetNodeId);
});

test("실제 DB: 탐사 중 수락한 임무의 지급품은 탐사가 끝난 뒤 한 번만 지급되고, 회수·탈출은 새 연락으로 남는다", async (t) => {
  const fixture = await integrationFixture(t);
  const { db, user, character } = fixture;
  await strongCharacter(fixture);
  const { raid } = await startRaid(db, user.id, character.id);

  const opened = await getQuestDialogue(db, user.id, firstMission.id);
  const choiceId = opened.pending.kind === "CHOICE" ? opened.pending.choices[0]!.id : "";
  const accepted = await advanceQuestDialogue(db, user.id, firstMission.id, {
    requestId: randomUUID(),
    expectedSeq: opened.seq,
    choiceId,
  });
  assert.ok(accepted.ok);
  assert.equal(await stashQuantity(db, user.id, firstMission.supplyWeaponId), 0);
  assert.ok(accepted.dialogue.transcript.some((entry) => entry.text.startsWith("[지급 예정]")));

  const path = pathToNode(firstMission.targetNodeId);
  const result = await navigateRaid(db, user.id, character.id, { ...command(raid), path });
  assert.equal(result.stopNodeId, firstMission.targetNodeId);
  const recovered = await journalView(db, user.id);
  assert.equal(recovered.mission.status, "RECOVERED");
  assert.ok((recovered.missions[0]?.unread ?? 0) > 0);

  const back = await navigateRaid(db, user.id, character.id, {
    ...command({ id: raid.id, version: result.raid.version }),
    path: [...path].reverse(),
  });
  await extractRaid(db, user.id, character.id, command({ id: raid.id, version: back.raid.version }));
  assert.equal(await stashQuantity(db, user.id, firstMission.supplyWeaponId), 1);
  const deliveries = await db.query.questDeliveries.findMany({
    where: eq(questDeliveries.userId, user.id),
  });
  assert.equal(deliveries.length, 1);
  assert.ok(deliveries[0]?.deliveredAt);

  const ready = await getQuestDialogue(db, user.id, firstMission.id);
  assert.equal(ready.status, "READY");
  assert.equal(ready.pending.kind, "CHOICE");
  await markQuestDialogueRead(db, user.id, firstMission.id, ready.seq);
  assert.equal((await journalView(db, user.id)).missions[0]?.unread, 0);

  await reportFirstMission(db, user.id);
  const done = await journalView(db, user.id);
  assert.equal(done.missions[0]?.status, "COMPLETE");
  assert.equal(done.mission.id, MISSION_CHAIN[1]!.id);
  assert.equal(await stashQuantity(db, user.id, firstMission.supplyWeaponId), 1);
});

test("실제 DB: 거점 전용 보고 선택지는 탐사 중에 진행되지 않는다", async (t) => {
  const fixture = await integrationFixture(t);
  const { db, user, character } = fixture;
  await strongCharacter(fixture);
  await acceptFirstMission(db, user.id);
  const { raid } = await startRaid(db, user.id, character.id);
  const path = pathToNode(firstMission.targetNodeId);
  const result = await navigateRaid(db, user.id, character.id, { ...command(raid), path });
  const back = await navigateRaid(db, user.id, character.id, {
    ...command({ id: raid.id, version: result.raid.version }),
    path: [...path].reverse(),
  });
  await extractRaid(db, user.id, character.id, command({ id: raid.id, version: back.raid.version }));
  const second = await startRaid(db, user.id, character.id);
  assert.ok(second.raid);
  const view = await getQuestDialogue(db, user.id, firstMission.id);
  assert.equal(view.pending.kind, "BASE_ONLY");
  const attempt = await advanceQuestDialogue(db, user.id, firstMission.id, {
    requestId: randomUUID(),
    expectedSeq: view.seq,
    choiceId: view.pending.kind === "BASE_ONLY" ? view.pending.choices[0]!.id : "",
  });
  assert.equal(attempt.ok, false);
  assert.equal(attempt.dialogue.status, "READY");
});

test("실제 DB: 대화 위치가 없는 기존 진행 기록은 상태값 기준으로 옮기고 지급품을 다시 주지 않는다", async (t) => {
  const { db, user } = await integrationFixture(t);
  await db.insert(questProgresses).values({
    userId: user.id,
    questId: firstMission.id,
    definitionVersion: 1,
    status: "ACTIVE",
  });
  const view = await getQuestDialogue(db, user.id, firstMission.id);
  assert.equal(view.pending.kind, "AWAIT_OBJECTIVE");
  assert.equal(view.seq, view.readSeq);
  assert.ok(view.transcript.some((entry) => entry.speaker.kind === "PLAYER"));
  assert.equal(await stashQuantity(db, user.id, firstMission.supplyWeaponId), 0);
  assert.equal((await journalView(db, user.id)).missions[0]?.unread, 0);
});

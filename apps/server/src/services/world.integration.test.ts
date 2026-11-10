import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { seopoRegion } from "@webgame/types";
import { eq } from "drizzle-orm";
import mapData from "../../../../packages/types/src/assets/map_graph.json";
import {
  characters,
  characterWeapons,
  raidInventoryItems,
  weaponMasters,
} from "../db";
import { integrationFixture } from "../testing/integrationFixture";
import { pathToNode } from "../testing/mapRoute";
import { navigateRaid, startRaid } from "./raid";

test("실제 DB: 기업 제한 시설에서는 소속·역할·적대 이유를 가진 요원과 조우한다", async (t) => {
  const { db, user, character, weapon } = await integrationFixture(t);
  await db
    .update(characters)
    .set({ hp: 1000, maxHp: 1000 })
    .where(eq(characters.id, character.id));
  await db
    .update(weaponMasters)
    .set({ damage: 1000 })
    .where(eq(weaponMasters.id, weapon.id));
  await db.insert(characterWeapons).values({
    characterId: character.id,
    weaponMasterId: weapon.id,
    slotIndex: 0,
  });
  const { raid } = await startRaid(db, user.id, character.id);
  const path = pathToNode(26);
  let roll = 0;
  const result = await navigateRaid(
    db,
    user.id,
    character.id,
    { raidId: raid.id, expectedVersion: 0, requestId: randomUUID(), path },
    () => (roll++ === 0 ? 0 : 0.999999),
  );
  assert.equal(result.battleLog?.encounter?.kind, "NPC");
  assert.equal(result.battleLog?.encounter?.faction, "기업");
  assert.equal(result.battleLog?.encounter?.role, "시설 통제");
  assert.ok(result.battleLog?.encounter?.reason);
  assert.equal(result.battleLog?.initialState.players.length, 2);
  // 전리품은 테스트에서 만든 계정 범위에서만 제거한다.
  await db
    .delete(raidInventoryItems)
    .where(eq(raidInventoryItems.characterId, character.id));
});

test("중첩 상태는 같은 장소의 조우 조건을 바꾸며 복귀 거점은 항상 안전하다", () => {
  assert.equal(seopoRegion(0, 4, mapData.nodes[0]!).encounter, "SAFE");
  assert.equal(seopoRegion(1, 1, { x: 100, y: 100 }).encounter, "SUPPORT");
  assert.equal(seopoRegion(1, 4, { x: 100, y: 100 }).encounter, "HOSTILE");
  assert.equal(seopoRegion(26, 1, mapData.nodes[26]!).facility, "ARCHIVE");
});

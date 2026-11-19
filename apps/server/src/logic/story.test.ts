import assert from "node:assert/strict";
import { test } from "node:test";
import { getCatalogItemById, getEnemyArchetypeById } from "@webgame/types";
import { disclosedStory, firstMission, MISSION_CHAIN } from "./story";

test("임무 체인은 1·2·3차로 이어지며 첫 임무의 지급품과 완료 보상이 중복되지 않는다", () => {
  assert.equal(MISSION_CHAIN.length, 3);
  assert.notEqual(firstMission.supplyWeaponId, firstMission.rewardWeaponId);

  const issuerNames = MISSION_CHAIN.map((m) => m.issuerName);
  assert.deepEqual(issuerNames, ["조 시설과장", "최 사장", "윤 책임연구원"]);

  for (const mission of MISSION_CHAIN) {
    assert.ok(
      getEnemyArchetypeById(mission.enemyArchetypeId),
      `Missing archetype ${mission.enemyArchetypeId}`,
    );
    for (const grant of [...mission.supplyItems, ...mission.rewardItems]) {
      assert.ok(
        getCatalogItemById(grant.weaponId),
        `Missing catalog item ${grant.weaponId}`,
      );
      assert.ok(grant.quantity > 0);
    }
    assert.ok(mission.rewardCredits > 0);
  }
});

test("storyTier 단계에 따라 거점 3인 연락처, 단일 경영 책임자, 복수 개체 및 기록이 순차 공개된다", () => {
  const tier0 = disclosedStory(0);
  assert.equal(tier0.records.length, 0);
  assert.equal(tier0.contacts.length, 3);
  assert.ok(tier0.contacts.every((c) => !c.entityId));
  assert.ok(!tier0.contacts.some((c) => c.id.startsWith("executive-contact")));

  const tier1 = disclosedStory(1);
  assert.equal(tier1.records.length, 1);
  assert.equal(tier1.contacts.length, 3);

  const tier2 = disclosedStory(2);
  assert.equal(tier2.records.length, 2);
  assert.equal(tier2.contacts.length, 4);
  const execTier2 = tier2.contacts.find((c) => c.id === "executive-contact");
  assert.ok(execTier2);
  assert.equal(execTier2.entityId, undefined);

  const tier3 = disclosedStory(3);
  assert.equal(tier3.records.length, 3);
  assert.equal(tier3.contacts.length, 5);
  const execEntities = tier3.contacts
    .filter((c) => c.id.startsWith("executive-contact"))
    .map((c) => c.entityId);
  assert.deepEqual(execEntities, ["owner-instance-a", "owner-instance-b"]);
});

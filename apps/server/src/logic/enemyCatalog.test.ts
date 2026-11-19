import assert from "node:assert/strict";
import test from "node:test";
import {
  type BattleCombatant,
  ENEMY_ARCHETYPES,
  findEnemyArchetypesByDropId,
  findWeaponDropDistricts,
  getCatalogItemById,
  getEnemyArchetypeById,
  MAP_DISTRICTS,
  resolveEnemyArchetypeWeapons,
  resolveEnemyRewardIds,
  resolveEnemyTier,
  selectEnemyArchetype,
  STORY_BUILDING_EVENTS,
} from "@webgame/types";
import { patrolsForRaid, resolvePatrolArchetype } from "./ghostPatrols";
import { gameRules } from "./rules";
import { simulateBattle } from "./simulateBattle";

test("SF 적 아키타입 카탈로그는 2~6슬롯 유효 장비와 드랍 테이블을 갖추고 판타지 명칭이 없다", () => {
  assert.ok(ENEMY_ARCHETYPES.length >= 10);
  const fantasyNames = ["slime", "goblin", "orc"];

  for (const archetype of ENEMY_ARCHETYPES) {
    for (const forbidden of fantasyNames) {
      assert.equal(
        archetype.name.toLowerCase().includes(forbidden),
        false,
        `Fantasy name found: ${archetype.name}`,
      );
    }
    assert.ok(
      archetype.weaponIds.length >= 2 && archetype.weaponIds.length <= 6,
      `${archetype.id} should equip 2~6 weapons`,
    );
    for (const weaponId of archetype.weaponIds) {
      assert.ok(
        getCatalogItemById(weaponId),
        `${archetype.id} references unknown weapon ${weaponId}`,
      );
    }
    assert.ok(archetype.rewardIds.length >= 1);
    for (const rewardId of archetype.rewardIds) {
      assert.ok(
        getCatalogItemById(rewardId),
        `${archetype.id} references unknown reward ${rewardId}`,
      );
    }
  }
});

test("시간 경과와 구역 위험도에 따라 1~3티어 적 스케일링이 적용된다", () => {
  assert.equal(resolveEnemyTier(0, "RESIDENTIAL"), 1);
  assert.equal(resolveEnemyTier(60, "COMMERCIAL"), 1);
  assert.equal(resolveEnemyTier(61, "RESIDENTIAL"), 2);
  assert.equal(resolveEnemyTier(140, "COMMERCIAL"), 2);
  assert.equal(resolveEnemyTier(141, "RESIDENTIAL"), 3);

  // 산업·의료·기반 구역은 초반 시간대라도 최소 2티어 보정
  assert.equal(resolveEnemyTier(10, "INDUSTRIAL"), 2);
  assert.equal(resolveEnemyTier(10, "MEDICAL"), 2);
  assert.equal(resolveEnemyTier(10, "INFRA"), 2);
  assert.equal(resolveEnemyTier(150, "INFRA"), 3);
});

test("순찰 NPC는 전 구역 8기가 추적되며 경과 시간에 따라 1->2->3티어로 강해진다", () => {
  const patrols = patrolsForRaid("raid-test-01", 0);
  assert.equal(patrols.length, gameRules.ghost.patrolTrackedCount);
  assert.equal(patrols.length, 8);
  assert.equal(patrols[0]?.id, "patrol-01");
  assert.ok(patrols.some((patrol) => patrol.id === "patrol-07"));
  assert.ok(patrols.some((patrol) => patrol.id === "patrol-08"));

  const early = resolvePatrolArchetype("patrol-01", 20);
  const mid = resolvePatrolArchetype("patrol-01", 90);
  const late = resolvePatrolArchetype("patrol-01", 160);
  assert.equal(early.tier, 1);
  assert.equal(mid.tier, 2);
  assert.equal(late.tier, 3);
  assert.ok(early.hp < mid.hp && mid.hp < late.hp);
});

test("스토리 건물 이벤트의 encounterEnemyId는 모두 유효한 SF 아키타입을 가리킨다", () => {
  let combatOutcomes = 0;
  for (const event of STORY_BUILDING_EVENTS) {
    for (const choice of event.choices ?? []) {
      for (const outcome of choice.outcomes ?? []) {
        if (outcome.encounterEnemyId) {
          combatOutcomes++;
          assert.ok(
            getEnemyArchetypeById(outcome.encounterEnemyId),
            `Invalid encounterEnemyId ${outcome.encounterEnemyId} in ${event.id}`,
          );
        }
        if (outcome.triggerDistrictEncounter) {
          combatOutcomes++;
        }
      }
    }
  }
  assert.ok(combatOutcomes >= 8);
});

test("초반 순찰 잔상은 기본 구호 카빈으로 교전 시 시너지/보호막 공방 후 플레이어가 승리할 수 있다", () => {
  const carbine = getCatalogItemById("hanlim-relief-carbine")!;
  const earlyPatrol = resolvePatrolArchetype("patrol-01", 20);
  const player: BattleCombatant = {
    id: "player-1",
    displayName: "생존자",
    teamId: "TeamA",
    hp: 100,
    maxHp: 100,
    stamina: 100,
    maxStamina: 100,
    staminaRegen: 10,
    weight: carbine.weight,
    maxWeight: 50,
    time: 20,
    currentWeaponIndex: 0,
    weapons: [{ ...carbine, tags: [...carbine.tags], effect: { ...carbine.effect } }, null, null, null, null, null],
  };
  const enemy: BattleCombatant = {
    id: "npc:patrol-01",
    displayName: earlyPatrol.name,
    teamId: "TeamB",
    hp: earlyPatrol.hp,
    maxHp: earlyPatrol.hp,
    stamina: earlyPatrol.stamina,
    maxStamina: earlyPatrol.stamina,
    staminaRegen: earlyPatrol.staminaRegen,
    weight: 5,
    maxWeight: 50,
    time: 20,
    currentWeaponIndex: 0,
    weapons: resolveEnemyArchetypeWeapons(earlyPatrol),
  };

  const log = simulateBattle([player, enemy], { random: () => 0.99 });
  assert.equal(log.result.winnerTeamId, "TeamA");
  const events = log.timeline.flatMap((entry) => entry.events);
  const enemySynergyOrShield = events.some(
    (event) =>
      (event.type === "SYNERGY" && event.actorId === enemy.id) ||
      (event.type === "SHIELD" && event.targetId === enemy.id),
  );
  assert.equal(enemySynergyOrShield, true);
});

test("후반 3티어 적은 복수 슬롯 시너지·소환을 실제로 발동한다", () => {
  const lateBoss = selectEnemyArchetype({
    timeMinutes: 160,
    districtKind: "INFRA",
    seed: 0,
  });
  assert.equal(lateBoss.tier, 3);
  const weapons = resolveEnemyArchetypeWeapons(lateBoss);
  const equippedCount = weapons.filter(Boolean).length;
  assert.ok(equippedCount >= 5);

  const carbine = getCatalogItemById("hanlim-relief-carbine")!;
  const player: BattleCombatant = {
    id: "player-1",
    displayName: "생존자",
    teamId: "TeamA",
    hp: 100,
    maxHp: 100,
    stamina: 100,
    maxStamina: 100,
    staminaRegen: 10,
    weight: carbine.weight,
    maxWeight: 50,
    time: 160,
    currentWeaponIndex: 0,
    weapons: [{ ...carbine, tags: [...carbine.tags], effect: { ...carbine.effect } }, null, null, null, null, null],
  };
  const enemy: BattleCombatant = {
    id: `npc:${lateBoss.id}`,
    displayName: lateBoss.name,
    teamId: "TeamB",
    hp: lateBoss.hp,
    maxHp: lateBoss.hp,
    stamina: lateBoss.stamina,
    maxStamina: lateBoss.stamina,
    staminaRegen: lateBoss.staminaRegen,
    weight: 15,
    maxWeight: 50,
    time: 160,
    currentWeaponIndex: 0,
    weapons,
  };

  const log = simulateBattle([player, enemy], { random: () => 0.5 });
  const events = log.timeline.flatMap((entry) => entry.events);
  const enemyUsedSynergy = events.some(
    (event) => event.type === "SYNERGY" && event.actorId === enemy.id,
  );
  assert.equal(enemyUsedSynergy, true);
});

test("기초 무기 5종은 건물 수색 풀에서 제외되고 구역별 특색 NPC가 장착 및 확정 드랍한다", () => {
  const baseWeaponIds = [
    "wpn_dagger",
    "wpn_primary",
    "hanlim-relief-carbine",
    "hanlim-control-baton",
    "wpn_lifesaver",
  ] as const;

  for (const weaponId of baseWeaponIds) {
    for (const district of MAP_DISTRICTS) {
      assert.equal(
        district.materialIds.includes(weaponId),
        false,
        `${district.id} should not contain base weapon ${weaponId} in building search pool`,
      );
    }

    const droppers = findEnemyArchetypesByDropId(weaponId);
    assert.ok(
      droppers.length >= 1,
      `Expected at least one NPC archetype dropping ${weaponId}`,
    );
    for (const npc of droppers) {
      assert.equal(npc.guaranteedRewardId, weaponId);
      assert.ok(
        npc.weaponIds.includes(weaponId),
        `${npc.id} should equip its guaranteed reward ${weaponId}`,
      );
      assert.deepEqual(resolveEnemyRewardIds(npc), [weaponId]);
    }

    const dropDistricts = findWeaponDropDistricts(weaponId);
    assert.ok(
      dropDistricts.length >= 1,
      `Expected at least one drop district for ${weaponId}`,
    );
  }
});

test("필드 적대 NPC에는 기업·한림그룹 소속이 없으며 고유 무기 2종은 확정 드랍 대상이 아니다", () => {
  for (const archetype of ENEMY_ARCHETYPES) {
    assert.equal(
      archetype.faction.includes("기업") || archetype.faction.includes("한림"),
      false,
      `Hostile field NPC ${archetype.id} should not belong to corporate faction (${archetype.faction})`,
    );
    assert.notEqual(archetype.guaranteedRewardId, "wpn_sniper");
    assert.notEqual(archetype.guaranteedRewardId, "wpn_giant_slayer");
  }
});



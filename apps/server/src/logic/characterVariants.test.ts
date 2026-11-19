import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  type BattleCombatant,
  CHARACTER_VARIANT_CATALOG,
  getCharacterVariantSpec,
  getVariantTagMultiplier,
} from "@webgame/types";

import { simulateBattle } from "./simulateBattle";

function makeCombatant(
  overrides: Partial<BattleCombatant> & Pick<BattleCombatant, "id" | "teamId">,
): BattleCombatant {
  return {
    displayName: overrides.id,
    hp: 100,
    maxHp: 100,
    stamina: 100,
    maxStamina: 100,
    staminaRegen: 10,
    weight: 0,
    maxWeight: 50,
    time: 0,
    currentWeaponIndex: 0,
    weapons: [null, null, null, null, null, null],
    ...overrides,
  };
}

describe("다중우주 생존자 변주(CharacterVariant) 카탈로그 및 전투 특화", () => {
  it("5종 변주가 고유 ID와 차별화된 스탯 프로필을 가지며 legacy-origin은 기본값을 유지한다", () => {
    assert.ok(CHARACTER_VARIANT_CATALOG.length >= 5);
    const ids = new Set(CHARACTER_VARIANT_CATALOG.map((v) => v.id));
    assert.equal(ids.size, CHARACTER_VARIANT_CATALOG.length);

    const legacy = getCharacterVariantSpec("legacy-origin");
    assert.ok(legacy);
    assert.deepEqual(legacy.stats, {
      maxHp: 100,
      maxStamina: 100,
      staminaRegen: 10,
      maxFatigue: 100,
      maxWeight: 50,
    });

    const hauler = getCharacterVariantSpec("haerin-hauler");
    const vanguard = getCharacterVariantSpec("doyun-vanguard");
    const recon = getCharacterVariantSpec("doyun-recon");
    assert.ok(hauler && vanguard && recon);
    assert.ok(hauler.stats.maxWeight > legacy.stats.maxWeight);
    assert.ok(vanguard.stats.maxHp > recon.stats.maxHp);
    assert.ok(recon.stats.maxFatigue > vanguard.stats.maxFatigue);
  });

  it("특화 태그가 일치할 때만 배율이 적용된다", () => {
    assert.equal(getVariantTagMultiplier("legacy-origin", ["FIREARM"]), 1);
    assert.equal(getVariantTagMultiplier("doyun-recon", ["FIREARM"]), 1.12);
    assert.equal(getVariantTagMultiplier("doyun-recon", ["BLADE"]), 1);
    assert.equal(getVariantTagMultiplier("jiwon-medic", ["BIO"]), 1.12);
    assert.equal(getVariantTagMultiplier("haerin-hauler", ["TECH"]), 1.08);
  });

  it("simulateBattle에서 특화 태그 무기 피해에 변주 보너스가 반영된다", () => {
    const rifle = {
      id: "test-rifle",
      name: "테스트 소총",
      damage: 25,
      staminaCost: 10,
      cooldownTicks: 10,
      castTicks: 0,
      weight: 5,
      value: 100,
      attackType: "RANGED" as const,
      effect: { tags: ["FIREARM" as const] },
    };

    const dummy = makeCombatant({
      id: "dummy",
      teamId: "TeamB",
      hp: 200,
      maxHp: 200,
    });

    const baseResult = simulateBattle(
      [
        makeCombatant({
          id: "p1",
          teamId: "TeamA",
          variantId: "legacy-origin",
          weapons: [rifle, null, null, null, null, null],
        }),
        { ...dummy },
      ],
      { random: () => 0.99, maxTicks: 20 },
    );

    const reconResult = simulateBattle(
      [
        makeCombatant({
          id: "p1",
          teamId: "TeamA",
          variantId: "doyun-recon",
          weapons: [rifle, null, null, null, null, null],
        }),
        { ...dummy },
      ],
      { random: () => 0.99, maxTicks: 20 },
    );

    const baseDummyHp =
      baseResult.finalState.players.find((p) => p.id === "dummy")?.hp ?? 200;
    const reconDummyHp =
      reconResult.finalState.players.find((p) => p.id === "dummy")?.hp ?? 200;

    assert.ok(
      reconDummyHp < baseDummyHp,
      `doyun-recon(${reconDummyHp})이 legacy-origin(${baseDummyHp})보다 FIREARM 무기로 더 많은 피해를 입혀야 함`,
    );
  });
});

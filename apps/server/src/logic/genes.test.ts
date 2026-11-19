import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BASE_CHARACTER_STATS,
  type BattleCombatant,
  computeCharacterStatsFromGenes,
  countGeneGrades,
  GENE_GRADE_CAPS,
  GENE_REROLL_CHOICE_COUNT,
  GENE_SLOT_COUNT,
  getGeneById,
  rollGeneRerollCandidates,
  rollInitialCharacterGenes,
  validateGeneGradeCaps,
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

describe("캐릭터 유전자 풀 조합 및 등급 제한 규칙", () => {
  it("초기 유전자 생성 시 10개 슬롯·중복 없음·고유 유전자 포함·등급 제한을 준수한다", () => {
    for (const defId of [
      "legacy-survivor",
      "survivor-haerin",
      "survivor-jiwon",
    ]) {
      for (let i = 0; i < 20; i++) {
        const profile = rollInitialCharacterGenes(defId);
        assert.equal(profile.slots.length, GENE_SLOT_COUNT);
        assert.equal(new Set(profile.slots).size, GENE_SLOT_COUNT);
        assert.equal(validateGeneGradeCaps(profile.slots), true);

        const genes = profile.slots.map((id) => getGeneById(id)!);
        assert.ok(genes.every(Boolean));
        assert.ok(
          genes.some((g) => g.pool === "UNIQUE" && g.ownerDefinitionId === defId),
          `${defId}는 본인 고유 유전자를 최소 1개 포함해야 함`,
        );
        assert.ok(
          genes.every(
            (g) => g.pool === "COMMON" || g.ownerDefinitionId === defId,
          ),
          "초기 생성에서는 타 캐릭터 고유 유전자가 섞이면 안 됨",
        );

        const counts = countGeneGrades(profile.slots);
        assert.ok(counts.RARE <= GENE_GRADE_CAPS.RARE);
        assert.ok(counts.EPIC <= GENE_GRADE_CAPS.EPIC);
      }
    }
  });

  it("유전자 앰플 사용 시 타 캐릭터의 고유 유전자가 후보 3종에 포함된다", () => {
    const baseSlots = [
      "gene-c-hp",
      "gene-c-stamina",
      "gene-c-regen",
      "gene-c-fatigue",
      "gene-c-weight",
      "gene-c-melee",
      "gene-c-ranged",
      "gene-c-crit",
      "gene-c-shield",
      "gene-u-doyun-c",
    ];
    const candidates = rollGeneRerollCandidates(
      baseSlots,
      0,
      "legacy-survivor",
      "survivor-haerin",
    );
    assert.equal(candidates.length, GENE_REROLL_CHOICE_COUNT);
    assert.equal(new Set(candidates).size, GENE_REROLL_CHOICE_COUNT);
    assert.ok(
      candidates.some(
        (id) => getGeneById(id)?.ownerDefinitionId === "survivor-haerin",
      ),
      "서해린 앰플 사용 시 서해린 고유 유전자가 후보에 포함되어야 함",
    );
  });

  it("유전자 스탯 합산이 기본 능력치에 정확히 반영된다", () => {
    const stats = computeCharacterStatsFromGenes(BASE_CHARACTER_STATS, [
      "gene-c-hp",
      "gene-c-weight",
      "gene-r-vital",
      "gene-e-overclock",
    ]);
    assert.equal(stats.maxHp, BASE_CHARACTER_STATS.maxHp + 8 + 14);
    assert.equal(stats.maxWeight, BASE_CHARACTER_STATS.maxWeight + 5);
    assert.equal(stats.maxFatigue, BASE_CHARACTER_STATS.maxFatigue + 10);
    assert.equal(stats.maxStamina, BASE_CHARACTER_STATS.maxStamina + 20);
    assert.equal(stats.staminaRegen, BASE_CHARACTER_STATS.staminaRegen + 3);
  });

  it("전투 시뮬레이션에서 유전자 패시브(보호막)와 액티브(자동 발동)가 실제로 동작한다", () => {
    const result = simulateBattle(
      [
        makeCombatant({
          id: "p1",
          teamId: "TeamA",
          geneIds: ["gene-c-shield", "gene-u-doyun-r"],
          weapons: [null, null, null, null, null, null],
        }),
        makeCombatant({
          id: "dummy",
          teamId: "TeamB",
          hp: 100,
          maxHp: 100,
          weapons: [null, null, null, null, null, null],
        }),
      ],
      { random: () => 0.99, maxTicks: 60 },
    );

    const initialP1 = result.initialState.players.find((p) => p.id === "p1");
    assert.equal(initialP1?.shield, 6, "피하 완충 유전자로 시작 보호막 +6 부여");

    const finalDummy = result.finalState.players.find((p) => p.id === "dummy");
    assert.ok(
      (finalDummy?.hp ?? 100) < 100,
      "비무장 상태에서도 액티브 유전자(반사 사격 신경)가 자동 발동해 피해를 입혀야 함",
    );
  });
});

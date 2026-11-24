import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CRAFTING_MATERIALS,
  CRAFTING_RECIPES,
  MAP_DISTRICTS,
  canFillCraftSlot,
  findCraftTagDistricts,
  getCatalogItemById,
  getRecipeById,
  isRareCraftTag,
  isValidCraftMaterialSelection,
  pickDefaultCraftMaterials,
} from "@webgame/types";

function stockOf(...ids: string[]) {
  const counts = new Map<string, number>();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts.entries()].map(([id, quantity]) => ({
    id,
    quantity,
    value: getCatalogItemById(id)?.value ?? 0,
  }));
}

describe("태그 기반 조합 규칙", () => {
  it("모든 재료는 조합 태그를 1~2개 가지며 희귀 태그는 최대 1개다", () => {
    for (const material of CRAFTING_MATERIALS) {
      const tags = material.craftTags ?? [];
      assert.ok(tags.length >= 1 && tags.length <= 2, material.id);
      assert.ok(tags.filter(isRareCraftTag).length <= 1, material.id);
    }
  });

  it("T1은 일반 태그 2칸, T2는 희귀 태그 1칸과 일반 태그 1칸을 요구한다", () => {
    for (const recipe of CRAFTING_RECIPES) {
      const rareCount = recipe.materialSlots.filter(isRareCraftTag).length;
      assert.equal(rareCount, recipe.tier === 1 ? 0 : 1, recipe.id);
    }
  });

  it("모든 슬롯 태그는 수색으로 얻을 수 있는 재료가 존재한다", () => {
    const pooled = new Set(MAP_DISTRICTS.flatMap((d) => d.materialIds));
    for (const recipe of CRAFTING_RECIPES) {
      for (const tag of recipe.materialSlots) {
        assert.ok(findCraftTagDistricts(tag).length > 0, `${recipe.id}:${tag}`);
      }
    }
    for (const id of pooled) {
      assert.ok(getCatalogItemById(id), `수색 풀에 정의되지 않은 재료: ${id}`);
    }
  });

  it("희귀 재료는 일반 태그 슬롯도 채울 수 있다", () => {
    assert.ok(canFillCraftSlot({ id: "mat-titanium" }, "GUARD"));
    assert.ok(canFillCraftSlot({ id: "mat-titanium" }, "HIGH_STRENGTH"));
    assert.ok(!canFillCraftSlot({ id: "mat-ceramic" }, "HIGH_STRENGTH"));
    assert.ok(!canFillCraftSlot({ id: "wpn_dagger" }, "BIND"));
  });

  it("선택한 재료가 슬롯 순서대로 태그를 충족하는지 검사한다", () => {
    const recipe = getRecipeById("rcp-log-2a")!;
    assert.ok(isValidCraftMaterialSelection(recipe, ["mat-titanium", "mat-wire"]));
    assert.ok(!isValidCraftMaterialSelection(recipe, ["mat-wire", "mat-titanium"]));
    assert.ok(!isValidCraftMaterialSelection(recipe, ["mat-titanium"]));
  });

  it("기본 선택은 가치 합이 가장 낮은 조합을 고른다", () => {
    const recipe = getRecipeById("rcp-inf-1")!; // 전도 + 방호
    const picked = pickDefaultCraftMaterials(
      recipe,
      stockOf("mat-battery", "mat-wire", "mat-ceramic", "mat-core"),
    );
    assert.deepEqual(picked, ["mat-wire", "mat-ceramic"]);
  });

  it("생체 태그는 의료 구역 재료에만 있어 의료 T1은 의료 구역 수색이 필요하다", () => {
    const bioDistricts = findCraftTagDistricts("BIO");
    assert.ok(bioDistricts.length > 0);
    assert.ok(bioDistricts.every((district) => district.kind === "MEDICAL"));
    assert.deepEqual(getRecipeById("rcp-med-1")!.materialSlots, ["BIO", "CONDUCT"]);
  });

  it("같은 재료로 두 칸을 채우려면 2개가 필요하다", () => {
    const recipe = {
      ...getRecipeById("rcp-med-1")!,
      materialSlots: ["BIO", "BIO"] as const,
    };
    assert.equal(pickDefaultCraftMaterials(recipe, stockOf("mat-biogel")), null);
    assert.deepEqual(
      pickDefaultCraftMaterials(recipe, stockOf("mat-biogel", "mat-biogel")),
      ["mat-biogel", "mat-biogel"],
    );
  });

  it("탐욕 선택으로는 실패하는 배치도 찾아낸다", () => {
    // 렌즈 없이 릴레이(전도·광학)와 티타늄만 있어도 두 칸을 채워야 한다.
    const recipe = getRecipeById("rcp-com-2b")!; // 고강도 + 광학
    assert.deepEqual(
      pickDefaultCraftMaterials(recipe, stockOf("mat-relay", "mat-titanium")),
      ["mat-titanium", "mat-relay"],
    );
  });
});

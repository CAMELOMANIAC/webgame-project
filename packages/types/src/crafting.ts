import type { CraftTag } from "./craftTags";
import { MAP_DISTRICTS } from "./districts";
import { findEnemyArchetypesByDropId } from "./enemyCatalog";
import {
  CRAFTING_MATERIALS,
  getCatalogItemById,
  getCatalogItemByName,
  type CatalogWeaponMaster,
} from "./itemCatalog";
import type { BuildingCategory, MapDistrict } from "./world";

export * from "./itemCatalog";

export interface CraftingRecipe {
  id: string;
  buildingCategory: BuildingCategory;
  tier: 1 | 2 | 3;
  baseEquipmentId: string;
  compatibleBaseNames: string[];
  /** 재료 슬롯별 요구 조합 태그. 각 슬롯에 태그가 맞는 재료 1개를 소모합니다. */
  materialSlots: readonly [CraftTag, CraftTag];
  resultEquipmentId: string;
}

export const CRAFTING_RECIPES: readonly CraftingRecipe[] = [
  // LOGISTICS
  {
    id: "rcp-log-1",
    buildingCategory: "LOGISTICS",
    tier: 1,
    baseEquipmentId: "wpn_dagger",
    compatibleBaseNames: ["전술 단검", "Secondary Dagger", "Dagger", "secondary"],
    materialSlots: ["BIND", "CONDUCT"],
    resultEquipmentId: "eq-log-t1",
  },
  {
    id: "rcp-log-2a",
    buildingCategory: "LOGISTICS",
    tier: 2,
    baseEquipmentId: "eq-log-t1",
    compatibleBaseNames: ["개조 전술 단검"],
    materialSlots: ["HIGH_STRENGTH", "CONDUCT"],
    resultEquipmentId: "eq-log-t2a",
  },
  {
    id: "rcp-log-2b",
    buildingCategory: "LOGISTICS",
    tier: 2,
    baseEquipmentId: "eq-log-t1",
    compatibleBaseNames: ["개조 전술 단검"],
    materialSlots: ["HIGH_OUTPUT", "BIND"],
    resultEquipmentId: "eq-log-t2b",
  },

  // COMMERCIAL
  {
    id: "rcp-com-1",
    buildingCategory: "COMMERCIAL",
    tier: 1,
    baseEquipmentId: "hanlim-relief-carbine",
    compatibleBaseNames: ["기업 구호용 카빈"],
    materialSlots: ["OPTIC", "GUARD"],
    resultEquipmentId: "eq-com-t1",
  },
  {
    id: "rcp-com-2a",
    buildingCategory: "COMMERCIAL",
    tier: 2,
    baseEquipmentId: "eq-com-t1",
    compatibleBaseNames: ["광학 조준 카빈"],
    materialSlots: ["HIGH_OUTPUT", "OPTIC"],
    resultEquipmentId: "eq-com-t2a",
  },
  {
    id: "rcp-com-2b",
    buildingCategory: "COMMERCIAL",
    tier: 2,
    baseEquipmentId: "eq-com-t1",
    compatibleBaseNames: ["광학 조준 카빈"],
    materialSlots: ["HIGH_STRENGTH", "OPTIC"],
    resultEquipmentId: "eq-com-t2b",
  },

  // PUBLIC
  {
    id: "rcp-pub-1",
    buildingCategory: "PUBLIC",
    tier: 1,
    baseEquipmentId: "hanlim-control-baton",
    compatibleBaseNames: ["기업 제식 충격봉", "제식 충격봉"],
    materialSlots: ["IGNITE", "CONDUCT"],
    resultEquipmentId: "eq-pub-t1",
  },
  {
    id: "rcp-pub-2a",
    buildingCategory: "PUBLIC",
    tier: 2,
    baseEquipmentId: "eq-pub-t1",
    compatibleBaseNames: ["고압 충격봉"],
    materialSlots: ["HIGH_OUTPUT", "CONDUCT"],
    resultEquipmentId: "eq-pub-t2a",
  },
  {
    id: "rcp-pub-2b",
    buildingCategory: "PUBLIC",
    tier: 2,
    baseEquipmentId: "eq-pub-t1",
    compatibleBaseNames: ["고압 충격봉"],
    materialSlots: ["HIGH_STRENGTH", "IGNITE"],
    resultEquipmentId: "eq-pub-t2b",
  },

  // INFRA
  {
    id: "rcp-inf-1",
    buildingCategory: "INFRA",
    tier: 1,
    baseEquipmentId: "hanlim-control-baton",
    compatibleBaseNames: ["기업 제식 충격봉", "응급 생체 팩", "Life-saver"],
    materialSlots: ["CONDUCT", "GUARD"],
    resultEquipmentId: "eq-inf-t1",
  },
  {
    id: "rcp-inf-2a",
    buildingCategory: "INFRA",
    tier: 2,
    baseEquipmentId: "eq-inf-t1",
    compatibleBaseNames: ["가속 릴레이 코일"],
    materialSlots: ["HIGH_OUTPUT", "GUARD"],
    resultEquipmentId: "eq-inf-t2a",
  },
  {
    id: "rcp-inf-2b",
    buildingCategory: "INFRA",
    tier: 2,
    baseEquipmentId: "eq-inf-t1",
    compatibleBaseNames: ["가속 릴레이 코일"],
    materialSlots: ["HIGH_STRENGTH", "CONDUCT"],
    resultEquipmentId: "eq-inf-t2b",
  },

  // MEDICAL
  {
    id: "rcp-med-1",
    buildingCategory: "MEDICAL",
    tier: 1,
    baseEquipmentId: "wpn_lifesaver",
    compatibleBaseNames: ["응급 생체 팩", "전술 단검", "Life-saver", "Secondary Dagger"],
    materialSlots: ["BIO", "BIO"],
    resultEquipmentId: "eq-med-t1",
  },
  {
    id: "rcp-med-2a",
    buildingCategory: "MEDICAL",
    tier: 2,
    baseEquipmentId: "eq-med-t1",
    compatibleBaseNames: ["생체 자극 주입기"],
    materialSlots: ["PHARMA", "BIND"],
    resultEquipmentId: "eq-med-t2a",
  },
  {
    id: "rcp-med-2b",
    buildingCategory: "MEDICAL",
    tier: 2,
    baseEquipmentId: "eq-med-t1",
    compatibleBaseNames: ["생체 자극 주입기"],
    materialSlots: ["PHARMA", "BIO"],
    resultEquipmentId: "eq-med-t2b",
  },

  // CULTURAL
  {
    id: "rcp-cul-1",
    buildingCategory: "CULTURAL",
    tier: 1,
    baseEquipmentId: "wpn_primary",
    compatibleBaseNames: ["표준 도검", "Primary Sword", "primary"],
    materialSlots: ["BIND", "GUARD"],
    resultEquipmentId: "eq-cul-t1",
  },
  {
    id: "rcp-cul-2a",
    buildingCategory: "CULTURAL",
    tier: 2,
    baseEquipmentId: "eq-cul-t1",
    compatibleBaseNames: ["공명 블레이드"],
    materialSlots: ["PHARMA", "GUARD"],
    resultEquipmentId: "eq-cul-t2a",
  },
  {
    id: "rcp-cul-2b",
    buildingCategory: "CULTURAL",
    tier: 2,
    baseEquipmentId: "eq-cul-t1",
    compatibleBaseNames: ["공명 블레이드"],
    materialSlots: ["PHARMA", "OPTIC"],
    resultEquipmentId: "eq-cul-t2b",
  },
];

const RECIPE_BY_ID = new Map(
  CRAFTING_RECIPES.map((recipe) => [recipe.id, recipe]),
);
const RECIPE_BY_RESULT_ID = new Map(
  CRAFTING_RECIPES.map((recipe) => [recipe.resultEquipmentId, recipe]),
);

export function getRecipeById(recipeId: string): CraftingRecipe | undefined {
  return RECIPE_BY_ID.get(recipeId);
}

export function getCraftingRecipesForCategory(
  category: BuildingCategory,
): CraftingRecipe[] {
  return CRAFTING_RECIPES.filter(
    (recipe) => recipe.buildingCategory === category,
  );
}

export function matchesRecipeBase(
  recipe: CraftingRecipe,
  item: { id: string; name: string } | null | undefined,
): boolean {
  if (!item) return false;
  return (
    item.id === recipe.baseEquipmentId ||
    recipe.compatibleBaseNames.includes(item.name)
  );
}

/** 목표 조합 레시피를 기준으로 하위 선행 단계를 포함한 필요 레시피 목록 반환 */
export function getRecipeChainForTarget(recipeId: string): CraftingRecipe[] {
  const chain: CraftingRecipe[] = [];
  let current = RECIPE_BY_ID.get(recipeId);
  const visited = new Set<string>();
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    chain.unshift(current);
    current = RECIPE_BY_RESULT_ID.get(current.baseEquipmentId);
  }
  return chain;
}

export function findMaterialDistricts(materialId: string): MapDistrict[] {
  return MAP_DISTRICTS.filter((district) =>
    district.materialIds.includes(materialId),
  );
}

type CraftItemRef = { id?: string; name?: string } | null | undefined;

/** 아이템의 조합 태그를 카탈로그(ID 우선, 이름 보조)에서 조회합니다. 재료가 아니면 빈 배열입니다. */
export function getItemCraftTags(item: CraftItemRef): readonly CraftTag[] {
  if (!item) return [];
  const catalog =
    (item.id ? getCatalogItemById(item.id) : undefined) ??
    (item.name ? getCatalogItemByName(item.name) : undefined);
  return catalog?.craftTags ?? [];
}

export function canFillCraftSlot(item: CraftItemRef, tag: CraftTag): boolean {
  return getItemCraftTags(item).includes(tag);
}

/** 해당 조합 태그를 가진 재료 카탈로그 목록 */
export function getCraftTagMaterials(tag: CraftTag): CatalogWeaponMaster[] {
  return CRAFTING_MATERIALS.filter((material) =>
    material.craftTags?.includes(tag),
  );
}

/** 해당 조합 태그를 가진 재료가 수색 풀에 있는 구역 목록 */
export function findCraftTagDistricts(tag: CraftTag): MapDistrict[] {
  const materialIds = new Set(getCraftTagMaterials(tag).map((m) => m.id));
  return MAP_DISTRICTS.filter((district) =>
    district.materialIds.some((id) => materialIds.has(id)),
  );
}

/** 선택한 재료 ID가 레시피 슬롯 순서대로 태그를 충족하는지 검사합니다. */
export function isValidCraftMaterialSelection(
  recipe: CraftingRecipe,
  materialItemIds: readonly string[],
): boolean {
  if (materialItemIds.length !== recipe.materialSlots.length) return false;
  return recipe.materialSlots.every((tag, index) => {
    const itemId = materialItemIds[index];
    return itemId !== undefined && canFillCraftSlot({ id: itemId }, tag);
  });
}

export interface CraftMaterialStock {
  id: string;
  quantity: number;
  value: number;
}

/** 특정 슬롯 태그에 넣을 수 있는 보유 재료를 가치가 낮은 순으로 반환합니다. */
export function listCraftSlotCandidates(
  tag: CraftTag,
  stock: readonly CraftMaterialStock[],
): CraftMaterialStock[] {
  return stock
    .filter((entry) => entry.quantity > 0 && canFillCraftSlot({ id: entry.id }, tag))
    .sort((a, b) => a.value - b.value);
}

/**
 * 보유 재료 중 레시피 슬롯을 모두 채우는 가치 합이 가장 낮은 조합을 반환합니다.
 * 채울 수 없으면 null을 반환합니다.
 */
export function pickDefaultCraftMaterials(
  recipe: CraftingRecipe,
  stock: readonly CraftMaterialStock[],
): [string, string] | null {
  const [firstTag, secondTag] = recipe.materialSlots;
  const firstCandidates = listCraftSlotCandidates(firstTag, stock);
  const secondCandidates = listCraftSlotCandidates(secondTag, stock);
  let best: { ids: [string, string]; cost: number } | null = null;
  for (const first of firstCandidates) {
    for (const second of secondCandidates) {
      if (first.id === second.id && first.quantity < 2) continue;
      const cost = first.value + second.value;
      if (!best || cost < best.cost) {
        best = { ids: [first.id, second.id], cost };
      }
    }
  }
  return best?.ids ?? null;
}

/**
 * 구역별 특색 NPC 처치로 획득할 수 있는 장비의 출현 구역 목록을 반환합니다.
 */
export function findWeaponDropDistricts(itemId: string): MapDistrict[] {
  const archetypes = findEnemyArchetypesByDropId(itemId);
  if (archetypes.length === 0) return [];
  const kinds = new Set(archetypes.flatMap((archetype) => archetype.districtKinds));
  return MAP_DISTRICTS.filter((district) => kinds.has(district.kind));
}

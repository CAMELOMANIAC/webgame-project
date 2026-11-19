import { MAP_DISTRICTS } from "./districts";
import { findEnemyArchetypesByDropId } from "./enemyCatalog";
import type { BuildingCategory, MapDistrict } from "./world";

export * from "./itemCatalog";

export interface CraftingRecipe {
  id: string;
  buildingCategory: BuildingCategory;
  tier: 1 | 2 | 3;
  baseEquipmentId: string;
  compatibleBaseNames: string[];
  materialIds: [string, string];
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
    materialIds: ["mat-tape", "mat-wire"],
    resultEquipmentId: "eq-log-t1",
  },
  {
    id: "rcp-log-2a",
    buildingCategory: "LOGISTICS",
    tier: 2,
    baseEquipmentId: "eq-log-t1",
    compatibleBaseNames: ["개조 전술 단검"],
    materialIds: ["mat-titanium", "mat-relay"],
    resultEquipmentId: "eq-log-t2a",
  },
  {
    id: "rcp-log-2b",
    buildingCategory: "LOGISTICS",
    tier: 2,
    baseEquipmentId: "eq-log-t1",
    compatibleBaseNames: ["개조 전술 단검"],
    materialIds: ["mat-titanium", "mat-solenoid"],
    resultEquipmentId: "eq-log-t2b",
  },

  // COMMERCIAL
  {
    id: "rcp-com-1",
    buildingCategory: "COMMERCIAL",
    tier: 1,
    baseEquipmentId: "hanlim-relief-carbine",
    compatibleBaseNames: ["기업 구호용 카빈"],
    materialIds: ["mat-lens", "mat-ceramic"],
    resultEquipmentId: "eq-com-t1",
  },
  {
    id: "rcp-com-2a",
    buildingCategory: "COMMERCIAL",
    tier: 2,
    baseEquipmentId: "eq-com-t1",
    compatibleBaseNames: ["광학 조준 카빈"],
    materialIds: ["mat-relay", "mat-solenoid"],
    resultEquipmentId: "eq-com-t2a",
  },
  {
    id: "rcp-com-2b",
    buildingCategory: "COMMERCIAL",
    tier: 2,
    baseEquipmentId: "eq-com-t1",
    compatibleBaseNames: ["광학 조준 카빈"],
    materialIds: ["mat-lens", "mat-battery"],
    resultEquipmentId: "eq-com-t2b",
  },

  // PUBLIC
  {
    id: "rcp-pub-1",
    buildingCategory: "PUBLIC",
    tier: 1,
    baseEquipmentId: "hanlim-control-baton",
    compatibleBaseNames: ["기업 제식 충격봉", "제식 충격봉"],
    materialIds: ["mat-lighter", "mat-battery"],
    resultEquipmentId: "eq-pub-t1",
  },
  {
    id: "rcp-pub-2a",
    buildingCategory: "PUBLIC",
    tier: 2,
    baseEquipmentId: "eq-pub-t1",
    compatibleBaseNames: ["고압 충격봉"],
    materialIds: ["mat-fuel", "mat-wire"],
    resultEquipmentId: "eq-pub-t2a",
  },
  {
    id: "rcp-pub-2b",
    buildingCategory: "PUBLIC",
    tier: 2,
    baseEquipmentId: "eq-pub-t1",
    compatibleBaseNames: ["고압 충격봉"],
    materialIds: ["mat-fuel", "mat-titanium"],
    resultEquipmentId: "eq-pub-t2b",
  },

  // INFRA
  {
    id: "rcp-inf-1",
    buildingCategory: "INFRA",
    tier: 1,
    baseEquipmentId: "hanlim-control-baton",
    compatibleBaseNames: ["기업 제식 충격봉", "응급 생체 팩", "Life-saver"],
    materialIds: ["mat-wire", "mat-battery"],
    resultEquipmentId: "eq-inf-t1",
  },
  {
    id: "rcp-inf-2a",
    buildingCategory: "INFRA",
    tier: 2,
    baseEquipmentId: "eq-inf-t1",
    compatibleBaseNames: ["가속 릴레이 코일"],
    materialIds: ["mat-solenoid", "mat-core"],
    resultEquipmentId: "eq-inf-t2a",
  },
  {
    id: "rcp-inf-2b",
    buildingCategory: "INFRA",
    tier: 2,
    baseEquipmentId: "eq-inf-t1",
    compatibleBaseNames: ["가속 릴레이 코일"],
    materialIds: ["mat-relay", "mat-core"],
    resultEquipmentId: "eq-inf-t2b",
  },

  // MEDICAL
  {
    id: "rcp-med-1",
    buildingCategory: "MEDICAL",
    tier: 1,
    baseEquipmentId: "wpn_lifesaver",
    compatibleBaseNames: ["응급 생체 팩", "전술 단검", "Life-saver", "Secondary Dagger"],
    materialIds: ["mat-biogel", "mat-electrolyte"],
    resultEquipmentId: "eq-med-t1",
  },
  {
    id: "rcp-med-2a",
    buildingCategory: "MEDICAL",
    tier: 2,
    baseEquipmentId: "eq-med-t1",
    compatibleBaseNames: ["생체 자극 주입기"],
    materialIds: ["mat-stimulant", "mat-nanosuture"],
    resultEquipmentId: "eq-med-t2a",
  },
  {
    id: "rcp-med-2b",
    buildingCategory: "MEDICAL",
    tier: 2,
    baseEquipmentId: "eq-med-t1",
    compatibleBaseNames: ["생체 자극 주입기"],
    materialIds: ["mat-anticoagulant", "mat-stimulant"],
    resultEquipmentId: "eq-med-t2b",
  },

  // CULTURAL
  {
    id: "rcp-cul-1",
    buildingCategory: "CULTURAL",
    tier: 1,
    baseEquipmentId: "wpn_primary",
    compatibleBaseNames: ["표준 도검", "Primary Sword", "primary"],
    materialIds: ["mat-tape", "mat-ceramic"],
    resultEquipmentId: "eq-cul-t1",
  },
  {
    id: "rcp-cul-2a",
    buildingCategory: "CULTURAL",
    tier: 2,
    baseEquipmentId: "eq-cul-t1",
    compatibleBaseNames: ["공명 블레이드"],
    materialIds: ["mat-anticoagulant", "mat-core"],
    resultEquipmentId: "eq-cul-t2a",
  },
  {
    id: "rcp-cul-2b",
    buildingCategory: "CULTURAL",
    tier: 2,
    baseEquipmentId: "eq-cul-t1",
    compatibleBaseNames: ["공명 블레이드"],
    materialIds: ["mat-nanosuture", "mat-lens"],
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

/**
 * 구역별 특색 NPC 처치로 획득할 수 있는 장비의 출현 구역 목록을 반환합니다.
 */
export function findWeaponDropDistricts(itemId: string): MapDistrict[] {
  const archetypes = findEnemyArchetypesByDropId(itemId);
  if (archetypes.length === 0) return [];
  const kinds = new Set(archetypes.flatMap((archetype) => archetype.districtKinds));
  return MAP_DISTRICTS.filter((district) => kinds.has(district.kind));
}

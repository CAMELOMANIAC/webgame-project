import { MAP_DISTRICTS } from "./districts";
import type {
  ItemKind,
  SynergyTargetRule,
  WeaponData,
  WeaponEffect,
} from "./index";
import type { BuildingCategory, MapDistrict } from "./world";

export interface CatalogWeaponMaster {
  id: string;
  name: string;
  damage: number;
  staminaCost: number;
  cooldownTicks: number;
  castTicks: number;
  weight: number;
  value: number;
  description: string;
  attackType: "MELEE" | "RANGED";
  iconKey: string;
  effect: WeaponEffect;
}

export interface CraftingRecipe {
  id: string;
  buildingCategory: BuildingCategory;
  tier: 1 | 2 | 3;
  baseEquipmentId: string;
  compatibleBaseNames: string[];
  materialIds: [string, string];
  resultEquipmentId: string;
}

function makeMaterial(
  id: string,
  name: string,
  weight: number,
  value: number,
  description: string,
  iconKey = "MATERIAL",
): CatalogWeaponMaster {
  return {
    id,
    name,
    damage: 0,
    staminaCost: 0,
    cooldownTicks: 0,
    castTicks: 0,
    weight,
    value,
    description,
    attackType: "MELEE",
    iconKey,
    effect: { type: "MATERIAL", itemKind: "MATERIAL" },
  };
}

function makeEquipment(
  input: Omit<CatalogWeaponMaster, "effect"> & { effect: WeaponEffect },
): CatalogWeaponMaster {
  return {
    ...input,
    effect: {
      ...input.effect,
      itemKind: "EQUIPMENT",
    },
  };
}

/** 16종 조합 재료 단일 원본 */
export const CRAFTING_MATERIALS: readonly CatalogWeaponMaster[] = [
  // 생활·주거 (4종)
  makeMaterial("mat-tape", "고강도 테이프", 1, 15, "장비 결속용 산업 테이프."),
  makeMaterial("mat-wire", "구리 배선", 1, 18, "전도율이 높은 피복 배선."),
  makeMaterial("mat-lighter", "휴대용 라이터", 1, 16, "점화 및 열원 공급 장치."),
  makeMaterial("mat-electrolyte", "전해질 팩", 1, 20, "생체 안정 및 냉각용 전해질."),
  // 상업·전자 (4종)
  makeMaterial("mat-lens", "광학 렌즈", 1, 32, "정밀 조준용 다중 코팅 렌즈."),
  makeMaterial("mat-relay", "고속 릴레이 칩", 1, 38, "신호 지연 단축용 고속 스위치."),
  makeMaterial("mat-battery", "리튬 배터리", 2, 35, "고밀도 휴대 전력 셀."),
  makeMaterial("mat-ceramic", "방열 세라믹 판", 2, 34, "과열 억제용 세라믹 방열판."),
  // 의료·생체 (4종)
  makeMaterial("mat-biogel", "멸균 생체 젤", 1, 42, "응급 조직 재생을 돕는 생체 젤."),
  makeMaterial("mat-stimulant", "신경 자극제", 1, 55, "반사 속도를 끌어올리는 각성 약물."),
  makeMaterial("mat-anticoagulant", "항응고 용액", 1, 48, "화학적 부식을 유지하는 특수 용액."),
  makeMaterial("mat-nanosuture", "나노 봉합사", 1, 60, "미세 봉합 및 내구 보강 섬유."),
  // 산업·기반 외곽 (4종)
  makeMaterial("mat-titanium", "경량 티타늄 프레임", 2, 70, "초경량 고강도 합금 골격."),
  makeMaterial("mat-solenoid", "고압 솔레노이드", 2, 85, "자기 가속 코일 부품."),
  makeMaterial("mat-fuel", "특수 산업용 연료", 2, 80, "고출력 순환용 정제 연료."),
  makeMaterial("mat-core", "차폐 동력 코어", 3, 120, "다중우주 잔류 에너지 차폐 코어."),
];

/** 6개 카테고리별 1차(1종) -> 2차(2갈래) 조합 장비 18종 */
export const CRAFTED_EQUIPMENTS: readonly CatalogWeaponMaster[] = [
  // 1. LOGISTICS (물류)
  makeEquipment({
    id: "eq-log-t1",
    name: "개조 전술 단검",
    damage: 9,
    staminaCost: 4,
    cooldownTicks: 6,
    castTicks: 0,
    weight: 2,
    value: 95,
    description: "다음 슬롯의 쿨다운을 단축시키는 경량 단검.",
    attackType: "MELEE",
    iconKey: "DAGGER",
    effect: { type: "SYNERGY", target: "NEXT", hasteTicks: 1 },
  }),
  makeEquipment({
    id: "eq-log-t2a",
    name: "초경량 연쇄 단검",
    damage: 12,
    staminaCost: 4,
    cooldownTicks: 5,
    castTicks: 0,
    weight: 1,
    value: 210,
    description: "빠른 연타마다 다음 슬롯을 크게 가속합니다.",
    attackType: "MELEE",
    iconKey: "DAGGER",
    effect: { type: "SYNERGY", target: "NEXT", hasteTicks: 3 },
  }),
  makeEquipment({
    id: "eq-log-t2b",
    name: "강습 타격 단검",
    damage: 15,
    staminaCost: 5,
    cooldownTicks: 6,
    castTicks: 0,
    weight: 2,
    value: 225,
    description: "모든 근접 무기의 다음 타격을 강화합니다.",
    attackType: "MELEE",
    iconKey: "DAGGER",
    effect: { type: "SYNERGY", target: "ALL_MELEE", damageBonus: 6 },
  }),

  // 2. COMMERCIAL (상업)
  makeEquipment({
    id: "eq-com-t1",
    name: "광학 조준 카빈",
    damage: 20,
    staminaCost: 4,
    cooldownTicks: 3,
    castTicks: 0,
    weight: 3,
    value: 115,
    description: "다음 슬롯의 치명타 확률을 높입니다.",
    attackType: "RANGED",
    iconKey: "RIFLE",
    effect: { type: "SYNERGY", target: "NEXT", critChanceBonus: 0.25 },
  }),
  makeEquipment({
    id: "eq-com-t2a",
    name: "전술 마킹 카빈",
    damage: 24,
    staminaCost: 4,
    cooldownTicks: 3,
    castTicks: 0,
    weight: 3,
    value: 255,
    description: "모든 원거리 장비에 피해와 치명타 보너스를 부여합니다.",
    attackType: "RANGED",
    iconKey: "RIFLE",
    effect: {
      type: "SYNERGY",
      target: "ALL_RANGED",
      damageBonus: 10,
      critChanceBonus: 0.35,
    },
  }),
  makeEquipment({
    id: "eq-com-t2b",
    name: "양단 조준경 카빈",
    damage: 26,
    staminaCost: 5,
    cooldownTicks: 3,
    castTicks: 0,
    weight: 3,
    value: 240,
    description: "가장자리 끝 슬롯(01, 06)을 가속하고 강화합니다.",
    attackType: "RANGED",
    iconKey: "RIFLE",
    effect: {
      type: "SYNERGY",
      target: "EDGES",
      hasteTicks: 2,
      damageBonus: 8,
    },
  }),

  // 3. PUBLIC (공공)
  makeEquipment({
    id: "eq-pub-t1",
    name: "고압 충격봉",
    damage: 10,
    staminaCost: 2,
    cooldownTicks: 3,
    castTicks: 0,
    weight: 2,
    value: 90,
    description: "스태미나를 회복하고 이전 슬롯을 가속합니다.",
    attackType: "MELEE",
    iconKey: "STAFF",
    effect: {
      type: "SYNERGY",
      target: "PREV",
      hasteTicks: 1,
      staminaRestore: 8,
    },
  }),
  makeEquipment({
    id: "eq-pub-t2a",
    name: "과충전 순환봉",
    damage: 14,
    staminaCost: 2,
    cooldownTicks: 3,
    castTicks: 0,
    weight: 2,
    value: 220,
    description: "스태미나를 대량 보충하며 양옆 슬롯을 가속합니다.",
    attackType: "MELEE",
    iconKey: "STAFF",
    effect: {
      type: "SYNERGY",
      target: "ADJACENT",
      hasteTicks: 2,
      staminaRestore: 16,
    },
  }),
  makeEquipment({
    id: "eq-pub-t2b",
    name: "진압용 방전 해머",
    damage: 22,
    staminaCost: 6,
    cooldownTicks: 5,
    castTicks: 1,
    weight: 4,
    value: 235,
    description: "스태미나 순환과 근접 치명타를 동시에 지원합니다.",
    attackType: "MELEE",
    iconKey: "AXE",
    effect: {
      type: "SYNERGY",
      target: "ALL_MELEE",
      critChanceBonus: 0.4,
      staminaRestore: 10,
    },
  }),

  // 4. INFRA (기반)
  makeEquipment({
    id: "eq-inf-t1",
    name: "가속 릴레이 코일",
    damage: 4,
    staminaCost: 3,
    cooldownTicks: 4,
    castTicks: 0,
    weight: 2,
    value: 110,
    description: "양옆 슬롯의 재사용 대기를 줄이는 보조 코일.",
    attackType: "RANGED",
    iconKey: "STAFF",
    effect: { type: "SYNERGY", target: "ADJACENT", hasteTicks: 2 },
  }),
  makeEquipment({
    id: "eq-inf-t2a",
    name: "초전도 공명 코어",
    damage: 6,
    staminaCost: 3,
    cooldownTicks: 4,
    castTicks: 0,
    weight: 2,
    value: 290,
    description: "인접한 양옆 장비를 강력하게 가속·증폭합니다.",
    attackType: "RANGED",
    iconKey: "STAFF",
    effect: {
      type: "SYNERGY",
      target: "ADJACENT",
      hasteTicks: 3,
      damageBonus: 8,
    },
  }),
  makeEquipment({
    id: "eq-inf-t2b",
    name: "양극 과부하 증폭기",
    damage: 6,
    staminaCost: 4,
    cooldownTicks: 5,
    castTicks: 0,
    weight: 3,
    value: 295,
    description: "가장자리 끝 슬롯(01, 06)의 순환과 치명타를 극대화합니다.",
    attackType: "RANGED",
    iconKey: "STAFF",
    effect: {
      type: "SYNERGY",
      target: "EDGES",
      hasteTicks: 4,
      critChanceBonus: 0.5,
    },
  }),

  // 5. MEDICAL (의료)
  makeEquipment({
    id: "eq-med-t1",
    name: "생체 자극 주입기",
    damage: 0,
    staminaCost: 10,
    cooldownTicks: 6,
    castTicks: 0,
    weight: 2,
    value: 145,
    description: "체력과 스태미나를 함께 회복하는 지속형 주입기.",
    attackType: "MELEE",
    iconKey: "HEAL",
    effect: {
      type: "HEAL",
      amount: 35,
      hpThreshold: 0.7,
      oncePerBattle: false,
      staminaRestore: 12,
    },
  }),
  makeEquipment({
    id: "eq-med-t2a",
    name: "아드레날린 주입기",
    damage: 0,
    staminaCost: 8,
    cooldownTicks: 5,
    castTicks: 0,
    weight: 2,
    value: 270,
    description: "회복과 동시에 모든 장착 슬롯을 가속합니다.",
    attackType: "MELEE",
    iconKey: "HEAL",
    effect: {
      type: "HEAL",
      amount: 45,
      hpThreshold: 0.8,
      oncePerBattle: false,
      staminaRestore: 18,
      target: "ALL_OTHER",
      hasteTicks: 2,
    },
  }),
  makeEquipment({
    id: "eq-med-t2b",
    name: "신경 과활성 주사기",
    damage: 12,
    staminaCost: 5,
    cooldownTicks: 4,
    castTicks: 0,
    weight: 2,
    value: 265,
    description: "자가 회복 후 다음 슬롯을 강하게 가속·강화합니다.",
    attackType: "MELEE",
    iconKey: "HEAL",
    effect: {
      type: "HEAL",
      amount: 20,
      hpThreshold: 0.9,
      oncePerBattle: false,
      target: "NEXT",
      damageBonus: 14,
      hasteTicks: 2,
    },
  }),

  // 6. CULTURAL (문화)
  makeEquipment({
    id: "eq-cul-t1",
    name: "공명 블레이드",
    damage: 15,
    staminaCost: 6,
    cooldownTicks: 6,
    castTicks: 0,
    weight: 4,
    value: 130,
    description: "2회 타격마다 다음 슬롯을 강화합니다.",
    attackType: "MELEE",
    iconKey: "SWORD",
    effect: {
      type: "SYNERGY",
      target: "NEXT",
      damageBonus: 8,
      triggerEveryNHits: 2,
    },
  }),
  makeEquipment({
    id: "eq-cul-t2a",
    name: "파동 공명검",
    damage: 22,
    staminaCost: 6,
    cooldownTicks: 6,
    castTicks: 0,
    weight: 4,
    value: 280,
    description: "2회 발동마다 양옆 슬롯을 가속하고 크게 강화합니다.",
    attackType: "MELEE",
    iconKey: "SWORD",
    effect: {
      type: "SYNERGY",
      target: "ADJACENT",
      damageBonus: 14,
      hasteTicks: 2,
      triggerEveryNHits: 2,
    },
  }),
  makeEquipment({
    id: "eq-cul-t2b",
    name: "전술 지휘군도",
    damage: 19,
    staminaCost: 5,
    cooldownTicks: 5,
    castTicks: 0,
    weight: 4,
    value: 260,
    description: "매 공격마다 모든 근접 무기를 가속·강화합니다.",
    attackType: "MELEE",
    iconKey: "SWORD",
    effect: {
      type: "SYNERGY",
      target: "ALL_MELEE",
      damageBonus: 9,
      hasteTicks: 1,
    },
  }),
];

export const CRAFTING_RECIPES: readonly CraftingRecipe[] = [
  // LOGISTICS
  {
    id: "rcp-log-1",
    buildingCategory: "LOGISTICS",
    tier: 1,
    baseEquipmentId: "wpn_dagger",
    compatibleBaseNames: ["Secondary Dagger", "Dagger", "secondary"],
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
    compatibleBaseNames: ["기업 구호용 카빈", "Sniper Rifle"],
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
    compatibleBaseNames: ["기업 제식 충격봉", "Giant Slayer"],
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
    compatibleBaseNames: ["기업 제식 충격봉", "Life-saver"],
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
    compatibleBaseNames: ["Life-saver", "Secondary Dagger"],
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
    compatibleBaseNames: ["Primary Sword", "primary"],
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

export const ALL_CATALOG_ITEMS: readonly CatalogWeaponMaster[] = [
  ...CRAFTING_MATERIALS,
  ...CRAFTED_EQUIPMENTS,
];

const CATALOG_BY_ID = new Map(
  ALL_CATALOG_ITEMS.map((item) => [item.id, item]),
);
const RECIPE_BY_ID = new Map(
  CRAFTING_RECIPES.map((recipe) => [recipe.id, recipe]),
);
const RECIPE_BY_RESULT_ID = new Map(
  CRAFTING_RECIPES.map((recipe) => [recipe.resultEquipmentId, recipe]),
);

export function getCatalogItemById(
  id: string,
): CatalogWeaponMaster | undefined {
  return CATALOG_BY_ID.get(id);
}

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

export function getItemKind(
  item: { id?: string; effect?: unknown } | null | undefined,
): ItemKind {
  if (!item) return "EQUIPMENT";
  if (item.effect && typeof item.effect === "object") {
    const record = item.effect as { itemKind?: unknown; type?: unknown };
    if (record.itemKind === "MATERIAL" || record.type === "MATERIAL") {
      return "MATERIAL";
    }
  }
  if (item.id && CATALOG_BY_ID.get(item.id)?.effect.itemKind === "MATERIAL") {
    return "MATERIAL";
  }
  return "EQUIPMENT";
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

const TARGET_LABELS: Record<SynergyTargetRule, string> = {
  NEXT: "NEXT",
  PREV: "PREV",
  ADJACENT: "ADJ",
  EDGES: "EDGE",
  ALL_MELEE: "MELEE",
  ALL_RANGED: "RANGED",
  ALL_OTHER: "ALL",
};

export function formatSynergySummary(
  effect: WeaponEffect | WeaponData["effect"] | null | undefined,
): string | null {
  if (!effect || effect.type === "MATERIAL") return null;
  const parts: string[] = [];
  if (effect.target) {
    const label = TARGET_LABELS[effect.target];
    if (effect.hasteTicks) parts.push(`${label} -${effect.hasteTicks}t`);
    if (effect.damageBonus) parts.push(`${label} +${effect.damageBonus}DMG`);
    if (effect.critChanceBonus)
      parts.push(`${label} +${Math.round(effect.critChanceBonus * 100)}%CRIT`);
  }
  if (effect.staminaRestore) parts.push(`ENG +${effect.staminaRestore}`);
  if (effect.type === "HEAL" && effect.amount) parts.push(`HP +${effect.amount}`);
  if (effect.triggerEveryNHits && effect.triggerEveryNHits > 1) {
    parts.push(`${effect.triggerEveryNHits}HIT`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

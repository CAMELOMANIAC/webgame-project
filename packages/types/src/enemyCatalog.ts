import type { WeaponData } from "./index";
import { getCatalogItemById } from "./itemCatalog";
import type { BuildingCategory, DistrictKind } from "./world";

export type EnemyTier = 1 | 2 | 3;

export interface EnemyArchetype {
  id: string;
  name: string;
  faction: string;
  role: string;
  reason: string;
  tier: EnemyTier;
  districtKinds: readonly DistrictKind[];
  buildingCategories?: readonly BuildingCategory[];
  isPatrolEligible?: boolean;
  hp: number;
  stamina: number;
  staminaRegen: number;
  /** 장착 슬롯(0~5) 순서대로 배치되는 카탈로그 아이템 ID 목록 */
  weaponIds: readonly string[];
  /** 처치 시 드랍 후보 카탈로그 아이템 ID 목록 */
  rewardIds: readonly string[];
}

export const ENEMY_TIER_TIME_THRESHOLDS = {
  midStartMinutes: 61,
  lateStartMinutes: 141,
} as const;

const HIGH_RISK_DISTRICTS: readonly DistrictKind[] = [
  "INDUSTRIAL",
  "MEDICAL",
  "INFRA",
];

/**
 * 탐사 경과 시간(분)과 구역 위험도를 바탕으로 적 티어(1~3)를 결정합니다.
 * - 0~60분: 1티어 (초반, 2~3슬롯)
 * - 61~140분: 2티어 (중반, 3~5슬롯)
 * - 141분+: 3티어 (후반, 5~6슬롯)
 * - 산업/의료/기반 구역은 최소 2티어 이상으로 보정됩니다.
 */
export function resolveEnemyTier(
  timeMinutes: number,
  districtKind?: DistrictKind,
): EnemyTier {
  const baseTier: EnemyTier =
    timeMinutes >= ENEMY_TIER_TIME_THRESHOLDS.lateStartMinutes
      ? 3
      : timeMinutes >= ENEMY_TIER_TIME_THRESHOLDS.midStartMinutes
        ? 2
        : 1;

  if (
    districtKind &&
    HIGH_RISK_DISTRICTS.includes(districtKind) &&
    baseTier < 2
  ) {
    return 2;
  }
  return baseTier;
}

/**
 * 회성시·한림그룹 세계관 기반 SF 적대 개체 카탈로그 (1~3티어, 2~6슬롯 시너지 빌드).
 * 테스트 단계에서는 플레이어 고스트의 공백을 메우는 윤활제 역할도 겸합니다.
 */
export const ENEMY_ARCHETYPES: readonly EnemyArchetype[] = [
  // =========================================================================
  // Tier 1: 초반 (0~60분, 2~3슬롯)
  // =========================================================================
  {
    id: "npc-res-scavenger",
    name: "회성시 낙오 수집가",
    faction: "무소속 생존자",
    role: "구역 파밍",
    reason: "주거 구역의 잔여 물자를 선점하려 경계하고 있습니다.",
    tier: 1,
    districtKinds: ["RESIDENTIAL"],
    isPatrolEligible: true,
    hp: 60,
    stamina: 95,
    staminaRegen: 7,
    weaponIds: ["wpn_dagger", "mat-tape", "mat-lighter"],
    rewardIds: ["wpn_dagger", "mat-tape", "mat-wire", "food-energy-bar"],
  },
  {
    id: "npc-com-scout",
    name: "기업 외곽 정찰조",
    faction: "한림그룹",
    role: "상업지구 감시",
    reason: "상업지구 무단 진입자의 이동 경로를 차단하려 합니다.",
    tier: 1,
    districtKinds: ["COMMERCIAL"],
    buildingCategories: ["COMMERCIAL", "CULTURAL"],
    isPatrolEligible: true,
    hp: 64,
    stamina: 100,
    staminaRegen: 8,
    weaponIds: ["mat-wire", "hanlim-control-baton", "mat-lens"],
    rewardIds: ["hanlim-control-baton", "mat-lens", "mat-battery", "med-bandage"],
  },
  {
    id: "npc-patrol-early",
    name: "초기 순찰 잔상",
    faction: "중첩 잔상",
    role: "도로 순찰",
    reason: "동일 시간대 도로를 순찰하던 무장 개체와 경로가 겹쳤습니다.",
    tier: 1,
    districtKinds: ["RESIDENTIAL", "COMMERCIAL"],
    isPatrolEligible: true,
    hp: 62,
    stamina: 100,
    staminaRegen: 7,
    weaponIds: ["mat-wire", "hanlim-control-baton", "mat-tape"],
    rewardIds: ["hanlim-control-baton", "mat-wire", "mat-tape", "food-ion-drink"],
  },
  {
    id: "npc-hanlim-control",
    name: "기업 통제 요원",
    faction: "기업",
    role: "시설 통제",
    reason: "중계 시설의 기록에 대한 접근을 차단하려 합니다.",
    tier: 1,
    districtKinds: ["RESIDENTIAL", "COMMERCIAL", "INFRA"],
    buildingCategories: ["PUBLIC", "INFRA"],
    hp: 68,
    stamina: 100,
    staminaRegen: 8,
    weaponIds: ["mat-wire", "hanlim-control-baton", "mat-ceramic"],
    rewardIds: ["hanlim-control-baton", "mat-ceramic", "mat-relay", "med-bandage"],
  },

  // =========================================================================
  // Tier 2: 중반 (61~140분 또는 산업·의료·기반 구역 기본, 4슬롯)
  // =========================================================================
  {
    id: "npc-patrol-mid",
    name: "무장 생존자 잔상",
    faction: "중첩 잔상",
    role: "중반 파밍 개체",
    reason: "1차 장비 조합을 마친 타 세계선 생존자와 동선이 충돌했습니다.",
    tier: 2,
    districtKinds: ["RESIDENTIAL", "COMMERCIAL", "INDUSTRIAL"],
    isPatrolEligible: true,
    hp: 96,
    stamina: 110,
    staminaRegen: 9,
    weaponIds: ["eq-log-t1", "eq-cul-t1", "mat-stimulant", "mat-ceramic"],
    rewardIds: ["eq-log-t1", "eq-cul-t1", "mat-stimulant", "food-combat-ration"],
  },
  {
    id: "npc-com-marksman",
    name: "상업지구 저격 청부인",
    faction: "무소속 생존자",
    role: "매복 저격",
    reason: "고층 상가에서 접근하는 생존자를 노리고 있습니다.",
    tier: 2,
    districtKinds: ["COMMERCIAL", "RESIDENTIAL"],
    buildingCategories: ["COMMERCIAL", "CULTURAL"],
    isPatrolEligible: true,
    hp: 88,
    stamina: 115,
    staminaRegen: 9,
    weaponIds: ["mat-lens", "eq-com-t1", "mat-battery", "wpn_sniper"],
    rewardIds: ["eq-com-t1", "mat-lens", "mat-battery", "wpn_sniper"],
  },
  {
    id: "npc-ind-enforcer",
    name: "회수부서 진압조",
    faction: "한림그룹 회수부서",
    role: "물류 통제",
    reason: "산업·물류 구역의 반출 금지 물자를 회수하기 위해 무력 제압을 시도합니다.",
    tier: 2,
    districtKinds: ["INDUSTRIAL"],
    buildingCategories: ["LOGISTICS", "PUBLIC"],
    isPatrolEligible: true,
    hp: 102,
    stamina: 115,
    staminaRegen: 9,
    weaponIds: ["eq-pub-t1", "mat-titanium", "wpn_giant_slayer", "mat-ceramic"],
    rewardIds: ["eq-pub-t1", "mat-titanium", "mat-fuel", "wpn_giant_slayer"],
  },
  {
    id: "npc-med-quarantine",
    name: "방역 격리 요원",
    faction: "한림그룹 방역팀",
    role: "생체 격리",
    reason: "비표준 생체 파형을 감지하고 현장을 강제 격리하려 합니다.",
    tier: 2,
    districtKinds: ["MEDICAL"],
    buildingCategories: ["MEDICAL"],
    isPatrolEligible: true,
    hp: 95,
    stamina: 110,
    staminaRegen: 9,
    weaponIds: ["mat-anticoagulant", "eq-log-t1", "mat-stimulant", "eq-med-t1"],
    rewardIds: ["eq-med-t1", "mat-biogel", "mat-stimulant", "med-tourniquet"],
  },
  {
    id: "npc-inf-drone-op",
    name: "중계망 드론 관제병",
    faction: "한림그룹 보안팀",
    role: "통신망 방호",
    reason: "정찰 드론을 전개해 통신 중계 구역 접근자를 배제합니다.",
    tier: 2,
    districtKinds: ["INFRA"],
    buildingCategories: ["INFRA"],
    isPatrolEligible: true,
    hp: 92,
    stamina: 115,
    staminaRegen: 10,
    weaponIds: ["eq-inf-t1", "eq-summon-drone", "mat-relay", "eq-com-t1"],
    rewardIds: ["eq-inf-t1", "mat-relay", "mat-solenoid", "eq-summon-drone"],
  },

  // =========================================================================
  // Tier 3: 후반 (141분+, 5~6슬롯 완성형 시너지 빌드)
  // =========================================================================
  {
    id: "npc-patrol-late",
    name: "완전 무장 생존자 잔상",
    faction: "중첩 잔상",
    role: "후반 완전 무장 개체",
    reason: "2차 조합을 끝낸 타 세계선 생존자가 탈출로를 두고 대치합니다.",
    tier: 3,
    districtKinds: ["RESIDENTIAL", "COMMERCIAL", "INDUSTRIAL", "MEDICAL", "INFRA"],
    isPatrolEligible: true,
    hp: 145,
    stamina: 130,
    staminaRegen: 11,
    weaponIds: [
      "eq-log-t2a",
      "eq-cul-t2a",
      "eq-med-t2b",
      "eq-cul-t2b",
      "eq-reactive-plate",
      "eq-trauma-autoinjector",
    ],
    rewardIds: [
      "eq-cul-t2a",
      "eq-log-t2a",
      "eq-reactive-plate",
      "med-hemostatic-injector",
    ],
  },
  {
    id: "npc-ind-juggernaut",
    name: "중장갑 회수 타격대장",
    faction: "한림그룹 회수부서",
    role: "구역 완전 봉쇄",
    reason: "중장갑 방어 포탑과 방호 장비를 전개해 구역을 전면 통제합니다.",
    tier: 3,
    districtKinds: ["INDUSTRIAL", "COMMERCIAL"],
    buildingCategories: ["LOGISTICS", "PUBLIC"],
    isPatrolEligible: true,
    hp: 158,
    stamina: 135,
    staminaRegen: 11,
    weaponIds: [
      "eq-pub-t2a",
      "eq-pub-t2b",
      "mat-core",
      "eq-reactive-plate",
      "eq-summon-turret",
    ],
    rewardIds: ["eq-pub-t2b", "mat-core", "eq-summon-turret", "med-trauma-kit"],
  },
  {
    id: "npc-inf-architect",
    name: "변전소 공명 보안관",
    faction: "한림그룹 특수보안",
    role: "핵심 설비 방위",
    reason: "고속 릴레이와 원거리 화망으로 중계 핵심 구역을 방위합니다.",
    tier: 3,
    districtKinds: ["INFRA", "COMMERCIAL"],
    buildingCategories: ["INFRA", "COMMERCIAL"],
    isPatrolEligible: true,
    hp: 138,
    stamina: 135,
    staminaRegen: 12,
    weaponIds: [
      "eq-com-t2a",
      "eq-inf-t2a",
      "eq-arc-emitter",
      "eq-inf-t2b",
      "eq-summon-drone",
      "eq-com-t2b",
    ],
    rewardIds: ["eq-inf-t2a", "eq-com-t2a", "eq-arc-emitter", "mat-core"],
  },
  {
    id: "npc-med-swarm",
    name: "변이 생체 회수 전문가",
    faction: "한림그룹 생체연구",
    role: "표본 회수",
    reason: "나노 생체 군체와 화학 무장을 투입해 현장 표본을 강제 회수합니다.",
    tier: 3,
    districtKinds: ["MEDICAL", "RESIDENTIAL"],
    buildingCategories: ["MEDICAL"],
    isPatrolEligible: true,
    hp: 140,
    stamina: 130,
    staminaRegen: 11,
    weaponIds: [
      "eq-chem-canister",
      "eq-mono-katana",
      "eq-summon-swarm",
      "eq-med-t2a",
      "mat-nanosuture",
    ],
    rewardIds: [
      "eq-mono-katana",
      "eq-summon-swarm",
      "eq-med-t2a",
      "mat-nanosuture",
    ],
  },
];

const ARCHETYPE_BY_ID = new Map(
  ENEMY_ARCHETYPES.map((archetype) => [archetype.id, archetype]),
);

export function getEnemyArchetypeById(id: string): EnemyArchetype | undefined {
  return ARCHETYPE_BY_ID.get(id);
}

/**
 * 아키타입의 장착 무기 목록을 6슬롯 WeaponData 배열로 변환합니다.
 */
export function resolveEnemyArchetypeWeapons(
  archetype: EnemyArchetype,
): [
  WeaponData | null,
  WeaponData | null,
  WeaponData | null,
  WeaponData | null,
  WeaponData | null,
  WeaponData | null,
] {
  const slots: [
    WeaponData | null,
    WeaponData | null,
    WeaponData | null,
    WeaponData | null,
    WeaponData | null,
    WeaponData | null,
  ] = [null, null, null, null, null, null];

  for (let index = 0; index < Math.min(6, archetype.weaponIds.length); index++) {
    const itemId = archetype.weaponIds[index];
    if (!itemId) continue;
    const item = getCatalogItemById(itemId);
    if (!item) continue;
    slots[index] = {
      id: item.id,
      name: item.name,
      damage: item.damage,
      staminaCost: item.staminaCost,
      cooldownTicks: item.cooldownTicks,
      castTicks: item.castTicks,
      weight: item.weight,
      value: item.value,
      attackType: item.attackType,
      iconKey: item.iconKey,
      strategy: item.strategy,
      tags: [...item.tags],
      effect: { ...item.effect },
    };
  }

  return slots;
}

export interface SelectEnemyArchetypeOptions {
  timeMinutes: number;
  districtKind?: DistrictKind;
  buildingCategory?: BuildingCategory;
  patrolOnly?: boolean;
  seed?: number;
}

/**
 * 경과 시간, 구역 성격, 건물 카테고리를 반영해 적합한 SF 적 아키타입을 선택합니다.
 */
export function selectEnemyArchetype(
  options: SelectEnemyArchetypeOptions,
): EnemyArchetype {
  const tier = resolveEnemyTier(options.timeMinutes, options.districtKind);
  const basePool = options.patrolOnly
    ? ENEMY_ARCHETYPES.filter((a) => a.isPatrolEligible)
    : ENEMY_ARCHETYPES;

  const tierPool = basePool.filter((a) => a.tier === tier);
  const candidates = tierPool.length > 0 ? tierPool : basePool;

  let filtered = candidates;
  if (options.buildingCategory) {
    const byCategory = filtered.filter((a) =>
      a.buildingCategories?.includes(options.buildingCategory!),
    );
    if (byCategory.length > 0) filtered = byCategory;
  }
  if (options.districtKind) {
    const byDistrict = filtered.filter((a) =>
      a.districtKinds.includes(options.districtKind!),
    );
    if (byDistrict.length > 0) filtered = byDistrict;
  }

  const index =
    options.seed !== undefined
      ? Math.abs(Math.floor(options.seed)) % filtered.length
      : Math.floor(Math.random() * filtered.length);

  return filtered[index] ?? ENEMY_ARCHETYPES[0]!;
}

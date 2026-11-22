import type {
  ConsumableEffect,
  ItemKind,
  SynergyTargetRule,
  TargetingStrategy,
  WeaponData,
  WeaponEffect,
  WeaponTag,
} from "./index";

export const WEAPON_TAG_LABELS: Record<WeaponTag, string> = {
  BLADE: "도검",
  FIREARM: "총기",
  BLUNT: "타격",
  TECH: "기계",
  BIO: "생체",
  CHEM: "화학",
  ARMOR: "방호",
};

export interface CatalogWeaponMaster {
  id: string;
  name: string;
  aliases?: string[];
  damage: number;
  staminaCost: number;
  cooldownTicks: number;
  castTicks: number;
  weight: number;
  value: number;
  description: string;
  attackType: "MELEE" | "RANGED";
  iconKey: string;
  strategy?: TargetingStrategy;
  tags: WeaponTag[];
  effect: WeaponEffect;
}

function makeEquipment(
  input: Omit<CatalogWeaponMaster, "effect"> & {
    effect?: Omit<WeaponEffect, "itemKind" | "tags">;
  },
): CatalogWeaponMaster {
  return {
    ...input,
    effect: {
      ...(input.effect ?? {}),
      tags: [...input.tags],
      itemKind: "EQUIPMENT",
    },
  };
}

function makeMaterial(
  input: Omit<CatalogWeaponMaster, "effect" | "attackType" | "iconKey" | "castTicks"> & {
    attackType?: "MELEE" | "RANGED";
    iconKey?: string;
    castTicks?: number;
    effect: Omit<WeaponEffect, "itemKind" | "tags">;
  },
): CatalogWeaponMaster {
  return {
    ...input,
    castTicks: input.castTicks ?? 0,
    attackType: input.attackType ?? "MELEE",
    iconKey: input.iconKey ?? "MATERIAL",
    effect: {
      ...input.effect,
      tags: [...input.tags],
      itemKind: "MATERIAL",
    },
  };
}

function makeConsumable(input: {
  id: string;
  name: string;
  weight: number;
  value: number;
  description: string;
  iconKey?: string;
  tags?: WeaponTag[];
  consumable: ConsumableEffect;
}): CatalogWeaponMaster {
  const tags = input.tags ?? [];
  return {
    id: input.id,
    name: input.name,
    damage: 0,
    staminaCost: 0,
    cooldownTicks: 1,
    castTicks: 0,
    weight: input.weight,
    value: input.value,
    description: input.description,
    attackType: "MELEE",
    iconKey: input.iconKey ?? (input.consumable.category === "FOOD" ? "FOOD" : "MEDICAL"),
    tags,
    effect: {
      type: "CONSUMABLE",
      itemKind: "CONSUMABLE",
      tags: [...tags],
      consumable: input.consumable,
    },
  };
}

/** 기본 장비 5종 */
export const BASE_EQUIPMENTS: readonly CatalogWeaponMaster[] = [
  makeEquipment({
    id: "wpn_primary",
    name: "표준 도검",
    aliases: ["Primary Sword", "primary"],
    damage: 12,
    staminaCost: 16,
    cooldownTicks: 5,
    castTicks: 0,
    weight: 5,
    value: 100,
    description: "균형 잡힌 표준 도검.",
    attackType: "MELEE",
    iconKey: "SWORD",
    tags: ["BLADE"],
  }),
  makeEquipment({
    id: "wpn_dagger",
    name: "전술 단검",
    aliases: ["Secondary Dagger", "Dagger", "secondary"],
    damage: 6,
    staminaCost: 10,
    cooldownTicks: 4,
    castTicks: 0,
    weight: 3,
    value: 50,
    description: "가볍고 빠르게 휘두를 수 있는 보조 단검.",
    attackType: "MELEE",
    iconKey: "DAGGER",
    tags: ["BLADE"],
  }),
  makeEquipment({
    id: "wpn_lifesaver",
    name: "응급 생체 팩",
    aliases: ["Life-saver"],
    damage: 0,
    staminaCost: 28,
    cooldownTicks: 0,
    castTicks: 0,
    weight: 2,
    value: 110,
    description: "체력이 절반 이하로 떨어지면 응급 회복을 발동합니다.",
    attackType: "MELEE",
    iconKey: "HEAL",
    tags: ["BIO"],
    effect: {
      type: "HEAL",
      amount: 50,
      hpThreshold: 0.5,
      oncePerBattle: true,
    },
  }),
  makeEquipment({
    id: "wpn_sniper",
    name: "편도 티켓 발권기",
    aliases: ["정밀 저격 소총", "Sniper Rifle"],
    damage: 34,
    staminaCost: 36,
    cooldownTicks: 8,
    castTicks: 4,
    weight: 15,
    value: 180,
    description:
      "긴 조준을 거쳐 원거리에서 방어막을 100% 관통하는 치명적인 일격(치명타 +35%)을 가합니다.",
    attackType: "RANGED",
    iconKey: "RIFLE",
    strategy: "WEAKEST",
    tags: ["FIREARM"],
    effect: {
      shieldPierce: 1,
      critChanceBonus: 0.35,
    },
  }),
  makeEquipment({
    id: "wpn_giant_slayer",
    name: "뚝배기 분쇄기",
    aliases: ["중량 파쇄 해머", "Giant Slayer"],
    damage: 24,
    staminaCost: 26,
    cooldownTicks: 6,
    castTicks: 2,
    weight: 10,
    value: 150,
    description:
      "체력이 높은 대상을 우선 노려 방어막을 50% 관통하며 치명타(+20%)로 내려찍는 육중한 파쇄 해머입니다.",
    attackType: "MELEE",
    iconKey: "AXE",
    strategy: "STRONGEST",
    tags: ["BLUNT"],
    effect: {
      shieldPierce: 0.5,
      critChanceBonus: 0.2,
    },
  }),
];

/** 한림그룹 제식 장비 2종 */
export const CORPORATE_EQUIPMENTS: readonly CatalogWeaponMaster[] = [
  makeEquipment({
    id: "hanlim-relief-carbine",
    name: "기업 구호용 카빈",
    damage: 14,
    staminaCost: 16,
    cooldownTicks: 4,
    castTicks: 0,
    weight: 3,
    value: 95,
    description: "기업 구호 부서에서 지급하는 경량 카빈.",
    attackType: "RANGED",
    iconKey: "RIFLE",
    tags: ["FIREARM"],
  }),
  makeEquipment({
    id: "hanlim-control-baton",
    name: "기업 제식 충격봉",
    aliases: ["제식 충격봉"],
    damage: 6,
    staminaCost: 12,
    cooldownTicks: 4,
    castTicks: 0,
    weight: 2,
    value: 75,
    description: "타격과 동시에 소량의 보호막을 전개하는 기업 제식 충격봉.",
    attackType: "MELEE",
    iconKey: "STAFF",
    tags: ["BLUNT", "TECH"],
    effect: {
      type: "SHIELD",
      shieldGain: 4,
    },
  }),
];

/** 16종 조합 재료 단일 원본 (모든 재료는 장착 가능하며 비소모형 전투 효과를 가짐) */
export const CRAFTING_MATERIALS: readonly CatalogWeaponMaster[] = [
  // 생활·주거 (4종)
  makeMaterial({
    id: "mat-tape",
    name: "고강도 테이프",
    damage: 0,
    staminaCost: 10,
    cooldownTicks: 8,
    weight: 1,
    value: 15,
    description: "장비 결속용 산업 테이프. 장착 시 즉석 방어로 보호막을 부여합니다.",
    tags: ["ARMOR"],
    effect: { type: "SHIELD", shieldGain: 8 },
  }),
  makeMaterial({
    id: "mat-wire",
    name: "구리 배선",
    damage: 2,
    staminaCost: 7,
    cooldownTicks: 7,
    weight: 1,
    value: 18,
    description: "전도율이 높은 피복 배선. 전기 충격과 함께 다음 슬롯을 가속합니다.",
    tags: ["TECH"],
    effect: { type: "SYNERGY", target: "NEXT", hasteTicks: 1 },
  }),
  makeMaterial({
    id: "mat-lighter",
    name: "휴대용 라이터",
    damage: 5,
    staminaCost: 10,
    cooldownTicks: 8,
    weight: 1,
    value: 16,
    description: "점화 및 열원 공급 장치. 점화 피해와 다음 슬롯 피해 보너스를 부여합니다.",
    tags: ["CHEM"],
    effect: { type: "SYNERGY", target: "NEXT", damageBonus: 3 },
  }),
  makeMaterial({
    id: "mat-electrolyte",
    name: "전해질 팩",
    damage: 0,
    staminaCost: 7,
    cooldownTicks: 8,
    weight: 1,
    value: 20,
    description: "생체 안정 및 냉각용 전해질. 체력과 스태미나를 소량 회복합니다.",
    iconKey: "HEAL",
    tags: ["BIO"],
    effect: {
      type: "HEAL",
      amount: 6,
      hpThreshold: 0.95,
      oncePerBattle: false,
      staminaRestore: 6,
    },
  }),
  // 상업·전자 (4종)
  makeMaterial({
    id: "mat-lens",
    name: "광학 렌즈",
    damage: 0,
    staminaCost: 10,
    cooldownTicks: 7,
    weight: 1,
    value: 32,
    description: "정밀 조준용 다중 코팅 렌즈. 다음 슬롯의 치명타 확률을 높입니다.",
    attackType: "RANGED",
    iconKey: "TARGET",
    tags: ["TECH", "FIREARM"],
    effect: { type: "SYNERGY", target: "NEXT", critChanceBonus: 0.15 },
  }),
  makeMaterial({
    id: "mat-relay",
    name: "고속 릴레이 칩",
    damage: 0,
    staminaCost: 10,
    cooldownTicks: 7,
    weight: 1,
    value: 38,
    description: "신호 지연 단축용 고속 스위치. 양옆 슬롯의 쿨다운을 줄입니다.",
    attackType: "RANGED",
    tags: ["TECH"],
    effect: { type: "SYNERGY", target: "ADJACENT", hasteTicks: 1 },
  }),
  makeMaterial({
    id: "mat-battery",
    name: "리튬 배터리",
    damage: 3,
    staminaCost: 0,
    cooldownTicks: 7,
    weight: 2,
    value: 35,
    description: "고밀도 휴대 전력 셀. 소모 없이 방전 타격과 함께 스태미나를 공급합니다.",
    tags: ["TECH"],
    effect: { type: "SYNERGY", staminaRestore: 10 },
  }),
  makeMaterial({
    id: "mat-ceramic",
    name: "방열 세라믹 판",
    damage: 0,
    staminaCost: 13,
    cooldownTicks: 9,
    weight: 2,
    value: 34,
    description: "과열 억제용 세라믹 방열판. 임시 방패로 활용해 큰 보호막을 얻습니다.",
    tags: ["ARMOR", "TECH"],
    effect: { type: "SHIELD", shieldGain: 14 },
  }),
  // 의료·생체 (4종)
  makeMaterial({
    id: "mat-biogel",
    name: "멸균 생체 젤",
    damage: 0,
    staminaCost: 16,
    cooldownTicks: 9,
    weight: 1,
    value: 42,
    description: "응급 조직 재생을 돕는 생체 젤. 체력이 감소했을 때 꾸준히 회복합니다.",
    iconKey: "HEAL",
    tags: ["BIO"],
    effect: {
      type: "HEAL",
      amount: 14,
      hpThreshold: 0.9,
      oncePerBattle: false,
    },
  }),
  makeMaterial({
    id: "mat-stimulant",
    name: "신경 자극제",
    damage: 0,
    staminaCost: 13,
    cooldownTicks: 7,
    weight: 1,
    value: 55,
    description: "반사 속도를 끌어올리는 약물. 스태미나를 보충하고 다음 슬롯을 가속·강화합니다.",
    iconKey: "HEAL",
    tags: ["BIO", "CHEM"],
    effect: {
      type: "SYNERGY",
      target: "NEXT",
      hasteTicks: 1,
      damageBonus: 4,
      staminaRestore: 8,
    },
  }),
  makeMaterial({
    id: "mat-anticoagulant",
    name: "항응고 용액",
    damage: 8,
    staminaCost: 13,
    cooldownTicks: 8,
    weight: 1,
    value: 48,
    description: "화학적 부식을 유지하는 특수 용액. 투척 피해 후 모든 [BLADE] 장비를 강화합니다.",
    attackType: "RANGED",
    tags: ["CHEM", "BIO"],
    effect: {
      type: "SYNERGY",
      target: "TAG",
      targetTag: "BLADE",
      damageBonus: 4,
    },
  }),
  makeMaterial({
    id: "mat-nanosuture",
    name: "나노 봉합사",
    damage: 4,
    staminaCost: 13,
    cooldownTicks: 8,
    weight: 1,
    value: 60,
    description: "미세 봉합 및 내구 보강 섬유. 절단 피해와 함께 체력 회복과 보호막을 부여합니다.",
    tags: ["BIO", "ARMOR", "BLADE"],
    effect: {
      type: "HEAL",
      amount: 6,
      hpThreshold: 0.95,
      oncePerBattle: false,
      shieldGain: 6,
    },
  }),
  // 산업·기반 외곽 (4종)
  makeMaterial({
    id: "mat-titanium",
    name: "경량 티타늄 프레임",
    damage: 7,
    staminaCost: 13,
    cooldownTicks: 8,
    weight: 2,
    value: 70,
    description: "초경량 고강도 합금 골격. 타격과 방호를 동시에 수행합니다.",
    tags: ["BLUNT", "ARMOR"],
    effect: { type: "SHIELD", shieldGain: 10 },
  }),
  makeMaterial({
    id: "mat-solenoid",
    name: "고압 솔레노이드",
    damage: 8,
    staminaCost: 16,
    cooldownTicks: 7,
    weight: 2,
    value: 85,
    description: "자기 가속 코일 부품. 강한 충격과 함께 다음 슬롯의 위력을 높입니다.",
    tags: ["TECH", "BLUNT"],
    effect: { type: "SYNERGY", target: "NEXT", damageBonus: 6 },
  }),
  makeMaterial({
    id: "mat-fuel",
    name: "특수 산업용 연료",
    damage: 10,
    staminaCost: 16,
    cooldownTicks: 8,
    weight: 2,
    value: 80,
    description: "고출력 순환용 정제 연료. 투척 화염 피해와 함께 모든 [TECH] 슬롯을 강화합니다.",
    attackType: "RANGED",
    tags: ["CHEM"],
    effect: {
      type: "SYNERGY",
      target: "TAG",
      targetTag: "TECH",
      damageBonus: 5,
    },
  }),
  makeMaterial({
    id: "mat-core",
    name: "차폐 동력 코어",
    damage: 5,
    staminaCost: 16,
    cooldownTicks: 8,
    weight: 3,
    value: 120,
    description: "다중우주 잔류 에너지 차폐 코어. 보호막 전개와 양옆 슬롯 가속을 동시에 수행합니다.",
    tags: ["TECH", "ARMOR"],
    effect: {
      type: "SYNERGY",
      target: "ADJACENT",
      hasteTicks: 1,
      shieldGain: 12,
    },
  }),
];

/** 6개 카테고리별 1차(1종) -> 2차(2갈래) 조합 장비 18종 */
export const CRAFTED_EQUIPMENTS: readonly CatalogWeaponMaster[] = [
  // 1. LOGISTICS (물류)
  makeEquipment({
    id: "eq-log-t1",
    name: "개조 전술 단검",
    damage: 9,
    staminaCost: 14,
    cooldownTicks: 6,
    castTicks: 0,
    weight: 2,
    value: 190,
    description: "다음 슬롯의 쿨다운을 단축시키는 경량 단검.",
    attackType: "MELEE",
    iconKey: "DAGGER",
    tags: ["BLADE"],
    effect: { type: "SYNERGY", target: "NEXT", hasteTicks: 1 },
  }),
  makeEquipment({
    id: "eq-log-t2a",
    name: "초경량 연쇄 단검",
    damage: 12,
    staminaCost: 14,
    cooldownTicks: 5,
    castTicks: 0,
    weight: 1,
    value: 420,
    description: "빠른 연타마다 다음 슬롯을 크게 가속합니다.",
    attackType: "MELEE",
    iconKey: "DAGGER",
    tags: ["BLADE", "TECH"],
    effect: { type: "SYNERGY", target: "NEXT", hasteTicks: 3 },
  }),
  makeEquipment({
    id: "eq-log-t2b",
    name: "강습 타격 단검",
    damage: 15,
    staminaCost: 17,
    cooldownTicks: 6,
    castTicks: 0,
    weight: 2,
    value: 440,
    description: "모든 [BLADE] 슬롯을 강화하고 장착된 [BLADE] 수만큼 위력이 증가합니다.",
    attackType: "MELEE",
    iconKey: "DAGGER",
    tags: ["BLADE"],
    effect: {
      type: "SYNERGY",
      target: "TAG",
      targetTag: "BLADE",
      damageBonus: 6,
      perTag: { tag: "BLADE", damageBonus: 2 },
    },
  }),

  // 2. COMMERCIAL (상업)
  makeEquipment({
    id: "eq-com-t1",
    name: "광학 조준 카빈",
    damage: 20,
    staminaCost: 14,
    cooldownTicks: 3,
    castTicks: 0,
    weight: 3,
    value: 210,
    description: "다음 슬롯의 치명타 확률을 높입니다.",
    attackType: "RANGED",
    iconKey: "RIFLE",
    tags: ["FIREARM", "TECH"],
    effect: { type: "SYNERGY", target: "NEXT", critChanceBonus: 0.25 },
  }),
  makeEquipment({
    id: "eq-com-t2a",
    name: "전술 마킹 카빈",
    damage: 24,
    staminaCost: 14,
    cooldownTicks: 3,
    castTicks: 0,
    weight: 3,
    value: 490,
    description: "모든 [FIREARM] 장비에 피해와 치명타 보너스를 부여합니다.",
    attackType: "RANGED",
    iconKey: "RIFLE",
    tags: ["FIREARM", "TECH"],
    effect: {
      type: "SYNERGY",
      target: "TAG",
      targetTag: "FIREARM",
      damageBonus: 10,
      critChanceBonus: 0.35,
    },
  }),
  makeEquipment({
    id: "eq-com-t2b",
    name: "양단 조준경 카빈",
    damage: 26,
    staminaCost: 17,
    cooldownTicks: 3,
    castTicks: 0,
    weight: 3,
    value: 470,
    description: "가장자리 끝 슬롯(01, 06)을 가속하고 강화합니다.",
    attackType: "RANGED",
    iconKey: "RIFLE",
    tags: ["FIREARM"],
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
    staminaCost: 8,
    cooldownTicks: 3,
    castTicks: 0,
    weight: 2,
    value: 180,
    description: "보호막과 스태미나를 확보하고 이전 슬롯을 가속합니다.",
    attackType: "MELEE",
    iconKey: "STAFF",
    tags: ["BLUNT", "TECH"],
    effect: {
      type: "SYNERGY",
      target: "PREV",
      hasteTicks: 1,
      staminaRestore: 8,
      shieldGain: 6,
    },
  }),
  makeEquipment({
    id: "eq-pub-t2a",
    name: "과충전 순환봉",
    damage: 14,
    staminaCost: 8,
    cooldownTicks: 3,
    castTicks: 0,
    weight: 2,
    value: 430,
    description: "보호막 전개와 스태미나 대량 보충을 하며 양옆 슬롯을 가속합니다.",
    attackType: "MELEE",
    iconKey: "STAFF",
    tags: ["BLUNT", "TECH", "CHEM"],
    effect: {
      type: "SYNERGY",
      target: "ADJACENT",
      hasteTicks: 2,
      staminaRestore: 16,
      shieldGain: 10,
    },
  }),
  makeEquipment({
    id: "eq-pub-t2b",
    name: "진압용 방전 해머",
    damage: 22,
    staminaCost: 20,
    cooldownTicks: 5,
    castTicks: 1,
    weight: 4,
    value: 460,
    description: "보호막([ARMOR]당 추가)과 스태미나를 확보하며 모든 [BLUNT] 무기의 치명타를 높입니다.",
    attackType: "MELEE",
    iconKey: "AXE",
    tags: ["BLUNT", "ARMOR"],
    effect: {
      type: "SYNERGY",
      target: "TAG",
      targetTag: "BLUNT",
      critChanceBonus: 0.4,
      staminaRestore: 10,
      shieldGain: 14,
      perTag: { tag: "ARMOR", shieldGain: 4 },
    },
  }),

  // 4. INFRA (기반)
  makeEquipment({
    id: "eq-inf-t1",
    name: "가속 릴레이 코일",
    damage: 4,
    staminaCost: 11,
    cooldownTicks: 4,
    castTicks: 0,
    weight: 2,
    value: 200,
    description: "양옆 슬롯의 재사용 대기를 줄이는 보조 코일.",
    attackType: "RANGED",
    iconKey: "STAFF",
    tags: ["TECH"],
    effect: { type: "SYNERGY", target: "ADJACENT", hasteTicks: 2 },
  }),
  makeEquipment({
    id: "eq-inf-t2a",
    name: "초전도 공명 코어",
    damage: 6,
    staminaCost: 11,
    cooldownTicks: 4,
    castTicks: 0,
    weight: 2,
    value: 550,
    description: "인접한 양옆 장비를 강력하게 가속·증폭하고 보호막 보너스를 부여합니다.",
    attackType: "RANGED",
    iconKey: "STAFF",
    tags: ["TECH", "ARMOR"],
    effect: {
      type: "SYNERGY",
      target: "ADJACENT",
      hasteTicks: 3,
      damageBonus: 8,
      shieldBonus: 8,
    },
  }),
  makeEquipment({
    id: "eq-inf-t2b",
    name: "양극 과부하 증폭기",
    damage: 6,
    staminaCost: 14,
    cooldownTicks: 5,
    castTicks: 0,
    weight: 3,
    value: 560,
    description: "끝 슬롯(01, 06)의 순환·치명타를 극대화하고 장착된 [TECH] 수에 비례해 피해를 줍니다.",
    attackType: "RANGED",
    iconKey: "STAFF",
    tags: ["TECH"],
    effect: {
      type: "SYNERGY",
      target: "EDGES",
      hasteTicks: 4,
      critChanceBonus: 0.5,
      perTag: { tag: "TECH", damageBonus: 3 },
    },
  }),

  // 5. MEDICAL (의료)
  makeEquipment({
    id: "eq-med-t1",
    name: "생체 자극 주입기",
    damage: 0,
    staminaCost: 28,
    cooldownTicks: 6,
    castTicks: 0,
    weight: 2,
    value: 240,
    description: "체력과 스태미나를 함께 회복하는 지속형 주입기.",
    attackType: "MELEE",
    iconKey: "HEAL",
    tags: ["BIO"],
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
    staminaCost: 24,
    cooldownTicks: 5,
    castTicks: 0,
    weight: 2,
    value: 520,
    description: "회복·보호막 부여와 동시에 모든 장착 슬롯을 가속합니다.",
    attackType: "MELEE",
    iconKey: "HEAL",
    tags: ["BIO", "ARMOR"],
    effect: {
      type: "HEAL",
      amount: 45,
      hpThreshold: 0.8,
      oncePerBattle: false,
      staminaRestore: 18,
      shieldGain: 12,
      target: "ALL_OTHER",
      hasteTicks: 2,
    },
  }),
  makeEquipment({
    id: "eq-med-t2b",
    name: "신경 과활성 주사기",
    damage: 12,
    staminaCost: 17,
    cooldownTicks: 4,
    castTicks: 0,
    weight: 2,
    value: 510,
    description: "자가 회복 후 다음 슬롯을 강하게 가속·강화합니다.",
    attackType: "MELEE",
    iconKey: "HEAL",
    tags: ["BIO", "CHEM"],
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
    staminaCost: 20,
    cooldownTicks: 6,
    castTicks: 0,
    weight: 4,
    value: 225,
    description: "2회 타격마다 보호막을 얻고 다음 슬롯을 강화합니다.",
    attackType: "MELEE",
    iconKey: "SWORD",
    tags: ["BLADE", "ARMOR"],
    effect: {
      type: "SYNERGY",
      target: "NEXT",
      damageBonus: 8,
      shieldGain: 8,
      triggerEveryNHits: 2,
    },
  }),
  makeEquipment({
    id: "eq-cul-t2a",
    name: "파동 공명검",
    damage: 22,
    staminaCost: 20,
    cooldownTicks: 6,
    castTicks: 0,
    weight: 4,
    value: 540,
    description: "2회 발동마다 보호막을 얻고 양옆 슬롯을 가속·강화합니다.",
    attackType: "MELEE",
    iconKey: "SWORD",
    tags: ["BLADE", "TECH"],
    effect: {
      type: "SYNERGY",
      target: "ADJACENT",
      damageBonus: 14,
      hasteTicks: 2,
      shieldGain: 10,
      triggerEveryNHits: 2,
    },
  }),
  makeEquipment({
    id: "eq-cul-t2b",
    name: "전술 지휘군도",
    damage: 19,
    staminaCost: 17,
    cooldownTicks: 5,
    castTicks: 0,
    weight: 4,
    value: 500,
    description: "매 공격마다 모든 [BLADE] 무기를 가속·강화하고 보호막 보너스를 부여합니다.",
    attackType: "MELEE",
    iconKey: "SWORD",
    tags: ["BLADE", "ARMOR"],
    effect: {
      type: "SYNERGY",
      target: "TAG",
      targetTag: "BLADE",
      damageBonus: 9,
      hasteTicks: 1,
      shieldBonus: 6,
    },
  }),
];

/** 소모품: 음식·음료(5종) + 치료 도구(4종) */
export const CONSUMABLES: readonly CatalogWeaponMaster[] = [
  makeConsumable({
    id: "food-ion-drink",
    name: "전해질 이온 음료",
    weight: 1,
    value: 25,
    description: "피로도를 25 회복하고 피로도가 남아 있는 동안 원거리 무기 쿨다운을 1틱 줄입니다.",
    consumable: {
      category: "FOOD",
      useMinutes: 0,
      fatigueRestore: 25,
      buff: { rangedCooldownReductionTicks: 1 },
    },
  }),
  makeConsumable({
    id: "food-energy-bar",
    name: "고열량 에너지 바",
    weight: 1,
    value: 30,
    description: "피로도를 35 회복하고 피로도가 남아 있는 동안 근접 무기 공격력을 2 높입니다.",
    consumable: {
      category: "FOOD",
      useMinutes: 0,
      fatigueRestore: 35,
      buff: { meleeDamageBonus: 2 },
    },
  }),
  makeConsumable({
    id: "food-combat-ration",
    name: "따뜻한 전투식량",
    weight: 2,
    value: 45,
    description: "피로도를 50 회복하고 피로도가 남아 있는 동안 최대 체력을 10 높입니다.",
    consumable: {
      category: "FOOD",
      useMinutes: 0,
      fatigueRestore: 50,
      buff: { maxHpBonus: 10 },
    },
  }),
  makeConsumable({
    id: "food-espresso-shot",
    name: "고카페인 에스프레소 샷",
    weight: 1,
    value: 30,
    description: "피로도를 20 회복하고 피로도가 남아 있는 동안 치명타 확률을 10% 높입니다.",
    consumable: {
      category: "FOOD",
      useMinutes: 0,
      fatigueRestore: 20,
      buff: { critChanceBonus: 0.1 },
    },
  }),
  makeConsumable({
    id: "food-blade-gel",
    name: "근신경 강화 영양 젤",
    weight: 1,
    value: 35,
    description: "피로도를 30 회복하고 피로도가 남아 있는 동안 도검 태그 무기 공격력을 3 높입니다.",
    tags: ["BLADE"],
    consumable: {
      category: "FOOD",
      useMinutes: 0,
      fatigueRestore: 30,
      buff: { tagDamageBonus: { tag: "BLADE", amount: 3 } },
    },
  }),
  makeConsumable({
    id: "med-bandage",
    name: "압박 붕대",
    weight: 1,
    value: 25,
    description: "10분을 소모해 체력을 25 회복합니다. 탐사 중 사용 시 조우 판정이 발생합니다.",
    consumable: {
      category: "MEDICAL",
      useMinutes: 10,
      hpRestore: 25,
    },
  }),
  makeConsumable({
    id: "med-tourniquet",
    name: "전술 지혈대",
    weight: 1,
    value: 45,
    description: "10분을 소모해 체력을 45 회복합니다. 탐사 중 사용 시 조우 판정이 발생합니다.",
    consumable: {
      category: "MEDICAL",
      useMinutes: 10,
      hpRestore: 45,
    },
  }),
  makeConsumable({
    id: "med-trauma-kit",
    name: "외상 응급 처치 키트",
    weight: 2,
    value: 75,
    description: "10분을 소모해 체력을 70 회복합니다. 탐사 중 사용 시 조우 판정이 발생합니다.",
    consumable: {
      category: "MEDICAL",
      useMinutes: 10,
      hpRestore: 70,
    },
  }),
  makeConsumable({
    id: "med-hemostatic-injector",
    name: "고급 지혈 주사기",
    weight: 1,
    value: 95,
    description: "시간 소모 없이 즉시 체력을 40 회복합니다.",
    consumable: {
      category: "MEDICAL",
      useMinutes: 0,
      hpRestore: 40,
    },
  }),
];

/** 특별 이벤트 보상용 유니크 장비 8종 (조합 불가, 고유 효과 및 태그 시너지) */
export const STANDALONE_EQUIPMENTS: readonly CatalogWeaponMaster[] = [
  makeEquipment({
    id: "eq-chem-canister",
    name: "매운맛 스프레이",
    aliases: ["부식성 연무 탄창"],
    damage: 8,
    staminaCost: 20,
    cooldownTicks: 6,
    castTicks: 0,
    weight: 3,
    value: 360,
    description:
      "부식성 연무를 뿜어 다음 슬롯을 1틱 가속하고 피해량(+5)과 치명타율(+12%)을 높입니다. 화학 장비 수만큼 자신의 피해도 증가합니다.",
    attackType: "RANGED",
    iconKey: "RIFLE",
    tags: ["CHEM", "FIREARM"],
    effect: {
      type: "SYNERGY",
      target: "NEXT",
      damageBonus: 5,
      critChanceBonus: 0.12,
      hasteTicks: 1,
      perTag: {
        tag: "CHEM",
        damageBonus: 2,
      },
    },
  }),
  makeEquipment({
    id: "eq-reactive-plate",
    name: "떼어온 방화문짝",
    aliases: ["반응 장갑판"],
    damage: 4,
    staminaCost: 17,
    cooldownTicks: 7,
    castTicks: 0,
    weight: 6,
    value: 400,
    description:
      "즉시 보호막(+12, 방호 장비당 +4)을 전개하고 양끝 슬롯의 다음 발동에 추가 보호막(+6)을 부여합니다.",
    attackType: "MELEE",
    iconKey: "AXE",
    tags: ["ARMOR", "TECH"],
    effect: {
      type: "SYNERGY",
      target: "EDGES",
      shieldGain: 12,
      shieldBonus: 6,
      perTag: {
        tag: "ARMOR",
        shieldGain: 4,
      },
    },
  }),
  makeEquipment({
    id: "eq-arc-emitter",
    name: "고압 전기파리채",
    aliases: ["소형 아크 방전기"],
    damage: 7,
    staminaCost: 14,
    cooldownTicks: 5,
    castTicks: 0,
    weight: 2,
    value: 350,
    description:
      "가장 체력이 높은 적을 지져 양옆 슬롯을 1틱 가속·치명타 +10% 강화하고, 기술 장비 수에 비례해 스태미나를 회복합니다.",
    attackType: "RANGED",
    iconKey: "STAFF",
    strategy: "STRONGEST",
    tags: ["TECH", "CHEM"],
    effect: {
      type: "SYNERGY",
      target: "ADJACENT",
      hasteTicks: 1,
      critChanceBonus: 0.1,
      staminaRestore: 5,
      perTag: {
        tag: "TECH",
        staminaRestore: 2,
      },
    },
  }),
  makeEquipment({
    id: "eq-trauma-autoinjector",
    name: "일단 안 죽는 주사기",
    aliases: ["전장 자동 지혈기"],
    damage: 0,
    staminaCost: 32,
    cooldownTicks: 10,
    castTicks: 0,
    weight: 2,
    value: 370,
    description:
      "체력이 75% 이하일 때 체력(+14, 생체당 +3)·보호막(+6)·스태미나(+6)를 채우고 양옆 슬롯을 1틱 가속·보호막(+5) 강화합니다.",
    attackType: "MELEE",
    iconKey: "HEAL",
    tags: ["BIO", "ARMOR"],
    effect: {
      type: "HEAL",
      amount: 14,
      hpThreshold: 0.75,
      oncePerBattle: false,
      shieldGain: 6,
      staminaRestore: 6,
      target: "ADJACENT",
      hasteTicks: 1,
      shieldBonus: 5,
      perTag: {
        tag: "BIO",
        healAmount: 3,
      },
    },
  }),
  makeEquipment({
    id: "eq-mono-katana",
    name: "고기 자르개",
    aliases: ["고주파 단분자도"],
    damage: 18,
    staminaCost: 26,
    cooldownTicks: 5,
    castTicks: 1,
    weight: 4,
    value: 480,
    description:
      "체력이 약한 적을 우선 베며 도검 장비 수만큼 피해를 보태고, 모든 화학 장비의 피해량(+6)과 치명타율(+15%)을 끌어올립니다.",
    attackType: "MELEE",
    iconKey: "SWORD",
    strategy: "WEAKEST",
    tags: ["BLADE", "CHEM"],
    effect: {
      type: "SYNERGY",
      target: "TAG",
      targetTag: "CHEM",
      damageBonus: 6,
      critChanceBonus: 0.15,
      perTag: {
        tag: "BLADE",
        damageBonus: 2,
      },
    },
  }),
  makeEquipment({
    id: "eq-summon-drone",
    name: "로케트 배송 기사",
    aliases: ["전술 정찰 드론 포트"],
    damage: 0,
    staminaCost: 24,
    cooldownTicks: 9,
    castTicks: 0,
    weight: 3,
    value: 450,
    description:
      "쿨다운마다 원거리 로케트 배송 드론을 계속 배치합니다. 동시에 최대 2기까지 유지됩니다.",
    attackType: "MELEE",
    iconKey: "STAFF",
    tags: ["TECH"],
    effect: {
      type: "SUMMON",
      summon: {
        id: "summon-recon-drone",
        name: "로케트 배송 드론",
        hp: 18,
        damage: 5,
        cooldownTicks: 3,
        attackType: "RANGED",
        tags: ["TECH"],
        count: 1,
        maxActive: 2,
      },
    },
  }),
  makeEquipment({
    id: "eq-summon-swarm",
    name: "개미떼 통조림",
    aliases: ["나노 생체 군체 캡슐"],
    damage: 0,
    staminaCost: 36,
    cooldownTicks: 12,
    castTicks: 0,
    weight: 2,
    value: 500,
    description:
      "배고픈 나노 개미떼 3기를 한꺼번에 풀어놓습니다. 모두 소멸하면 쿨다운 후 다시 3기를 소환합니다.",
    attackType: "MELEE",
    iconKey: "DAGGER",
    tags: ["BIO", "CHEM"],
    effect: {
      type: "SUMMON",
      summon: {
        id: "summon-nano-swarm",
        name: "배고픈 나노 개미떼",
        hp: 12,
        damage: 4,
        cooldownTicks: 2,
        attackType: "MELEE",
        tags: ["BIO", "CHEM"],
        count: 3,
        maxActive: 3,
        respawnOnlyWhenEmpty: true,
      },
    },
  }),
  makeEquipment({
    id: "eq-summon-turret",
    name: "B.F.E",
    aliases: ["중장갑 방어 포탑 코어", "자동 문지기 깡통"],
    damage: 0,
    staminaCost: 45,
    cooldownTicks: 15,
    castTicks: 2,
    weight: 6,
    value: 540,
    description:
      "역대 최고의 친구를 전개합니다. 포탑이 살아있을 때 재사용하면 체력을 25 회복하고 보호막을 보충합니다.",
    attackType: "MELEE",
    iconKey: "AXE",
    tags: ["TECH", "ARMOR"],
    effect: {
      type: "SUMMON",
      summon: {
        id: "summon-heavy-turret",
        name: "역대 최고의 친구",
        hp: 55,
        damage: 11,
        cooldownTicks: 4,
        attackType: "RANGED",
        tags: ["TECH", "ARMOR"],
        count: 1,
        maxActive: 1,
        shieldOnSummon: 15,
        healOnReactivate: 25,
        strategy: "STRONGEST",
      },
    },
  }),
];

export const GENE_AMPOULES: readonly CatalogWeaponMaster[] = [
  makeMaterial({
    id: "gene-ampoule-doyun",
    name: "강도윤 유전자 앰플",
    damage: 0,
    staminaCost: 0,
    cooldownTicks: 0,
    weight: 1,
    value: 260,
    description:
      "고스트 잔상에서 추출한 강도윤 계통 유전자 샘플. 거점 연구실에서 다른 개체에게 이식할 수 있습니다.",
    iconKey: "HEAL",
    tags: ["BIO"],
    effect: { type: "MATERIAL" },
  }),
  makeMaterial({
    id: "gene-ampoule-haerin",
    name: "서해린 유전자 앰플",
    damage: 0,
    staminaCost: 0,
    cooldownTicks: 0,
    weight: 1,
    value: 260,
    description:
      "고스트 잔상에서 추출한 서해린 계통 유전자 샘플. 거점 연구실에서 다른 개체에게 이식할 수 있습니다.",
    iconKey: "HEAL",
    tags: ["BIO"],
    effect: { type: "MATERIAL" },
  }),
  makeMaterial({
    id: "gene-ampoule-jiwon",
    name: "한지원 유전자 앰플",
    damage: 0,
    staminaCost: 0,
    cooldownTicks: 0,
    weight: 1,
    value: 260,
    description:
      "고스트 잔상에서 추출한 한지원 계통 유전자 샘플. 거점 연구실에서 다른 개체에게 이식할 수 있습니다.",
    iconKey: "HEAL",
    tags: ["BIO"],
    effect: { type: "MATERIAL" },
  }),
];

export const ALL_CATALOG_ITEMS: readonly CatalogWeaponMaster[] = [
  ...BASE_EQUIPMENTS,
  ...CORPORATE_EQUIPMENTS,
  ...CRAFTING_MATERIALS,
  ...GENE_AMPOULES,
  ...CRAFTED_EQUIPMENTS,
  ...STANDALONE_EQUIPMENTS,
  ...CONSUMABLES,
];

const CATALOG_BY_ID = new Map(
  ALL_CATALOG_ITEMS.map((item) => [item.id, item]),
);
const CATALOG_BY_NAME = new Map<string, CatalogWeaponMaster>();
for (const item of ALL_CATALOG_ITEMS) {
  CATALOG_BY_NAME.set(item.name, item);
  for (const alias of item.aliases ?? []) {
    if (!CATALOG_BY_NAME.has(alias)) {
      CATALOG_BY_NAME.set(alias, item);
    }
  }
}

export function getCatalogItemById(
  id: string,
): CatalogWeaponMaster | undefined {
  return CATALOG_BY_ID.get(id);
}

export function getCatalogItemByName(
  name: string,
): CatalogWeaponMaster | undefined {
  return CATALOG_BY_NAME.get(name);
}

export function getWeaponTags(
  item:
    | { id?: string; name?: string; tags?: WeaponTag[]; effect?: WeaponEffect | null }
    | null
    | undefined,
): WeaponTag[] {
  if (!item) return [];
  if (item.tags && item.tags.length > 0) return [...item.tags];
  if (item.effect?.tags && item.effect.tags.length > 0) {
    return [...item.effect.tags];
  }
  const byId = item.id ? CATALOG_BY_ID.get(item.id) : undefined;
  if (byId) return [...byId.tags];
  const byName = item.name ? CATALOG_BY_NAME.get(item.name) : undefined;
  return byName ? [...byName.tags] : [];
}

export function getItemKind(
  item: { id?: string; name?: string; effect?: unknown } | null | undefined,
): ItemKind {
  if (!item) return "EQUIPMENT";
  if (item.effect && typeof item.effect === "object") {
    const record = item.effect as { itemKind?: unknown; type?: unknown };
    if (record.itemKind === "MATERIAL" || record.type === "MATERIAL") {
      return "MATERIAL";
    }
  }
  const catalog =
    (item.id ? CATALOG_BY_ID.get(item.id) : undefined) ??
    (item.name ? CATALOG_BY_NAME.get(item.name) : undefined);
  if (catalog?.effect.itemKind === "MATERIAL") {
    return "MATERIAL";
  }
  return "EQUIPMENT";
}

export type ItemVisualTier =
  | "MATERIAL"
  | "CONSUMABLE"
  | "T1"
  | "T2"
  | "UNIQUE";

const UNIQUE_ITEM_IDS = new Set(STANDALONE_EQUIPMENTS.map((item) => item.id));
const CONSUMABLE_ITEM_IDS = new Set(CONSUMABLES.map((item) => item.id));

/**
 * 슬롯 배경 패턴 구분용 아이템 등급/분류를 판별합니다.
 * - MATERIAL: 조합 재료·유전자 앰플 (패턴 없음)
 * - CONSUMABLE: 음식·치료 소모품 (도트 패턴)
 * - T2: 2티어 조합 장비 (대각선 2중 그물 패턴)
 * - UNIQUE: 유니크 장비 8종 (사각형 그물 패턴)
 * - T1: 기본·제식·1티어 조합 장비 (단일 대각선 패턴)
 */
export function resolveItemVisualTier(
  item: { id?: string; name?: string } | null | undefined,
): ItemVisualTier {
  if (!item) return "T1";
  const catalog =
    (item.id ? CATALOG_BY_ID.get(item.id) : undefined) ??
    (item.name ? CATALOG_BY_NAME.get(item.name) : undefined);
  const id = catalog?.id ?? item.id ?? "";

  if (getItemKind(catalog ?? item) === "MATERIAL") {
    return "MATERIAL";
  }
  if (
    CONSUMABLE_ITEM_IDS.has(id) ||
    catalog?.effect.itemKind === "CONSUMABLE"
  ) {
    return "CONSUMABLE";
  }
  if (UNIQUE_ITEM_IDS.has(id)) {
    return "UNIQUE";
  }
  if (/^eq-[a-z]+-t2[a-z]?$/.test(id)) {
    return "T2";
  }
  return "T1";
}

/** DB에 저장된 구버전 아이템에 카탈로그의 최신 태그·스탯·효과를 보완한다. */
export function resolveCatalogWeaponData<T extends WeaponData>(weapon: T): T {
  const catalog =
    getCatalogItemById(weapon.id) ?? getCatalogItemByName(weapon.name);
  if (!catalog) {
    const tags = weapon.tags ?? weapon.effect?.tags;
    return tags ? { ...weapon, tags: [...tags] } : weapon;
  }

  const isLegacyZeroMaterial =
    getItemKind(weapon) === "MATERIAL" &&
    weapon.damage === 0 &&
    weapon.cooldownTicks === 0 &&
    weapon.staminaCost === 0 &&
    !weapon.effect?.shieldGain &&
    !weapon.effect?.amount &&
    !weapon.effect?.target &&
    !weapon.effect?.staminaRestore &&
    !weapon.effect?.perTag;

  const mergedEffect: WeaponEffect = isLegacyZeroMaterial
    ? { ...catalog.effect, tags: [...catalog.tags] }
    : {
        ...catalog.effect,
        ...(weapon.effect ?? {}),
        tags: weapon.effect?.tags ?? [...catalog.tags],
      };

  const resolvedTags = weapon.tags ?? weapon.effect?.tags ?? [...catalog.tags];

  return {
    ...weapon,
    ...(isLegacyZeroMaterial
      ? {
          damage: catalog.damage,
          staminaCost: catalog.staminaCost,
          cooldownTicks: catalog.cooldownTicks,
          castTicks: catalog.castTicks,
        }
      : {}),
    strategy: weapon.strategy ?? catalog.strategy,
    tags: resolvedTags,
    effect: mergedEffect,
  };
}

const TARGET_LABELS: Record<SynergyTargetRule, string> = {
  NEXT: "NEXT",
  PREV: "PREV",
  ADJACENT: "ADJ",
  EDGES: "EDGE",
  ALL_MELEE: "MELEE",
  ALL_RANGED: "RANGED",
  ALL_OTHER: "ALL",
  TAG: "TAG",
};

export function formatSynergySummary(
  effect: WeaponEffect | WeaponData["effect"] | null | undefined,
): string | null {
  if (!effect) return null;
  const parts: string[] = [];
  if (effect.consumable) {
    const c = effect.consumable;
    if (c.hpRestore) parts.push(`HP +${c.hpRestore}`);
    if (c.fatigueRestore) parts.push(`FAT +${c.fatigueRestore}`);
    if (c.buff?.maxHpBonus) parts.push(`MAXHP +${c.buff.maxHpBonus}`);
    if (c.buff?.meleeDamageBonus) parts.push(`MELEE +${c.buff.meleeDamageBonus}DMG`);
    if (c.buff?.rangedCooldownReductionTicks) {
      parts.push(`RANGED -${c.buff.rangedCooldownReductionTicks}t`);
    }
    if (c.buff?.critChanceBonus) {
      parts.push(`CRIT +${Math.round(c.buff.critChanceBonus * 100)}%`);
    }
    if (c.buff?.tagDamageBonus) {
      parts.push(`[${c.buff.tagDamageBonus.tag}] +${c.buff.tagDamageBonus.amount}DMG`);
    }
    if (c.useMinutes > 0) parts.push(`${c.useMinutes}m`);
    return parts.length > 0 ? parts.join(" · ") : null;
  }
  if (effect.shieldGain) parts.push(`SHD +${effect.shieldGain}`);
  if (effect.target) {
    const label =
      effect.target === "TAG" && effect.targetTag
        ? `[${effect.targetTag}]`
        : TARGET_LABELS[effect.target];
    if (effect.hasteTicks) parts.push(`${label} -${effect.hasteTicks}t`);
    if (effect.damageBonus) parts.push(`${label} +${effect.damageBonus}DMG`);
    if (effect.critChanceBonus)
      parts.push(`${label} +${Math.round(effect.critChanceBonus * 100)}%CRIT`);
    if (effect.shieldBonus) parts.push(`${label} +${effect.shieldBonus}SHD`);
  }
  if (effect.staminaRestore) parts.push(`ENG +${effect.staminaRestore}`);
  if (effect.type === "HEAL" && effect.amount) parts.push(`HP +${effect.amount}`);
  if (effect.perTag) {
    const perTagParts: string[] = [];
    if (effect.perTag.damageBonus)
      perTagParts.push(`+${effect.perTag.damageBonus}DMG`);
    if (effect.perTag.shieldGain)
      perTagParts.push(`+${effect.perTag.shieldGain}SHD`);
    if (effect.perTag.healAmount)
      perTagParts.push(`+${effect.perTag.healAmount}HP`);
    if (effect.perTag.staminaRestore)
      perTagParts.push(`+${effect.perTag.staminaRestore}ENG`);
    if (perTagParts.length > 0) {
      parts.push(`[${effect.perTag.tag}]×(${perTagParts.join("/")})`);
    }
  }
  if (effect.triggerEveryNHits && effect.triggerEveryNHits > 1) {
    parts.push(`${effect.triggerEveryNHits}HIT`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

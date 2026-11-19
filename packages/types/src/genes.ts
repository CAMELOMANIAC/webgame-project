import type { CharacterVariantStats } from "./characterVariants";
import type { WeaponData, WeaponEffect, WeaponTag } from "./index";

export type GeneGrade = "COMMON" | "RARE" | "EPIC";
export type GenePoolScope = "COMMON" | "UNIQUE";

export const GENE_SLOT_COUNT = 10;

export const GENE_GRADE_CAPS: Record<GeneGrade, number> = {
  COMMON: GENE_SLOT_COUNT,
  RARE: 3,
  EPIC: 1,
};

export const GENE_GRADE_LABELS: Record<GeneGrade, string> = {
  COMMON: "일반",
  RARE: "희귀",
  EPIC: "특급",
};

/** 유전자 재조합 비용 (크레딧 + 재료) */
export const GENE_REROLL_CREDIT_COST = 150;
export const GENE_REROLL_MATERIAL_ID = "mat-biogel";
export const GENE_REROLL_MATERIAL_QTY = 1;
export const GENE_REROLL_CHOICE_COUNT = 3;

/** 고스트 전투 승리 시 유전자 앰플 드랍 확률 */
export const GHOST_AMPOULE_DROP_CHANCE = 0.15;

export interface GenePassiveEffect {
  tagBonus?: {
    tag: WeaponTag;
    /** 퍼센트 증가율 (예: 6 = +6%) */
    pct: number;
  };
  critChanceBonus?: number;
  meleeDamageBonus?: number;
  rangedDamageBonus?: number;
  startingShield?: number;
}

export interface GeneActiveEffect {
  id: string;
  name: string;
  damage: number;
  cooldownTicks: number;
  castTicks: number;
  attackType: "MELEE" | "RANGED";
  effect?: WeaponEffect;
}

export interface GeneDefinition {
  id: string;
  name: string;
  grade: GeneGrade;
  pool: GenePoolScope;
  /** UNIQUE 풀일 때 원래 소유 캐릭터의 CharacterDefinition.id */
  ownerDefinitionId?: string;
  summary: string;
  stats?: Partial<CharacterVariantStats>;
  passive?: GenePassiveEffect;
  active?: GeneActiveEffect;
}

export interface PendingGeneReroll {
  slotIndex: number;
  candidateGeneIds: string[];
  ampouleItemId?: string | null;
}

export interface CharacterGeneProfile {
  slots: string[];
  pendingReroll?: PendingGeneReroll | null;
}

export const GENE_AMPOULE_BY_DEFINITION_ID: Record<string, string> = {
  "legacy-survivor": "gene-ampoule-doyun",
  "survivor-haerin": "gene-ampoule-haerin",
  "survivor-jiwon": "gene-ampoule-jiwon",
};

export const DEFINITION_ID_BY_GENE_AMPOULE: Record<string, string> = {
  "gene-ampoule-doyun": "legacy-survivor",
  "gene-ampoule-haerin": "survivor-haerin",
  "gene-ampoule-jiwon": "survivor-jiwon",
};

export function getGeneAmpouleOwnerDefinitionId(
  itemId?: string | null,
): string | null {
  if (!itemId) return null;
  return DEFINITION_ID_BY_GENE_AMPOULE[itemId] ?? null;
}

export const GENE_CATALOG: readonly GeneDefinition[] = [
  // ── 공통 유전자 풀: COMMON (12종) ──
  {
    id: "gene-c-hp",
    name: "근섬유 강화",
    grade: "COMMON",
    pool: "COMMON",
    summary: "최대 체력 +8",
    stats: { maxHp: 8 },
  },
  {
    id: "gene-c-stamina",
    name: "폐활량 증폭",
    grade: "COMMON",
    pool: "COMMON",
    summary: "최대 스태미나 +10",
    stats: { maxStamina: 10 },
  },
  {
    id: "gene-c-regen",
    name: "대사 촉진",
    grade: "COMMON",
    pool: "COMMON",
    summary: "스태미나 회복 +1",
    stats: { staminaRegen: 1 },
  },
  {
    id: "gene-c-fatigue",
    name: "지구력 보정",
    grade: "COMMON",
    pool: "COMMON",
    summary: "최대 피로도 +10",
    stats: { maxFatigue: 10 },
  },
  {
    id: "gene-c-weight",
    name: "골격 보강",
    grade: "COMMON",
    pool: "COMMON",
    summary: "최대 적재 중량 +5kg",
    stats: { maxWeight: 5 },
  },
  {
    id: "gene-c-melee",
    name: "근접 반사",
    grade: "COMMON",
    pool: "COMMON",
    summary: "근접 무기 피해 +2",
    passive: { meleeDamageBonus: 2 },
  },
  {
    id: "gene-c-ranged",
    name: "안구 초점",
    grade: "COMMON",
    pool: "COMMON",
    summary: "원거리 무기 피해 +2",
    passive: { rangedDamageBonus: 2 },
  },
  {
    id: "gene-c-crit",
    name: "급소 인지",
    grade: "COMMON",
    pool: "COMMON",
    summary: "치명타 확률 +3%",
    passive: { critChanceBonus: 0.03 },
  },
  {
    id: "gene-c-shield",
    name: "피하 완충",
    grade: "COMMON",
    pool: "COMMON",
    summary: "전투 시작 시 보호막 +6",
    passive: { startingShield: 6 },
  },
  {
    id: "gene-c-blade",
    name: "도검 숙련",
    grade: "COMMON",
    pool: "COMMON",
    summary: "도검 장비 효율 +5%",
    passive: { tagBonus: { tag: "BLADE", pct: 5 } },
  },
  {
    id: "gene-c-firearm",
    name: "화기 숙련",
    grade: "COMMON",
    pool: "COMMON",
    summary: "화기 장비 효율 +5%",
    passive: { tagBonus: { tag: "FIREARM", pct: 5 } },
  },
  {
    id: "gene-c-tech",
    name: "기계 친화",
    grade: "COMMON",
    pool: "COMMON",
    summary: "기계 장비 효율 +5%",
    passive: { tagBonus: { tag: "TECH", pct: 5 } },
  },

  // ── 공통 유전자 풀: RARE (6종) ──
  {
    id: "gene-r-vital",
    name: "고밀도 심폐",
    grade: "RARE",
    pool: "COMMON",
    summary: "최대 체력 +14 · 최대 피로도 +10",
    stats: { maxHp: 14, maxFatigue: 10 },
  },
  {
    id: "gene-r-pack",
    name: "근골격 확장",
    grade: "RARE",
    pool: "COMMON",
    summary: "최대 중량 +12kg · 최대 스태미나 +8",
    stats: { maxWeight: 12, maxStamina: 8 },
  },
  {
    id: "gene-r-barrier",
    name: "피막 경화",
    grade: "RARE",
    pool: "COMMON",
    summary: "전투 시작 보호막 +14 · 방호 효율 +8%",
    passive: {
      startingShield: 14,
      tagBonus: { tag: "ARMOR", pct: 8 },
    },
  },
  {
    id: "gene-r-adrenaline",
    name: "아드레날린 분비",
    grade: "RARE",
    pool: "COMMON",
    summary: "[자동] HP 45% 이하 시 1회 체력 +18 · 스태미나 +18 회복",
    active: {
      id: "gene-act-adrenaline",
      name: "아드레날린 분비",
      damage: 0,
      cooldownTicks: 6,
      castTicks: 0,
      attackType: "MELEE",
      effect: {
        type: "HEAL",
        tags: ["BIO"],
        amount: 18,
        staminaRestore: 18,
        hpThreshold: 0.45,
        oncePerBattle: true,
      },
    },
  },
  {
    id: "gene-r-static",
    name: "정전기 방출",
    grade: "RARE",
    pool: "COMMON",
    summary: "[자동] 주기적으로 기계 원거리 피해 10 방출",
    active: {
      id: "gene-act-static",
      name: "정전기 방출",
      damage: 10,
      cooldownTicks: 26,
      castTicks: 0,
      attackType: "RANGED",
      effect: { tags: ["TECH"] },
    },
  },
  {
    id: "gene-r-clot",
    name: "응급 지혈 반응",
    grade: "RARE",
    pool: "COMMON",
    summary: "[자동] 주기적으로 체력 +8 자동 회복",
    active: {
      id: "gene-act-clot",
      name: "응급 지혈 반응",
      damage: 0,
      cooldownTicks: 30,
      castTicks: 0,
      attackType: "MELEE",
      effect: {
        type: "HEAL",
        tags: ["BIO"],
        amount: 8,
        hpThreshold: 0.9,
        oncePerBattle: false,
      },
    },
  },

  // ── 공통 유전자 풀: EPIC (2종) ──
  {
    id: "gene-e-overclock",
    name: "신경 과부하",
    grade: "EPIC",
    pool: "COMMON",
    summary: "스태미나 +20 · 회복 +3 · 치명타 +7%",
    stats: { maxStamina: 20, staminaRegen: 3 },
    passive: { critChanceBonus: 0.07 },
  },
  {
    id: "gene-e-aegis",
    name: "자율 방호 반응",
    grade: "EPIC",
    pool: "COMMON",
    summary: "[자동] 주기적으로 보호막 +14 전개 및 반격 피해 8",
    active: {
      id: "gene-act-aegis",
      name: "자율 방호 반응",
      damage: 8,
      cooldownTicks: 28,
      castTicks: 0,
      attackType: "MELEE",
      effect: {
        type: "SHIELD",
        tags: ["ARMOR", "TECH"],
        shieldGain: 14,
      },
    },
  },

  // ── 강도윤 고유 유전자 풀 (`legacy-survivor`, 3종) ──
  {
    id: "gene-u-doyun-c",
    name: "전술 호흡",
    grade: "COMMON",
    pool: "UNIQUE",
    ownerDefinitionId: "legacy-survivor",
    summary: "[강도윤 고유] 스태미나 +12 · 화기 효율 +6%",
    stats: { maxStamina: 12 },
    passive: { tagBonus: { tag: "FIREARM", pct: 6 } },
  },
  {
    id: "gene-u-doyun-r",
    name: "반사 사격 신경",
    grade: "RARE",
    pool: "UNIQUE",
    ownerDefinitionId: "legacy-survivor",
    summary: "[강도윤 고유·자동] 주기적으로 원거리 견제 사격(피해 14)",
    active: {
      id: "gene-act-doyun-reflex",
      name: "반사 사격 신경",
      damage: 14,
      cooldownTicks: 28,
      castTicks: 0,
      attackType: "RANGED",
      effect: { tags: ["FIREARM"] },
    },
  },
  {
    id: "gene-u-doyun-e",
    name: "돌파선 각인",
    grade: "EPIC",
    pool: "UNIQUE",
    ownerDefinitionId: "legacy-survivor",
    summary: "[강도윤 고유·자동] 체력 +18 · HP 55% 이하 1회 보호막 +26",
    stats: { maxHp: 18 },
    active: {
      id: "gene-act-doyun-breach",
      name: "돌파선 각인",
      damage: 0,
      cooldownTicks: 8,
      castTicks: 0,
      attackType: "MELEE",
      effect: {
        type: "SHIELD",
        tags: ["ARMOR"],
        shieldGain: 26,
        hpThreshold: 0.55,
        oncePerBattle: true,
      },
    },
  },

  // ── 서해린 고유 유전자 풀 (`survivor-haerin`, 3종) ──
  {
    id: "gene-u-haerin-c",
    name: "하중 분산 골격",
    grade: "COMMON",
    pool: "UNIQUE",
    ownerDefinitionId: "survivor-haerin",
    summary: "[서해린 고유] 최대 중량 +10kg · 최대 피로도 +8",
    stats: { maxWeight: 10, maxFatigue: 8 },
  },
  {
    id: "gene-u-haerin-r",
    name: "외골격 충격파",
    grade: "RARE",
    pool: "UNIQUE",
    ownerDefinitionId: "survivor-haerin",
    summary: "[서해린 고유·자동] 주기적으로 근접 충격파(피해 15) + 스태미나 +8",
    active: {
      id: "gene-act-haerin-shock",
      name: "외골격 충격파",
      damage: 15,
      cooldownTicks: 30,
      castTicks: 0,
      attackType: "MELEE",
      effect: { tags: ["BLUNT", "TECH"], staminaRestore: 8 },
    },
  },
  {
    id: "gene-u-haerin-e",
    name: "자율 회수 드론",
    grade: "EPIC",
    pool: "UNIQUE",
    ownerDefinitionId: "survivor-haerin",
    summary: "[서해린 고유·자동] 중량 +12kg · 전투 중 소형 회수 드론 자동 전개",
    stats: { maxWeight: 12 },
    active: {
      id: "gene-act-haerin-drone",
      name: "자율 회수 드론",
      damage: 0,
      cooldownTicks: 34,
      castTicks: 0,
      attackType: "RANGED",
      effect: {
        type: "SUMMON",
        tags: ["TECH"],
        summon: {
          id: "summon-haerin-drone",
          name: "회수 드론",
          hp: 32,
          damage: 9,
          cooldownTicks: 22,
          attackType: "RANGED",
          tags: ["TECH"],
          count: 1,
          maxActive: 1,
          respawnOnlyWhenEmpty: true,
        },
      },
    },
  },

  // ── 한지원 고유 유전자 풀 (`survivor-jiwon`, 3종) ──
  {
    id: "gene-u-jiwon-c",
    name: "항체 적응",
    grade: "COMMON",
    pool: "UNIQUE",
    ownerDefinitionId: "survivor-jiwon",
    summary: "[한지원 고유] 최대 체력 +10 · 생체 효율 +6%",
    stats: { maxHp: 10 },
    passive: { tagBonus: { tag: "BIO", pct: 6 } },
  },
  {
    id: "gene-u-jiwon-r",
    name: "자가 재생 세포",
    grade: "RARE",
    pool: "UNIQUE",
    ownerDefinitionId: "survivor-jiwon",
    summary: "[한지원 고유·자동] 주기적으로 체력 +14 자가 회복",
    active: {
      id: "gene-act-jiwon-regen",
      name: "자가 재생 세포",
      damage: 0,
      cooldownTicks: 32,
      castTicks: 0,
      attackType: "MELEE",
      effect: {
        type: "HEAL",
        tags: ["BIO"],
        amount: 14,
        hpThreshold: 0.92,
        oncePerBattle: false,
      },
    },
  },
  {
    id: "gene-u-jiwon-e",
    name: "생체 촉매 활성화",
    grade: "EPIC",
    pool: "UNIQUE",
    ownerDefinitionId: "survivor-jiwon",
    summary: "[한지원 고유·자동] 스태미나 회복 +3 · 화학 +12% · 주기적 화학 투사(12) + 회복(8)",
    stats: { staminaRegen: 3 },
    passive: { tagBonus: { tag: "CHEM", pct: 12 } },
    active: {
      id: "gene-act-jiwon-catalyst",
      name: "생체 촉매 활성화",
      damage: 12,
      cooldownTicks: 30,
      castTicks: 0,
      attackType: "RANGED",
      effect: {
        type: "HEAL",
        tags: ["CHEM", "BIO"],
        amount: 8,
        hpThreshold: 0.95,
        oncePerBattle: false,
      },
    },
  },
];

const GENE_BY_ID = new Map<string, GeneDefinition>(
  GENE_CATALOG.map((gene) => [gene.id, gene]),
);

export function getGeneById(geneId: string): GeneDefinition | undefined {
  return GENE_BY_ID.get(geneId);
}

export function countGeneGrades(
  geneIds: readonly string[],
): Record<GeneGrade, number> {
  const counts: Record<GeneGrade, number> = { COMMON: 0, RARE: 0, EPIC: 0 };
  for (const id of geneIds) {
    const gene = GENE_BY_ID.get(id);
    if (gene) counts[gene.grade] += 1;
  }
  return counts;
}

export function validateGeneGradeCaps(geneIds: readonly string[]): boolean {
  const counts = countGeneGrades(geneIds);
  return (
    counts.RARE <= GENE_GRADE_CAPS.RARE && counts.EPIC <= GENE_GRADE_CAPS.EPIC
  );
}

function weightedPick<T>(
  items: readonly T[],
  weightFn: (item: T) => number,
  random: () => number,
): T | undefined {
  if (items.length === 0) return undefined;
  let total = 0;
  for (const item of items) total += Math.max(0, weightFn(item));
  if (total <= 0) return items[0];
  let roll = random() * total;
  for (const item of items) {
    roll -= Math.max(0, weightFn(item));
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

function geneRollWeight(gene: GeneDefinition, preferUnique = false): number {
  const gradeWeight =
    gene.grade === "EPIC" ? 12 : gene.grade === "RARE" ? 32 : 100;
  const poolWeight = preferUnique && gene.pool === "UNIQUE" ? 3.5 : 1;
  return gradeWeight * poolWeight;
}

/**
 * 캐릭터 생성 시 고유 유전자 풀 + 공통 유전자 풀에서 등급 제한을 준수하며 10개 슬롯을 랜덤 조합합니다.
 */
export function rollInitialCharacterGenes(
  definitionId: string,
  random: () => number = Math.random,
): CharacterGeneProfile {
  const pool = GENE_CATALOG.filter(
    (g) => g.pool === "COMMON" || g.ownerDefinitionId === definitionId,
  );
  const chosen: string[] = [];
  const chosenSet = new Set<string>();
  const gradeCounts: Record<GeneGrade, number> = {
    COMMON: 0,
    RARE: 0,
    EPIC: 0,
  };

  // 고유 유전자 1개를 먼저 보장(가능한 경우)
  const ownUniquePool = pool.filter((g) => g.pool === "UNIQUE");
  const firstUnique = weightedPick(
    ownUniquePool,
    (g) => geneRollWeight(g, true),
    random,
  );
  if (firstUnique) {
    chosen.push(firstUnique.id);
    chosenSet.add(firstUnique.id);
    gradeCounts[firstUnique.grade] += 1;
  }

  while (chosen.length < GENE_SLOT_COUNT) {
    const eligible = pool.filter(
      (g) =>
        !chosenSet.has(g.id) &&
        gradeCounts[g.grade] < GENE_GRADE_CAPS[g.grade],
    );
    if (eligible.length === 0) break;
    const picked = weightedPick(
      eligible,
      (g) => geneRollWeight(g, false),
      random,
    );
    if (!picked) break;
    chosen.push(picked.id);
    chosenSet.add(picked.id);
    gradeCounts[picked.grade] += 1;
  }

  return { slots: chosen, pendingReroll: null };
}

/**
 * 선택한 슬롯을 재조합할 때 제시할 후보 3종을 추출합니다.
 * - 다른 슬롯에 이미 장착된 유전자와 중복되지 않으며, 등급 제한(RARE 3 / EPIC 1)을 초과하지 않습니다.
 * - `ampouleOwnerDefinitionId`가 주어지면 해당 캐릭터의 고유 유전자 풀을 최우선으로 포함합니다.
 */
export function rollGeneRerollCandidates(
  currentSlots: readonly string[],
  slotIndex: number,
  characterDefinitionId: string,
  ampouleOwnerDefinitionId?: string | null,
  random: () => number = Math.random,
): string[] {
  const otherSlots = currentSlots.filter((_, idx) => idx !== slotIndex);
  const otherSet = new Set(otherSlots);
  const currentGeneId = currentSlots[slotIndex];
  const otherGradeCounts = countGeneGrades(otherSlots);

  const canEquip = (g: GeneDefinition) =>
    !otherSet.has(g.id) &&
    g.id !== currentGeneId &&
    otherGradeCounts[g.grade] < GENE_GRADE_CAPS[g.grade];

  const basePool = GENE_CATALOG.filter(
    (g) =>
      canEquip(g) &&
      (g.pool === "COMMON" ||
        g.ownerDefinitionId === characterDefinitionId ||
        (ampouleOwnerDefinitionId &&
          g.ownerDefinitionId === ampouleOwnerDefinitionId)),
  );

  const candidates: string[] = [];
  const pickedSet = new Set<string>();

  // 앰플을 사용한 경우: 앰플 대상 캐릭터의 고유 유전자를 가능한 한 전부(최대 3개) 후보에 우선 배치
  if (ampouleOwnerDefinitionId) {
    const ampouleGenes = basePool.filter(
      (g) =>
        g.pool === "UNIQUE" &&
        g.ownerDefinitionId === ampouleOwnerDefinitionId,
    );
    const remainingAmpoule = [...ampouleGenes];
    while (
      candidates.length < GENE_REROLL_CHOICE_COUNT &&
      remainingAmpoule.length > 0
    ) {
      const picked = weightedPick(
        remainingAmpoule,
        (g) => geneRollWeight(g, true),
        random,
      );
      if (!picked) break;
      candidates.push(picked.id);
      pickedSet.add(picked.id);
      const idx = remainingAmpoule.findIndex((g) => g.id === picked.id);
      if (idx >= 0) remainingAmpoule.splice(idx, 1);
    }
  }

  while (candidates.length < GENE_REROLL_CHOICE_COUNT) {
    const eligible = basePool.filter((g) => !pickedSet.has(g.id));
    if (eligible.length === 0) break;
    const picked = weightedPick(
      eligible,
      (g) => geneRollWeight(g, Boolean(ampouleOwnerDefinitionId)),
      random,
    );
    if (!picked) break;
    candidates.push(picked.id);
    pickedSet.add(picked.id);
  }

  return candidates;
}

/**
 * 기본 능력치에 유전자 슬롯의 스탯 증감을 합산해 최종 캐릭터 능력치를 계산합니다.
 */
export function computeCharacterStatsFromGenes(
  baseStats: CharacterVariantStats,
  geneIds: readonly string[],
): CharacterVariantStats {
  const result: CharacterVariantStats = { ...baseStats };
  for (const id of geneIds) {
    const gene = GENE_BY_ID.get(id);
    if (!gene?.stats) continue;
    if (gene.stats.maxHp) result.maxHp += gene.stats.maxHp;
    if (gene.stats.maxStamina) result.maxStamina += gene.stats.maxStamina;
    if (gene.stats.staminaRegen) result.staminaRegen += gene.stats.staminaRegen;
    if (gene.stats.maxFatigue) result.maxFatigue += gene.stats.maxFatigue;
    if (gene.stats.maxWeight) result.maxWeight += gene.stats.maxWeight;
  }
  result.maxHp = Math.max(40, result.maxHp);
  result.maxStamina = Math.max(40, result.maxStamina);
  result.staminaRegen = Math.max(4, result.staminaRegen);
  result.maxFatigue = Math.max(40, result.maxFatigue);
  result.maxWeight = Math.max(20, result.maxWeight);
  return result;
}

/**
 * 전투 시뮬레이터에서 자동 발동하는 액티브 유전자 목록을 가상 WeaponData 배열로 변환합니다.
 */
export function resolveGeneActiveWeapons(
  geneIds?: readonly string[] | null,
): WeaponData[] {
  if (!geneIds || geneIds.length === 0) return [];
  const weapons: WeaponData[] = [];
  for (const id of geneIds) {
    const gene = GENE_BY_ID.get(id);
    if (!gene?.active) continue;
    weapons.push({
      id: gene.active.id,
      name: gene.active.name,
      damage: gene.active.damage,
      staminaCost: 0,
      cooldownTicks: gene.active.cooldownTicks,
      castTicks: gene.active.castTicks,
      weight: 0,
      value: 0,
      attackType: gene.active.attackType,
      effect: gene.active.effect,
    });
  }
  return weapons;
}

/**
 * 전투 시뮬레이터용 유전자 패시브 합산 결과를 반환합니다.
 */
export function aggregateGenePassives(geneIds?: readonly string[] | null): {
  meleeDamageBonus: number;
  rangedDamageBonus: number;
  critChanceBonus: number;
  startingShield: number;
  tagBonusPct: Partial<Record<WeaponTag, number>>;
} {
  const agg = {
    meleeDamageBonus: 0,
    rangedDamageBonus: 0,
    critChanceBonus: 0,
    startingShield: 0,
    tagBonusPct: {} as Partial<Record<WeaponTag, number>>,
  };
  if (!geneIds) return agg;
  for (const id of geneIds) {
    const p = GENE_BY_ID.get(id)?.passive;
    if (!p) continue;
    if (p.meleeDamageBonus) agg.meleeDamageBonus += p.meleeDamageBonus;
    if (p.rangedDamageBonus) agg.rangedDamageBonus += p.rangedDamageBonus;
    if (p.critChanceBonus) agg.critChanceBonus += p.critChanceBonus;
    if (p.startingShield) agg.startingShield += p.startingShield;
    if (p.tagBonus) {
      agg.tagBonusPct[p.tagBonus.tag] =
        (agg.tagBonusPct[p.tagBonus.tag] ?? 0) + p.tagBonus.pct;
    }
  }
  return agg;
}

import type { WeaponTag } from "./index";

export interface CharacterVariantStats {
  maxHp: number;
  maxStamina: number;
  staminaRegen: number;
  maxFatigue: number;
  maxWeight: number;
}

export interface CharacterVariantSpec {
  id: string;
  definitionId: string;
  definitionName: string;
  worldlineLabel: string;
  roleLabel: string;
  summary: string;
  specialtyTags: readonly WeaponTag[];
  /** 특화 태그 장비의 피해·회복·방호 효율 증가율(%) */
  specialtyBonusPct: number;
  stats: CharacterVariantStats;
}

/**
 * 다중우주 생존자 변주(`CharacterVariant`) 카탈로그.
 * - `legacy-origin`은 기존 DB 레코드 및 테스트 호환을 위해 기본 스탯을 유지합니다.
 * - 동일 인물의 다른 세계선 변주와 타 생존자 개체 간 스탯·특화 태그를 뚜렷하게 차별화합니다.
 */
export const CHARACTER_VARIANT_CATALOG: readonly CharacterVariantSpec[] = [
  {
    id: "legacy-origin",
    definitionId: "legacy-survivor",
    definitionName: "강도윤",
    worldlineLabel: "원형 개체",
    roleLabel: "균형형",
    summary: "중첩 사태 직후 처음 관측된 기준 개체. 모든 지표가 고르게 유지됩니다.",
    specialtyTags: [],
    specialtyBonusPct: 0,
    stats: {
      maxHp: 100,
      maxStamina: 100,
      staminaRegen: 10,
      maxFatigue: 100,
      maxWeight: 50,
    },
  },
  {
    id: "doyun-recon",
    definitionId: "legacy-survivor",
    definitionName: "강도윤",
    worldlineLabel: "기동 정찰",
    roleLabel: "원거리·기계 특화",
    summary: "외곽 통신망을 타고 이동하던 세계선의 개체. 기동력과 원거리·기계 화력에 강합니다.",
    specialtyTags: ["FIREARM", "TECH"],
    specialtyBonusPct: 12,
    stats: {
      maxHp: 85,
      maxStamina: 120,
      staminaRegen: 13,
      maxFatigue: 125,
      maxWeight: 42,
    },
  },
  {
    id: "doyun-vanguard",
    definitionId: "legacy-survivor",
    definitionName: "강도윤",
    worldlineLabel: "중장갑 돌파",
    roleLabel: "근접·방호 특화",
    summary: "봉쇄선 돌파 작전에 투입됐던 세계선의 개체. 높은 체력과 근접·방호 운용에 특화됩니다.",
    specialtyTags: ["BLADE", "BLUNT", "ARMOR"],
    specialtyBonusPct: 12,
    stats: {
      maxHp: 130,
      maxStamina: 95,
      staminaRegen: 9,
      maxFatigue: 90,
      maxWeight: 55,
    },
  },
  {
    id: "haerin-hauler",
    definitionId: "survivor-haerin",
    definitionName: "서해린",
    worldlineLabel: "물류 회수",
    roleLabel: "고중량 파밍 특화",
    summary: "하층 물류 구역을 전전하며 자재를 모으던 개체. 압도적인 적재량과 긴 탐사 지속력을 갖춥니다.",
    specialtyTags: ["TECH", "BLUNT"],
    specialtyBonusPct: 8,
    stats: {
      maxHp: 95,
      maxStamina: 95,
      staminaRegen: 10,
      maxFatigue: 120,
      maxWeight: 78,
    },
  },
  {
    id: "jiwon-medic",
    definitionId: "survivor-jiwon",
    definitionName: "한지원",
    worldlineLabel: "생체 의무",
    roleLabel: "생체·화학 장기전",
    summary: "임시 진료소에서 변이 증상을 다루던 개체. 생체·화학 장비 효율과 스태미나 회복이 뛰어납니다.",
    specialtyTags: ["BIO", "CHEM"],
    specialtyBonusPct: 12,
    stats: {
      maxHp: 110,
      maxStamina: 115,
      staminaRegen: 12,
      maxFatigue: 110,
      maxWeight: 48,
    },
  },
];

const VARIANT_MAP = new Map<string, CharacterVariantSpec>(
  CHARACTER_VARIANT_CATALOG.map((spec) => [spec.id, spec]),
);

export function getCharacterVariantSpec(
  variantId?: string | null,
): CharacterVariantSpec | undefined {
  if (!variantId) return undefined;
  return VARIANT_MAP.get(variantId);
}

/**
 * 개체 변주의 특화 태그와 장비 태그가 일치할 때 적용되는 배율(예: 1.12)을 반환합니다.
 */
export function getVariantTagMultiplier(
  variantId: string | null | undefined,
  weaponTags?: readonly WeaponTag[],
): number {
  if (!variantId || !weaponTags || weaponTags.length === 0) return 1;
  const spec = VARIANT_MAP.get(variantId);
  if (!spec || spec.specialtyBonusPct <= 0 || spec.specialtyTags.length === 0) {
    return 1;
  }
  const hasMatch = weaponTags.some((tag) => spec.specialtyTags.includes(tag));
  return hasMatch ? 1 + spec.specialtyBonusPct / 100 : 1;
}

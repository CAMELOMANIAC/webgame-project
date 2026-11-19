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
  stats: CharacterVariantStats;
}

/** 모든 생존자 캐릭터의 공통 기본 능력치 */
export const BASE_CHARACTER_STATS: CharacterVariantStats = {
  maxHp: 100,
  maxStamina: 100,
  staminaRegen: 10,
  maxFatigue: 100,
  maxWeight: 50,
};

/**
 * 기본 생존자 캐릭터 카탈로그.
 * - 모든 캐릭터는 동일한 기본 능력치(`BASE_CHARACTER_STATS`)를 공유합니다.
 * - 개체별 차별화는 추후 고유 유전자 풀 + 공통 유전자 풀 조합 시스템으로 확장됩니다.
 */
export const CHARACTER_VARIANT_CATALOG: readonly CharacterVariantSpec[] = [
  {
    id: "legacy-origin",
    definitionId: "legacy-survivor",
    definitionName: "강도윤",
    stats: { ...BASE_CHARACTER_STATS },
  },
  {
    id: "haerin-origin",
    definitionId: "survivor-haerin",
    definitionName: "서해린",
    stats: { ...BASE_CHARACTER_STATS },
  },
  {
    id: "jiwon-origin",
    definitionId: "survivor-jiwon",
    definitionName: "한지원",
    stats: { ...BASE_CHARACTER_STATS },
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

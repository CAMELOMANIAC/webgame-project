/**
 * 조합 전용 재료 태그. 전투 시너지용 `WeaponTag`와 분리되어 조합 슬롯 판정에만 쓰입니다.
 */
export type CraftTag =
  | "BIND"
  | "CONDUCT"
  | "IGNITE"
  | "BIO"
  | "OPTIC"
  | "GUARD"
  | "HIGH_STRENGTH"
  | "HIGH_OUTPUT"
  | "PHARMA";

export const CRAFT_TAG_LABELS: Record<CraftTag, string> = {
  BIND: "결속",
  CONDUCT: "전도",
  IGNITE: "점화",
  BIO: "생체",
  OPTIC: "광학",
  GUARD: "방호",
  HIGH_STRENGTH: "고강도",
  HIGH_OUTPUT: "고출력",
  PHARMA: "약리",
};

export const RARE_CRAFT_TAGS: readonly CraftTag[] = [
  "HIGH_STRENGTH",
  "HIGH_OUTPUT",
  "PHARMA",
];

export function isRareCraftTag(tag: CraftTag): boolean {
  return RARE_CRAFT_TAGS.includes(tag);
}

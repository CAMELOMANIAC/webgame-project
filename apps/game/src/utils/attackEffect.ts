import type { WeaponData } from "@webgame/types";

export type AttackEffectKind = "BURST" | "SNIPE" | "SLASH" | "BLUNT";

/** 장비 ID별 특수 연출 (태그 기반 기본 연출보다 우선) */
const SPECIAL_EFFECT_BY_ID: Readonly<Record<string, AttackEffectKind>> = {
  wpn_sniper: "SNIPE",
};

/** 연출 결정 순서: 장비 ID → 태그 → attackType */
export const resolveAttackEffect = (
  weapon: Pick<WeaponData, "id" | "tags" | "attackType"> | null | undefined,
): AttackEffectKind => {
  if (!weapon) return "SLASH";

  const special = SPECIAL_EFFECT_BY_ID[weapon.id];
  if (special) return special;

  const tags = weapon.tags ?? [];
  if (tags.includes("FIREARM")) return "BURST";
  if (tags.includes("BLUNT")) return "BLUNT";
  if (tags.includes("BLADE")) return "SLASH";

  return weapon.attackType === "RANGED" ? "BURST" : "SLASH";
};

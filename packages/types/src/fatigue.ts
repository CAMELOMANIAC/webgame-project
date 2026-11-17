export const FATIGUE_RULES = {
  defaultMaxFatigue: 100,
  exhaustedTravelMultiplier: 1.5,
  exhaustedCooldownBonusTicks: 2,
  fatiguePerStepUnit: 2,
  buildingMoveFatigueCost: 2,
  buildingActionCosts: {
    INVESTIGATE: 4,
    SEARCH: 6,
    CRAFT: 4,
  },
} as const;

export function applyExhaustedTravelMinutes(
  baseMinutes: number,
  fatigue?: number,
): number {
  if (baseMinutes <= 0) return 0;
  if (fatigue !== undefined && fatigue <= 0) {
    return (
      Math.ceil(
        (baseMinutes * FATIGUE_RULES.exhaustedTravelMultiplier) / 10,
      ) * 10
    );
  }
  return baseMinutes;
}

export const gameRules = {
  startNodeId: 0,
  extractionNodeIds: [0] as number[],
  ghost: { rulesVersion: 1, maxAgeDays: 7, trackedCount: 3 },
};

export function recoveryVitals(character: {
  maxHp: number;
  maxStamina: number;
}) {
  return { hp: character.maxHp, stamina: character.maxStamina };
}

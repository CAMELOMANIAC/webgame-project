export const gameRules = {
  startNodeId: 0,
  extractionNodeIds: [0] as number[],
  monsterEncounterChance: 0.7,
  basicSuppliesEnabled: true,
  ghost: { rulesVersion: 1, roundTolerance: 2, maxAgeDays: 7 },
};

export function recoveryVitals(character: {
  maxHp: number;
  maxStamina: number;
}) {
  return { hp: character.maxHp, stamina: character.maxStamina };
}

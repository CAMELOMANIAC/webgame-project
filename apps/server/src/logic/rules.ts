export const gameRules = {
  startNodeId: 0,
  entryNodeIds: [0, 37, 93] as number[],
  extractionNodeIds: [0] as number[],
  ghost: {
    rulesVersion: 1,
    maxAgeDays: 7,
    trackedCount: 3,
    minimumEntryDistance: 150,
    minimumRefillDistance: 100,
  },
};

export function recoveryVitals(character: {
  maxHp: number;
  maxStamina: number;
}) {
  return { hp: character.maxHp, stamina: character.maxStamina };
}

export const gameRules = {
  startNodeId: 0,
  entryNodeIds: [0, 37, 93] as number[],
  extractionNodeIds: [0] as number[],
  travel: {
    stepUnitMinutes: 10,
    maxEdgeMinutes: 60,
    distancePerStepUnit: 20,
    buildingMoveMinutes: 10,
    battleActionMinutes: 10,
  },
  ghost: {
    rulesVersion: 2,
    maxAgeDays: 7,
    trackedCount: 3,
    patrolTrackedCount: 2,
    minimumEntryDistance: 150,
    minimumRefillDistance: 100,
    matchWindowMinutes: 30,
  },
};

export function recoveryVitals(character: {
  maxHp: number;
  maxStamina: number;
}) {
  return { hp: character.maxHp, stamina: character.maxStamina };
}

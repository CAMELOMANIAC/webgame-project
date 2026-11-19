import { BASE_RECOVERY_RULES } from "@webgame/types";

export const gameRules = {
  startNodeId: 0,
  entryNodeIds: [0, 37, 93, 316, 443] as number[],
  extractionNodeIds: [0, 290, 975] as number[],
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
    trackedCount: 6,
    patrolTrackedCount: 8,
    minimumEntryDistance: 150,
    minimumRefillDistance: 100,
    matchWindowMinutes: 30,
  },
};

export function recoveryVitals(character: {
  maxHp: number;
  maxStamina: number;
  maxFatigue: number;
}) {
  return {
    hp: Math.min(character.maxHp, BASE_RECOVERY_RULES.deathReturnHp),
    stamina: character.maxStamina,
    fatigue: Math.min(
      character.maxFatigue,
      BASE_RECOVERY_RULES.deathReturnFatigue,
    ),
  };
}

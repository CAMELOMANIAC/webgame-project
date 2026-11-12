import { createCipheriv, randomBytes } from "node:crypto";
import type { BattleCombatant, BattleLog, RaidBattleResult, RetreatResolution } from "@webgame/types";

export const retreatChoiceMs = 5_000;
// Covers travel and replay before the client opens the choice window.
export const retreatPlaybackLimitMs = 30 * 60_000;

export interface PendingRetreat {
  id: string;
  fullLog: RaidBattleResult;
  openingLog: RaidBattleResult;
  key: string;
  rewardIds: string[];
  hp: number;
  stamina: number;
  returnNodeId: number;
  returnBuildingId: number | null;
  missionEncounter: boolean;
  deadline: number;
  ready: boolean;
  resolution?: RetreatResolution;
}

export function retreatDamageMultiplier(player: BattleCombatant, enemies: BattleCombatant[]) {
  const power = (unit: BattleCombatant) =>
    unit.maxHp + 10 * unit.weapons.reduce((damage, weapon) =>
      damage + (weapon && !weapon.effect
        ? weapon.damage / Math.max(1, weapon.cooldownTicks, weapon.castTicks)
        : 0), 0);
  return Math.min(2, Math.max(1, enemies.reduce((sum, enemy) => sum + power(enemy), 0) / Math.max(1, power(player))));
}

export function sealBattleTimeline(continuation: Pick<BattleLog, "timeline" | "finalState" | "result">) {
  const key = randomBytes(32);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(continuation), "utf8"),
    cipher.final(),
    cipher.getAuthTag(),
  ]);
  return {
    key: key.toString("base64"),
    iv: iv.toString("base64"),
    ciphertext: encrypted.toString("base64"),
  };
}

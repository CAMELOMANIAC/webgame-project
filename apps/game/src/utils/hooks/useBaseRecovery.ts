import {
  type BaseRecoveryResult,
  calculateLiveBaseRecovery,
} from "@webgame/types";
import { useEffect, useState } from "react";

export interface RecoverableCharacter {
  hp: number;
  maxHp: number;
  fatigue: number;
  maxFatigue: number;
  isRaiding: boolean;
  returnedAt?: string | null;
  serverTime?: string;
}

const EMPTY_RECOVERY: BaseRecoveryResult = {
  hp: 0,
  fatigue: 0,
  isRecovering: false,
  nextTickInMs: null,
};

export function useRecoveryClock(enabled: boolean, intervalMs = 1000): number {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return;
    setNowMs(Date.now());
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [enabled, intervalMs]);

  return nowMs;
}

export function useBaseRecovery(
  character: RecoverableCharacter | null | undefined,
): BaseRecoveryResult {
  const [responseAtMs, setResponseAtMs] = useState(() => Date.now());

  useEffect(() => {
    setResponseAtMs(Date.now());
  }, [
    character?.hp,
    character?.fatigue,
    character?.isRaiding,
    character?.returnedAt,
    character?.serverTime,
  ]);

  const initial = character
    ? calculateLiveBaseRecovery({
        hp: character.hp,
        maxHp: character.maxHp,
        fatigue: character.fatigue,
        maxFatigue: character.maxFatigue,
        isRaiding: character.isRaiding,
        returnedAt: character.returnedAt,
        serverTime: character.serverTime,
        elapsedSinceResponseMs: 0,
      })
    : EMPTY_RECOVERY;

  const nowMs = useRecoveryClock(initial.isRecovering, 1000);

  if (!character) return EMPTY_RECOVERY;
  if (!initial.isRecovering) return initial;

  return calculateLiveBaseRecovery({
    hp: character.hp,
    maxHp: character.maxHp,
    fatigue: character.fatigue,
    maxFatigue: character.maxFatigue,
    isRaiding: character.isRaiding,
    returnedAt: character.returnedAt,
    serverTime: character.serverTime,
    elapsedSinceResponseMs: Math.max(0, nowMs - responseAtMs),
  });
}

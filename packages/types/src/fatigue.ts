export const FATIGUE_RULES = {
  defaultMaxFatigue: 100,
  exhaustedTravelMultiplier: 1.5,
  exhaustedCooldownBonusTicks: 2,
  fatiguePerStepUnit: 1,
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

export const BASE_RECOVERY_RULES = {
  intervalMs: 15_000,
  hpPerInterval: 1,
  fatiguePerInterval: 1,
  deathReturnHp: 1,
  deathReturnFatigue: 0,
} as const;

export interface BaseRecoveryInput {
  hp: number;
  maxHp: number;
  fatigue: number;
  maxFatigue: number;
  isRaiding: boolean;
  returnedAt: string | Date | null | undefined;
  now?: number | Date;
}

export interface BaseRecoveryResult {
  hp: number;
  fatigue: number;
  isRecovering: boolean;
  nextTickInMs: number | null;
}

export function calculateBaseRecovery(
  input: BaseRecoveryInput,
): BaseRecoveryResult {
  const clampedHp = Math.min(input.maxHp, Math.max(0, input.hp));
  const clampedFatigue = Math.min(input.maxFatigue, Math.max(0, input.fatigue));

  if (input.isRaiding || !input.returnedAt) {
    return {
      hp: clampedHp,
      fatigue: clampedFatigue,
      isRecovering: false,
      nextTickInMs: null,
    };
  }

  const returnedAtMs =
    input.returnedAt instanceof Date
      ? input.returnedAt.getTime()
      : Date.parse(input.returnedAt);
  if (!Number.isFinite(returnedAtMs)) {
    return {
      hp: clampedHp,
      fatigue: clampedFatigue,
      isRecovering: false,
      nextTickInMs: null,
    };
  }

  const nowMs =
    input.now instanceof Date ? input.now.getTime() : (input.now ?? Date.now());
  const elapsedMs = Math.max(0, nowMs - returnedAtMs);
  const ticks = Math.floor(elapsedMs / BASE_RECOVERY_RULES.intervalMs);

  const hp = Math.min(
    input.maxHp,
    clampedHp + ticks * BASE_RECOVERY_RULES.hpPerInterval,
  );
  const fatigue = Math.min(
    input.maxFatigue,
    clampedFatigue + ticks * BASE_RECOVERY_RULES.fatiguePerInterval,
  );
  const isRecovering = hp < input.maxHp || fatigue < input.maxFatigue;
  const nextTickInMs = isRecovering
    ? BASE_RECOVERY_RULES.intervalMs -
      (elapsedMs % BASE_RECOVERY_RULES.intervalMs)
    : null;

  return {
    hp,
    fatigue,
    isRecovering,
    nextTickInMs,
  };
}

export interface LiveBaseRecoveryInput {
  hp: number;
  maxHp: number;
  fatigue: number;
  maxFatigue: number;
  isRaiding: boolean;
  returnedAt: string | Date | null | undefined;
  serverTime?: string | Date | null;
  elapsedSinceResponseMs: number;
}

export function calculateLiveBaseRecovery(
  input: LiveBaseRecoveryInput,
): BaseRecoveryResult {
  const clampedHp = Math.min(input.maxHp, Math.max(0, input.hp));
  const clampedFatigue = Math.min(input.maxFatigue, Math.max(0, input.fatigue));
  const isRecoveringBase =
    !input.isRaiding &&
    Boolean(input.returnedAt) &&
    (clampedHp < input.maxHp || clampedFatigue < input.maxFatigue);

  if (!isRecoveringBase) {
    return {
      hp: clampedHp,
      fatigue: clampedFatigue,
      isRecovering: false,
      nextTickInMs: null,
    };
  }

  const returnedAtMs =
    input.returnedAt instanceof Date
      ? input.returnedAt.getTime()
      : Date.parse(input.returnedAt!);
  const serverTimeMs = input.serverTime
    ? input.serverTime instanceof Date
      ? input.serverTime.getTime()
      : Date.parse(input.serverTime)
    : Date.now();

  if (!Number.isFinite(returnedAtMs) || !Number.isFinite(serverTimeMs)) {
    return {
      hp: clampedHp,
      fatigue: clampedFatigue,
      isRecovering: false,
      nextTickInMs: null,
    };
  }

  const serverElapsedMs = Math.max(0, serverTimeMs - returnedAtMs);
  const remainderMs = serverElapsedMs % BASE_RECOVERY_RULES.intervalMs;
  const totalFromTickStartMs =
    remainderMs + Math.max(0, input.elapsedSinceResponseMs);
  const extraTicks = Math.floor(
    totalFromTickStartMs / BASE_RECOVERY_RULES.intervalMs,
  );

  const hp = Math.min(
    input.maxHp,
    clampedHp + extraTicks * BASE_RECOVERY_RULES.hpPerInterval,
  );
  const fatigue = Math.min(
    input.maxFatigue,
    clampedFatigue + extraTicks * BASE_RECOVERY_RULES.fatiguePerInterval,
  );
  const isRecovering = hp < input.maxHp || fatigue < input.maxFatigue;
  const nextTickInMs = isRecovering
    ? BASE_RECOVERY_RULES.intervalMs -
      (totalFromTickStartMs % BASE_RECOVERY_RULES.intervalMs)
    : null;

  return {
    hp,
    fatigue,
    isRecovering,
    nextTickInMs,
  };
}



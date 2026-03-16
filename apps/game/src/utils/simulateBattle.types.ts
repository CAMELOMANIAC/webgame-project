export type TargetingStrategy = "WEAKEST" | "STRONGEST" | "RANDOM";

export type Item = {
  id: string;
  name: string;
  weight: number;
  value: number;
};

export type Weapon = Item & {
  damage: number;
  staminaCost: number;
  cooldownTicks: number; // 틱 단위 쿨다운
  castTicks: number;     // 공격 전 선딜레이 틱
  currentCooldown: number; // 현재 남은 쿨다운 틱
  use: (actor: User, target: User, weapon: Weapon) => BattleEvent[];
  strategy?: TargetingStrategy;
  isTriggered?: boolean;
};

export type PlayerState = {
  id: string;
  teamId: string;
  maxHp: number;
  hp: number;
  maxStamina: number;
  stamina: number;
  weight: number;
  maxWeight: number;
  day: number;
  weapons: Array<{
    id: string;
    name: string;
    damage: number;
    staminaCost: number;
    cooldownTicks: number;
    castTicks: number;
    weight: number;
  } | null>;
};

export type User = {
  id: string;
  teamId: string;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  staminaRegen: number; // 틱당 회복량
  weight: number;
  maxWeight: number;
  day: number;
  currentWeaponIndex: number; // 0~5 순차 공격 인덱스
  weapons: [Weapon | null, Weapon | null, Weapon | null, Weapon | null, Weapon | null, Weapon | null];
  castingWeaponIndex?: number | null;
  castingTicksRemaining?: number;
};

export type BattleEvent = { id: string } & (
  | { type: "ATTACK"; actorId: string; targetId: string; weaponIndex: number }
  | { type: "DAMAGE"; targetId: string; amount: number; remainingHp: number; isCritical: boolean }
  | { type: "HEAL"; targetId: string; amount: number; remainingHp: number }
  | { type: "STAMINA_CHANGE"; playerId: string; currentStamina: number }
  | { type: "COOLDOWN"; actorId: string; weaponIndex: number; duration: number }
  | { type: "CAST_START"; actorId: string; weaponIndex: number; duration: number }
  | { type: "CAST_COMPLETE"; actorId: string; weaponIndex: number }
  | { type: "CAST_CANCEL"; actorId: string; weaponIndex: number; reason: string }
  | { type: "DEATH"; playerId: string }
  | { type: "BATTLE_END"; winnerTeamId: string | null }
);

export type BattleLogEntry = {
  timestamp: number;
  events: BattleEvent[];
};

export type BattleLog = {
  initialState: {
    players: PlayerState[];
  };
  timeline: BattleLogEntry[];
};

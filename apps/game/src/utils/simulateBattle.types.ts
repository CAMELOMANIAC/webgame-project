export type TargetingStrategy = "WEAKEST" | "STRONGEST" | "RANDOM";

export type Weapon = {
  name: string;
  damage: number;
  cooldown: number;
  currentCooldown: number;
  staminaCost: number; // 스태미너 소모량 추가
  use: (actor: User, target: User, weapon: Weapon) => BattleEvent[];
  strategy?: TargetingStrategy;
  isTriggered?: boolean;
};

export type PlayerState = {
  id: string;
  teamId: string;
  maxHp: number;
  hp: number;
  maxStamina: number; // 최대 스태미너 추가
  stamina: number;    // 현재 스태미너 추가
  weapons: Array<{
    name: string;
    damage: number;
    cooldown: number;
    staminaCost: number;
  } | null>;
};

export type User = {
  id: string;
  teamId: string;
  hp: number;
  maxHp: number;
  stamina: number;    // 현재 스태미너 추가
  maxStamina: number; // 최대 스태미너 추가
  staminaRegen: number; // 틱당 스태미너 회복량 추가
  weapons: [Weapon | null, Weapon | null, Weapon | null, Weapon | null, Weapon | null, Weapon | null];
};

export type BattleEvent = { id: string } & (
  | { type: "ATTACK"; actorId: string; targetId: string; weaponIndex: number }
  | { type: "DAMAGE"; targetId: string; amount: number; remainingHp: number; isCritical: boolean }
  | { type: "HEAL"; targetId: string; amount: number; remainingHp: number }
  | { type: "STAMINA_CHANGE"; playerId: string; currentStamina: number }
  | { type: "COOLDOWN"; actorId: string; weaponIndex: number; duration: number }
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

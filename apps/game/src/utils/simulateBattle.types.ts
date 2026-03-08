export type Weapon = {
  name: string;
  damage: number;
  cooldown: number;
  currentCooldown: number;
  use: (actor: User, target: User, weapon: Weapon) => BattleEvent[];
};

export type PlayerState = {
  id: string;
  maxHp: number;
  hp: number;
  weapons: Array<{
    name: string;
    damage: number;
    cooldown: number;
  } | null>;
};

export type User = {
  id: string;
  hp: number;
  maxHp: number;
  weapons: [Weapon | null, Weapon | null, Weapon | null, Weapon | null, Weapon | null];
};

export type BattleEvent = { id: string } & (
  | { type: "ATTACK"; actorId: string; targetId: string; weaponIndex: number }
  | { type: "DAMAGE"; targetId: string; amount: number; remainingHp: number; isCritical: boolean }
  | { type: "COOLDOWN"; actorId: string; weaponIndex: number; duration: number }
  | { type: "DEATH"; playerId: string }
  | { type: "BATTLE_END"; winnerId: string | null }
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

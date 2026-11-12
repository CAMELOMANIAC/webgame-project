export * from "./weapon";
export * from "./inventory";
export * from "./world";
export type TargetingStrategy = "WEAKEST" | "STRONGEST" | "RANDOM";

export interface Item {
  id: string;
  name: string;
  weight: number;
  value: number;
  quantity?: number;
  iconKey?: string;
}

export interface HealingEffect {
  type: "HEAL";
  amount: number;
  hpThreshold: number;
  oncePerBattle: boolean;
}

// JSON으로 전달하는 무기 설정. 실행 함수와 전투 중 상태를 포함하지 않는다.
export interface WeaponData extends Item {
  damage: number;
  staminaCost: number;
  cooldownTicks: number; // 틱 단위 쿨다운
  castTicks: number; // 공격 전 선딜레이 틱
  strategy?: TargetingStrategy;
  effect?: HealingEffect;
  attackType?: "MELEE" | "RANGED";
}

export interface Weapon extends WeaponData {
  currentCooldown: number; // 현재 남은 쿨다운 틱
  isTriggered?: boolean;
  use: (
    actor: User,
    target: User,
    weapon: Weapon,
    timestamp: number,
  ) => BattleEvent[];
  attackType?: "MELEE" | "RANGED";
}

export type WeaponSlots = [
  WeaponData | null,
  WeaponData | null,
  WeaponData | null,
  WeaponData | null,
  WeaponData | null,
  WeaponData | null,
];

export interface BattleCombatant extends Omit<User, "weapons"> {
  weapons: WeaponSlots;
}

export type BattleEndReason = "VICTORY" | "DRAW" | "MAX_TICKS";

export interface BattleSummary {
  winnerTeamId: string | null;
  reason: BattleEndReason;
  durationTicks: number;
}

export interface PlayerState {
  id: string;
  teamId: string;
  name: string;
  maxHp: number;
  hp: number;
  maxStamina: number;
  stamina: number;
  weight: number;
  maxWeight: number;
  time: number;
  weapons: Array<{
    id: string;
    name: string;
    damage: number;
    staminaCost: number;
    cooldownTicks: number;
    castTicks: number;
    weight: number;
    attackType?: "MELEE" | "RANGED";
  } | null>;
}

export interface Monster {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  staminaRegen: number;
  weapons: [
    Weapon | null,
    Weapon | null,
    Weapon | null,
    Weapon | null,
    Weapon | null,
    Weapon | null,
  ];
  droppedItems?: Item[];
}

export interface User {
  id: string;
  displayName?: string;
  teamId: string;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  staminaRegen: number; // 틱당 회복량
  weight: number;
  maxWeight: number;
  time: number;
  currentWeaponIndex: number; // 0~5 순차 공격 인덱스
  weapons: [
    Weapon | null,
    Weapon | null,
    Weapon | null,
    Weapon | null,
    Weapon | null,
    Weapon | null,
  ];
  castingWeaponIndex?: number | null;
  castingTicksRemaining?: number;
  droppedItems?: Item[];
}

export type BattleEvent = { id: string; timestamp: number } & (
  | { type: "ATTACK"; actorId: string; targetId: string; weaponIndex: number }
  | {
      type: "DAMAGE";
      targetId: string;
      amount: number;
      remainingHp: number;
      isCritical: boolean;
    }
  | { type: "HEAL"; targetId: string; amount: number; remainingHp: number }
  | { type: "STAMINA_CHANGE"; playerId: string; currentStamina: number }
  | { type: "COOLDOWN"; actorId: string; weaponIndex: number; duration: number }
  | {
      type: "CAST_START";
      actorId: string;
      weaponIndex: number;
      duration: number;
    }
  | { type: "CAST_COMPLETE"; actorId: string; weaponIndex: number }
  | {
      type: "CAST_CANCEL";
      actorId: string;
      weaponIndex: number;
      reason: string;
    }
  | { type: "DEATH"; playerId: string }
  | { type: "BATTLE_END"; winnerTeamId: string | null; reason: BattleEndReason }
);

export interface BattleLogEntry {
  timestamp: number;
  events: BattleEvent[];
}

export interface BattleLog {
  encounter?: {
    kind: "NPC" | "GHOST";
    name: string;
    snapshotId?: string;
    recordedRound?: number;
    recordedAt?: string;
    sourceCharacterId?: string | null;
    faction?: string;
    role?: string;
    reason?: string;
  };
  initialState: {
    players: PlayerState[];
  };
  timeline: BattleLogEntry[];
  finalState: {
    players: PlayerState[];
  };
  result: BattleSummary;
}

export interface RaidBattleResult extends BattleLog {
  playerDied: boolean;
  rewardItemName: string | null;
}

export interface RaidView {
  id: string;
  status: "ACTIVE" | "EXTRACTED" | "DEAD";
  version: number;
  currentNodeId: number;
  round: number;
}

export interface RaidActionInput {
  raidId: string;
  expectedVersion: number;
  requestId: string;
}

export interface RaidNavigationInput extends RaidActionInput {
  path: number[];
  destinationBuildingId?: number;
  equipment?: { weaponMasterId: string; slotIndex: number }[];
  inventory?: { weaponMasterId: string; slotIndex: number; quantity: number }[];
}

export interface RaidNavigationResult {
  encounterTriggered: boolean;
  stopNodeId?: number;
  battleLog?: RaidBattleResult;
  raid: RaidView;
}

export interface GhostMatch {
  id: string;
  nodeId: number;
  round: number;
  createdAt: string;
  rulesVersion: number;
  source: {
    characterId: string | null;
    displayName: string;
    variantId: string | null;
  };
  combatant: BattleCombatant;
}

export interface JournalView {
  mission: {
    id: string;
    title: string;
    briefing: string;
    targetNodeId: number;
    rewardDescription: string;
    status: "OFFERED" | "ACTIVE" | "RECOVERED" | "READY" | "COMPLETE";
    completedAt: string | null;
  };
  records: { id: string; title: string; content: string }[];
  contacts: { id: string; name: string; role: string; entityId?: string }[];
}

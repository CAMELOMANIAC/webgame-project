export * from "./weapon";
export * from "./inventory";
export * from "./world";
export * from "./districts";
export * from "./crafting";
export type TargetingStrategy = "WEAKEST" | "STRONGEST" | "RANDOM";
export type ItemKind = "EQUIPMENT" | "MATERIAL";
export type SynergyTargetRule =
  | "NEXT"
  | "PREV"
  | "ADJACENT"
  | "EDGES"
  | "ALL_MELEE"
  | "ALL_RANGED"
  | "ALL_OTHER";

export interface Item {
  id: string;
  name: string;
  weight: number;
  value: number;
  quantity?: number;
  iconKey?: string;
}

export interface WeaponEffect {
  type?: "HEAL" | "SYNERGY" | "MATERIAL";
  itemKind?: ItemKind;
  amount?: number;
  hpThreshold?: number;
  oncePerBattle?: boolean;
  target?: SynergyTargetRule;
  hasteTicks?: number;
  damageBonus?: number;
  critChanceBonus?: number;
  staminaRestore?: number;
  triggerEveryNHits?: number;
}

export type HealingEffect = WeaponEffect;

// JSON으로 전달하는 무기 설정. 실행 함수와 전투 중 상태를 포함하지 않는다.
export interface WeaponData extends Item {
  damage: number;
  staminaCost: number;
  cooldownTicks: number; // 틱 단위 쿨다운
  castTicks: number; // 공격 전 선딜레이 틱
  strategy?: TargetingStrategy;
  effect?: WeaponEffect;
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

export type BattleEndReason = "VICTORY" | "DRAW" | "MAX_TICKS" | "RETREAT_PENDING";

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
      retreatGauge?: number;
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
  | {
      type: "SYNERGY";
      actorId: string;
      sourceSlotIndex: number;
      targetSlotIndices: number[];
      hasteTicks?: number;
      damageBonus?: number;
      critChanceBonus?: number;
      staminaRestore?: number;
    }
  | { type: "DEATH"; playerId: string }
  | { type: "BATTLE_END"; winnerTeamId: string | null; reason: BattleEndReason }
);

export interface BattleLogEntry {
  timestamp: number;
  events: BattleEvent[];
}

export interface BattleLog {
  retreat?: { battleId: string; raidId: string; iv: string; ciphertext: string };

  encounter?: {
    kind: "NPC" | "GHOST" | "NPC_GHOST";
    name: string;
    snapshotId?: string;
    patrolId?: string;
    recordedTime?: number;
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

export type RetreatResolution =
  | { decision: "RETREAT"; raid: RaidView; hp: number; stamina: number }
  | {
      decision: "CONTINUE";
      raid: RaidView;
      key: string;
      rewardItemName: string | null;
    };

export type RetreatDecisionResult =
  | { remainingMs: number; windowMs: number; resolution?: never }
  | { resolution: RetreatResolution; remainingMs?: never; windowMs?: never };

export type BuildingEventStage = "INTRO" | "READY" | "CLEARED";

export interface BuildingEventState {
  stage: BuildingEventStage;
  text: string;
}

export interface RaidExplorationState {
  lootedBuildingIds: number[];
  usedCraftBuildingIds: number[];
  buildingEvents: Record<string, BuildingEventState>;
}

export interface RaidView {
  id: string;
  status: "ACTIVE" | "EXTRACTED" | "DEAD";
  version: number;
  currentNodeId: number;
  currentBuildingId?: number | null;
  time: number;
  exploration?: RaidExplorationState;
}

export interface BuildingActionInput extends RaidActionInput {
  action: "INVESTIGATE" | "SEARCH" | "CRAFT";
  recipeId?: string;
}

export interface BuildingActionResult {
  raid: RaidView;
  action: "INVESTIGATE" | "SEARCH" | "CRAFT";
  encounterTriggered: boolean;
  battleLog?: RaidBattleResult;
  message: string;
  obtainedItems?: { weaponMasterId: string; name: string; quantity: number }[];
  craftedItem?: { weaponMasterId: string; name: string; equippedSlotIndex?: number };
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

export interface EnemyNoiseSignal {
  x: number;
  y: number;
  radius: number;
}

export interface RaidNoiseSignals {
  noiseSignals?: EnemyNoiseSignal[];
  /** Legacy response stored with earlier navigation commands. */
  noiseSignal?: EnemyNoiseSignal;
}

export interface RaidNoiseResult extends RaidNoiseSignals {
  raidId: string | null;
}

export interface StartRaidResult extends RaidNoiseSignals {
  status: string;
  isRaiding: boolean;
  raid: RaidView;
}

export interface RaidNavigationResult extends RaidNoiseSignals {
  encounterTriggered: boolean;
  stopNodeId?: number;
  battleLog?: RaidBattleResult;
  raid: RaidView;
}

export interface GhostMatch {
  id: string;
  nodeId: number;
  time: number;
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

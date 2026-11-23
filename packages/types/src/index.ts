export * from "./weapon";
export * from "./inventory";
export * from "./world";
export * from "./districts";
export * from "./crafting";
export * from "./buildingEvents";
export * from "./enemyCatalog";
export * from "./fatigue";
export * from "./lockdown";
export * from "./market";
export * from "./characterVariants";
export * from "./genes";
export type TargetingStrategy = "WEAKEST" | "STRONGEST" | "RANDOM";
export type ItemKind = "EQUIPMENT" | "MATERIAL" | "CONSUMABLE";
export type ConsumableCategory = "FOOD" | "MEDICAL";

export interface FoodBuffEffect {
  id: string;
  name: string;
  maxHpBonus?: number;
  meleeDamageBonus?: number;
  rangedCooldownReductionTicks?: number;
  critChanceBonus?: number;
  tagDamageBonus?: {
    tag: WeaponTag;
    amount: number;
  };
}

export interface ConsumableEffect {
  category: ConsumableCategory;
  useMinutes: number;
  hpRestore?: number;
  fatigueRestore?: number;
  buff?: Omit<FoodBuffEffect, "id" | "name">;
}

export type WeaponTag =
  | "BLADE"
  | "FIREARM"
  | "BLUNT"
  | "TECH"
  | "BIO"
  | "CHEM"
  | "ARMOR";

export type SynergyTargetRule =
  | "NEXT"
  | "PREV"
  | "ADJACENT"
  | "EDGES"
  | "ALL_MELEE"
  | "ALL_RANGED"
  | "ALL_OTHER"
  | "TAG";

export interface Item {
  id: string;
  masterId?: string;
  name: string;
  weight: number;
  value: number;
  quantity?: number;
  iconKey?: string;
}

export interface SummonDefinition {
  id: string;
  name: string;
  hp: number;
  damage: number;
  cooldownTicks: number;
  attackType: "MELEE" | "RANGED";
  tags?: WeaponTag[];
  count?: number;
  maxActive?: number;
  strategy?: TargetingStrategy;
  shieldOnSummon?: number;
  respawnOnlyWhenEmpty?: boolean;
  healOnReactivate?: number;
}

export interface WeaponEffect {
  type?: "HEAL" | "SYNERGY" | "MATERIAL" | "SHIELD" | "CONSUMABLE" | "SUMMON";
  itemKind?: ItemKind;
  tags?: WeaponTag[];
  consumable?: ConsumableEffect;
  summon?: SummonDefinition;
  amount?: number;
  hpThreshold?: number;
  oncePerBattle?: boolean;
  shieldGain?: number;
  target?: SynergyTargetRule;
  targetTag?: WeaponTag;
  hasteTicks?: number;
  damageBonus?: number;
  critChanceBonus?: number;
  shieldBonus?: number;
  shieldPierce?: number;
  staminaRestore?: number;
  triggerEveryNHits?: number;
  perTag?: {
    tag: WeaponTag;
    damageBonus?: number;
    shieldGain?: number;
    healAmount?: number;
    staminaRestore?: number;
  };
}

export type HealingEffect = WeaponEffect;

// JSON으로 전달하는 무기 설정. 실행 함수와 전투 중 상태를 포함하지 않는다.
export interface WeaponData extends Item {
  damage: number;
  staminaCost: number;
  cooldownTicks: number; // 틱 단위 쿨다운
  castTicks: number; // 공격 전 선딜레이 틱
  strategy?: TargetingStrategy;
  tags?: WeaponTag[];
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
  variantId?: string | null;
  geneIds?: string[];
  activeFoodBuff?: FoodBuffEffect | null;
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
  shield?: number;
  maxStamina: number;
  stamina: number;
  fatigue?: number;
  maxFatigue?: number;
  weight: number;
  maxWeight: number;
  time: number;
  isSummon?: boolean;
  summonerId?: string;
  weapons: Array<{
    id: string;
    name: string;
    damage: number;
    staminaCost: number;
    cooldownTicks: number;
    castTicks: number;
    weight: number;
    attackType?: "MELEE" | "RANGED";
    tags?: WeaponTag[];
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
  fatigue?: number;
  maxFatigue?: number;
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
      isOverload?: boolean;
      absorbedShield?: number;
      remainingShield?: number;
      retreatGauge?: number;
    }
  | { type: "HEAL"; targetId: string; amount: number; remainingHp: number }
  | {
      type: "SHIELD";
      targetId: string;
      amount: number;
      currentShield: number;
      weaponIndex: number;
    }
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
      shieldBonus?: number;
      staminaRestore?: number;
    }
  | {
      type: "SUMMON";
      summonerId: string;
      weaponIndex: number;
      combatant: PlayerState;
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

export interface RaidSummaryItem {
  weaponMasterId: string;
  name: string;
  quantity: number;
  unitValue: number;
  totalValue: number;
  iconKey: string;
}

export interface RaidCombatRecord {
  enemyName: string;
  enemyKind: "GHOST" | "NPC";
  faction?: string;
  outcome: "WIN" | "LOSS" | "RETREAT";
  timeMinutes: number;
}

export interface RaidSettlementSummary {
  raidId: string;
  status: "EXTRACTED" | "DEAD";
  elapsedMinutes: number;
  recoveredItems: RaidSummaryItem[];
  lostItems: RaidSummaryItem[];
  totalRecoveredValue: number;
  totalLostValue: number;
  combatRecords: RaidCombatRecord[];
  encountersCount: number;
  defeatedCount: number;
  missionRecovered: boolean;
}

export interface ExtractRaidResult {
  status: "success";
  raid: RaidView;
  summary: RaidSettlementSummary;
}

export interface RaidBattleResult extends BattleLog {
  playerDied: boolean;
  rewardItemName: string | null;
  rewardItem?: {
    weaponMasterId: string;
    name: string;
    weight: number;
    value: number;
    iconKey: string;
    quantity: number;
  } | null;
  lostItems?: RaidSummaryItem[];
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
  /** 건물 진입 시 서버가 확정한 이벤트 ID. 클라이언트는 이 값으로 표시할 이벤트를 찾습니다. */
  eventId?: string;
}

export type LootSourceKind = "SEARCH" | "EVENT" | "COMBAT";

export interface PendingLootItem {
  id: string;
  weaponMasterId: string;
  name: string;
  quantity: number;
  weight: number;
  value: number;
  iconKey: string;
  source: LootSourceKind;
}

export interface RaidExplorationState {
  lootedBuildingIds: number[];
  usedCraftBuildingIds: number[];
  buildingEvents: Record<string, BuildingEventState>;
  completedEventIds?: string[];
  pendingLoot?: PendingLootItem[];
}

export interface RaidLootActionInput extends RaidActionInput {
  action:
    | "CLAIM_ITEM"
    | "CLAIM_ALL"
    | "DISCARD_BACKPACK"
    | "DISCARD_EQUIPMENT"
    | "ABANDON_ALL";
  lootId?: string;
  backpackSlotIndex?: number;
  equipmentSlotIndex?: number;
  equipment?: { weaponMasterId: string; slotIndex: number }[];
  inventory?: { weaponMasterId: string; slotIndex: number; quantity: number }[];
}

export interface RaidLootActionResult {
  raid: RaidView;
  action:
    | "CLAIM_ITEM"
    | "CLAIM_ALL"
    | "DISCARD_BACKPACK"
    | "DISCARD_EQUIPMENT"
    | "ABANDON_ALL";
  claimedItems?: { weaponMasterId: string; name: string; quantity: number }[];
  discardedItem?: { weaponMasterId: string; name: string; slotIndex: number };
  weight: number;
  message: string;
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
  action: "INVESTIGATE" | "SEARCH" | "CRAFT" | "EVENT_CHOICE";
  recipeId?: string;
  choiceId?: string;
  equipment?: { weaponMasterId: string; slotIndex: number }[];
  inventory?: { weaponMasterId: string; slotIndex: number; quantity: number }[];
}

export interface BuildingActionResult {
  raid: RaidView;
  action: "INVESTIGATE" | "SEARCH" | "CRAFT" | "EVENT_CHOICE";
  encounterTriggered: boolean;
  battleLog?: RaidBattleResult;
  message: string;
  obtainedItems?: { weaponMasterId: string; name: string; quantity: number }[];
  craftedItem?: { weaponMasterId: string; name: string; equippedSlotIndex?: number };
  hpDelta?: number;
  fatigueDelta?: number;
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
  tier?: "near" | "broad";
}

export interface RaidNoiseSignals {
  noiseSignals?: EnemyNoiseSignal[];
  /** Legacy response stored with earlier navigation commands. */
  noiseSignal?: EnemyNoiseSignal;
}

export interface RaidNoiseResult extends RaidNoiseSignals {
  raidId: string | null;
}

export type PathSegmentRisk = "safe" | "medium" | "high";

export interface RaidPathRiskResult {
  raidId: string | null;
  segmentRisks: PathSegmentRisk[];
}

function distPointToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export function classifyPathSegmentRisk(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  noiseAreas: readonly EnemyNoiseSignal[],
): PathSegmentRisk {
  if (noiseAreas.length === 0) return "safe";
  let nearCount = 0;
  let broadCount = 0;
  for (const area of noiseAreas) {
    const dist = distPointToSegment(area.x, area.y, x1, y1, x2, y2);
    if (area.tier === "broad") {
      if (dist <= area.radius) {
        broadCount += 1;
      }
      continue;
    }
    if (dist <= area.radius) {
      return "high";
    }
    if (dist <= area.radius * 2.2) {
      nearCount += 1;
    }
  }
  if (nearCount >= 2 || broadCount >= 2) return "high";
  if (nearCount >= 1 || broadCount >= 1) return "medium";
  return "safe";
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
  hopNoiseSignals?: EnemyNoiseSignal[][];
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

export type MissionStatus =
  | "OFFERED"
  | "ACTIVE"
  | "RECOVERED"
  | "READY"
  | "COMPLETE";

export interface JournalMissionItem {
  id: string;
  tier: number;
  issuerName: string;
  issuerRole: string;
  title: string;
  briefing: string;
  targetNodeId: number;
  targetLabel: string;
  supplyDescription: string;
  rewardDescription: string;
  status: MissionStatus;
  completedAt: string | null;
}

export interface JournalView {
  storyTier: number;
  mission: JournalMissionItem;
  missions: JournalMissionItem[];
  records: { id: string; title: string; content: string; tier?: number }[];
  contacts: {
    id: string;
    name: string;
    role: string;
    affiliation?: string;
    entityId?: string;
  }[];
}


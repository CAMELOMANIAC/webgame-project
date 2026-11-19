import {
  type BattleCombatant,
  type BattleLog,
  type EnemyArchetype,
  findNextAvailableBackpackSlotIndex,
  getCatalogItemById,
  type GhostMatch,
  type PlayerState,
  type RaidBattleResult,
  resolveCatalogWeaponData,
  resolveEnemyArchetypeWeapons,
  resolveEnemyRewardIds,
  type WeaponData,
  type WeaponEffect,
} from "@webgame/types";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  type Character,
  characters,
  characterWeapons,
  type Database,
  raidGhostEncounters,
  raidInventoryItems,
  type TransactionClient,
  type WeaponMaster,
  weaponMasters,
} from "../db";
import { resolvePatrolArchetype } from "../logic/ghostPatrols";
import { hanlimNpcs } from "../logic/npcs";
import { retreatDamageMultiplier } from "../logic/retreat";
import { recoveryVitals } from "../logic/rules";
import { simulateBattle } from "../logic/simulateBattle";
import {
  calculateInventoryWeight,
  withInventoryTransaction,
} from "./inventory";

export type DeferBattle = (
  log: RaidBattleResult,
  rewardIds: string[],
  checkpoint: { eventId: string; players: PlayerState[] },
) => RaidBattleResult;

export interface BattleSettlementOptions {
  deferLootToPending?: boolean;
}

const WeaponTagSchema = z.enum([
  "BLADE",
  "FIREARM",
  "BLUNT",
  "TECH",
  "BIO",
  "CHEM",
  "ARMOR",
]);

const WeaponEffectSchema = z
  .object({
    type: z
      .enum(["HEAL", "SYNERGY", "MATERIAL", "SHIELD", "CONSUMABLE", "SUMMON"])
      .optional(),
    itemKind: z.enum(["EQUIPMENT", "MATERIAL", "CONSUMABLE"]).optional(),
    tags: z.array(WeaponTagSchema).optional(),
    summon: z
      .object({
        id: z.string(),
        name: z.string(),
        hp: z.number().int().positive(),
        damage: z.number().int().nonnegative(),
        cooldownTicks: z.number().int().positive(),
        attackType: z.enum(["MELEE", "RANGED"]),
        tags: z.array(WeaponTagSchema).optional(),
        count: z.number().int().positive().optional(),
        maxActive: z.number().int().positive().optional(),
        strategy: z.enum(["RANDOM", "WEAKEST", "STRONGEST"]).optional(),
        shieldOnSummon: z.number().int().nonnegative().optional(),
        respawnOnlyWhenEmpty: z.boolean().optional(),
        healOnReactivate: z.number().int().positive().optional(),
      })
      .optional(),
    consumable: z
      .object({
        category: z.enum(["FOOD", "MEDICAL"]),
        useMinutes: z.number().int().nonnegative(),
        hpRestore: z.number().int().positive().optional(),
        fatigueRestore: z.number().int().positive().optional(),
        buff: z
          .object({
            maxHpBonus: z.number().int().positive().optional(),
            meleeDamageBonus: z.number().int().positive().optional(),
            rangedCooldownReductionTicks: z.number().int().positive().optional(),
            critChanceBonus: z.number().positive().max(1).optional(),
            tagDamageBonus: z
              .object({
                tag: WeaponTagSchema,
                amount: z.number().int().positive(),
              })
              .optional(),
          })
          .optional(),
      })
      .optional(),
    amount: z.number().int().positive().optional(),
    hpThreshold: z.number().positive().max(1).optional(),
    oncePerBattle: z.boolean().optional(),
    shieldGain: z.number().int().positive().optional(),
    target: z
      .enum([
        "NEXT",
        "PREV",
        "ADJACENT",
        "EDGES",
        "ALL_MELEE",
        "ALL_RANGED",
        "ALL_OTHER",
        "TAG",
      ])
      .optional(),
    targetTag: WeaponTagSchema.optional(),
    hasteTicks: z.number().int().positive().optional(),
    damageBonus: z.number().int().positive().optional(),
    critChanceBonus: z.number().positive().max(1).optional(),
    shieldBonus: z.number().int().positive().optional(),
    staminaRestore: z.number().int().positive().optional(),
    triggerEveryNHits: z.number().int().positive().optional(),
    perTag: z
      .object({
        tag: WeaponTagSchema,
        damageBonus: z.number().int().positive().optional(),
        shieldGain: z.number().int().positive().optional(),
        healAmount: z.number().int().positive().optional(),
        staminaRestore: z.number().int().positive().optional(),
      })
      .optional(),
  })
  .refine(
    (val) =>
      val.type !== undefined ||
      val.itemKind !== undefined ||
      val.tags !== undefined ||
      val.shieldGain !== undefined ||
      val.perTag !== undefined,
  );

export function toBattleWeapon(weapon: WeaponMaster): WeaponData {
  const effect = WeaponEffectSchema.safeParse(weapon.effect);
  return resolveCatalogWeaponData({
    ...weapon,
    effect: effect.success ? (effect.data as WeaponEffect) : undefined,
  });
}

export async function executeMonsterBattle(
  database: Database,
  characterId: string,
  level = 1,
): Promise<RaidBattleResult> {
  return withInventoryTransaction(database, (tx) =>
    executeMonsterBattleInTransaction(tx, characterId, level),
  );
}

export async function executeMonsterBattleInTransaction(
  tx: TransactionClient,
  characterId: string,
  level = 1,
  defer?: DeferBattle,
  options?: BattleSettlementOptions,
): Promise<RaidBattleResult> {
  const { character, player } = await loadBattlePlayer(tx, characterId);
  const monsters = await tx.query.monsterMasters.findMany({
    with: { weapons: { with: { weaponMaster: true } } },
  });
  const match = monsters.sort(
    (a, b) => Math.abs(a.level - level) - Math.abs(b.level - level),
  )[0];
  if (!match) throw new Error("No monsters found");

  const enemies: BattleCombatant[] = Array.from({ length: 1 }, (_, index) => {
    const hp = match.hp;
    const enemy: BattleCombatant = {
      id: `${match.id}:${index}`,
      displayName: `${match.name} (Lv.${match.level})`,
      teamId: "TeamB",
      hp,
      maxHp: hp,
      stamina: match.stamina,
      maxStamina: match.maxStamina,
      staminaRegen: match.staminaRegen,
      weight: 0,
      maxWeight: 100,
      time: 0,
      currentWeaponIndex: 0,
      weapons: [null, null, null, null, null, null],
    };
    for (const equipped of match.weapons) {
      if (equipped.slotIndex >= 0 && equipped.slotIndex < 6) {
        enemy.weapons[equipped.slotIndex] = {
          ...toBattleWeapon(equipped.weaponMaster),
          damage: equipped.weaponMaster.damage,
        };
      }
    }
    return enemy;
  });

  const result = await settleBattle(
    tx,
    character,
    player,
    enemies,
    match.weapons.map((weapon) => weapon.weaponMasterId),
    defer,
    options,
  );
  return { ...result, encounter: { kind: "NPC", name: match.name } };
}

export async function executeArchetypeBattleInTransaction(
  tx: TransactionClient,
  characterId: string,
  archetype: EnemyArchetype,
  encounterOverrides?: Partial<NonNullable<RaidBattleResult["encounter"]>>,
  defer?: DeferBattle,
  options?: BattleSettlementOptions,
): Promise<RaidBattleResult> {
  const weapons = resolveEnemyArchetypeWeapons(archetype);
  const encounter: NonNullable<RaidBattleResult["encounter"]> = {
    kind: "NPC",
    name: archetype.name,
    faction: archetype.faction,
    role: archetype.role,
    reason: archetype.reason,
    ...encounterOverrides,
  };
  return executeNpcCombat(
    tx,
    characterId,
    encounterOverrides?.patrolId ?? archetype.id,
    archetype,
    weapons,
    resolveEnemyRewardIds(archetype),
    encounter,
    defer,
    options,
  );
}

export async function executeHanlimBattleInTransaction(
  tx: TransactionClient,
  characterId: string,
  defer?: DeferBattle,
  options?: BattleSettlementOptions,
): Promise<RaidBattleResult> {
  const npc = hanlimNpcs.control;
  return executeArchetypeBattleInTransaction(
    tx,
    characterId,
    npc,
    {
      kind: "NPC",
      name: npc.name,
      faction: npc.faction,
      role: npc.role,
      reason: npc.reason,
    },
    defer,
    options,
  );
}

export async function executePatrolGhostBattleInTransaction(
  tx: TransactionClient,
  characterId: string,
  patrolId: string,
  recordedTime: number,
  defer?: DeferBattle,
  options?: BattleSettlementOptions,
): Promise<RaidBattleResult> {
  const archetype = resolvePatrolArchetype(patrolId, recordedTime);
  return executeArchetypeBattleInTransaction(
    tx,
    characterId,
    archetype,
    {
      kind: "NPC_GHOST",
      name: archetype.name,
      faction: archetype.faction,
      role: archetype.role,
      reason: archetype.reason,
      patrolId,
      recordedTime,
    },
    defer,
    options,
  );
}

async function executeNpcCombat(
  tx: TransactionClient,
  characterId: string,
  npcId: string,
  npc: { name: string; hp: number; stamina: number; staminaRegen: number },
  weapons: BattleCombatant["weapons"],
  rewardIds: string[],
  encounter: NonNullable<RaidBattleResult["encounter"]>,
  defer?: DeferBattle,
  options?: BattleSettlementOptions,
): Promise<RaidBattleResult> {
  const { character, player } = await loadBattlePlayer(tx, characterId);
  const totalWeight = weapons.reduce(
    (sum, weapon) => sum + (weapon?.weight ?? 0),
    0,
  );
  const enemy: BattleCombatant = {
    id: `npc:${npcId}`,
    displayName: npc.name,
    teamId: "TeamB",
    hp: npc.hp,
    maxHp: npc.hp,
    stamina: npc.stamina,
    maxStamina: npc.stamina,
    staminaRegen: npc.staminaRegen,
    weight: totalWeight,
    maxWeight: Math.max(50, totalWeight),
    time: character.time,
    currentWeaponIndex: 0,
    weapons,
  };
  const fallbackRewards = weapons.flatMap((weapon) =>
    weapon ? [weapon.id] : [],
  );
  const result = await settleBattle(
    tx,
    character,
    player,
    [enemy],
    rewardIds.length > 0 ? rewardIds : fallbackRewards,
    defer,
    options,
  );
  return { ...result, encounter };
}

export async function loadBattlePlayer(
  tx: TransactionClient,
  characterId: string,
) {
  const character = await tx.query.characters.findFirst({
    where: eq(characters.id, characterId),
    with: {
      weapons: { with: { weaponMaster: true } },
      user: true,
      variant: { with: { definition: true } },
    },
  });
  if (!character) throw new Error("Character not found");
  const player: BattleCombatant = {
    id: character.id,
    displayName:
      character.displayName ??
      character.variant?.definition.name ??
      character.user.nickname,
    teamId: "TeamA",
    hp: character.hp,
    maxHp: character.maxHp,
    stamina: character.maxStamina,
    maxStamina: character.maxStamina,
    staminaRegen: character.staminaRegen,
    fatigue: character.fatigue,
    maxFatigue: character.maxFatigue,
    weight: character.weight,
    maxWeight: character.maxWeight,
    time: character.time,
    activeFoodBuff: character.activeFoodBuff ?? null,
    currentWeaponIndex: 0,
    weapons: [null, null, null, null, null, null],
  };
  for (const equipped of character.weapons) {
    if (equipped.slotIndex >= 0 && equipped.slotIndex < 6) {
      player.weapons[equipped.slotIndex] = toBattleWeapon(
        equipped.weaponMaster,
      );
    }
  }

  return { character, player };
}

export async function executeGhostBattleInTransaction(
  tx: TransactionClient,
  characterId: string,
  raidId: string,
  ghost: GhostMatch,
  defer?: DeferBattle,
  options?: BattleSettlementOptions,
): Promise<RaidBattleResult> {
  const { character, player } = await loadBattlePlayer(tx, characterId);
  await tx.insert(raidGhostEncounters).values({
    raidId,
    snapshotId: ghost.id,
  }).onConflictDoNothing();
  const resolveSlot = (weapon: WeaponData | null) =>
    weapon ? resolveCatalogWeaponData(weapon) : null;
  const opponent: BattleCombatant = {
    ...ghost.combatant,
    id: `ghost:${ghost.id}`,
    teamId: "TeamB",
    currentWeaponIndex: 0,
    weapons: [
      resolveSlot(ghost.combatant.weapons[0]),
      resolveSlot(ghost.combatant.weapons[1]),
      resolveSlot(ghost.combatant.weapons[2]),
      resolveSlot(ghost.combatant.weapons[3]),
      resolveSlot(ghost.combatant.weapons[4]),
      resolveSlot(ghost.combatant.weapons[5]),
    ],
  };
  const result = await settleBattle(
    tx,
    character,
    player,
    [opponent],
    opponent.weapons.flatMap((weapon) => (weapon ? [weapon.id] : [])),
    defer,
    options,
  );
  return {
    ...result,
    encounter: {
      kind: "GHOST",
      name: ghost.source.displayName,
      snapshotId: ghost.id,
      recordedTime: ghost.time,
      recordedAt: ghost.createdAt,
      sourceCharacterId: ghost.source.characterId,
    },
  };
}

async function settleBattle(
  tx: TransactionClient,
  character: Character,
  player: BattleCombatant,
  enemies: BattleCombatant[],
  rewardIds: string[],
  defer?: DeferBattle,
  options?: BattleSettlementOptions,
): Promise<RaidBattleResult> {
  const checkpoints: { eventId: string; players: PlayerState[] }[] = [];
  const log = simulateBattle([player, ...enemies], defer ? {
    retreat: {
      playerId: player.id,
      multiplier: retreatDamageMultiplier(player, enemies),
      onReady: (eventId, players) => checkpoints.push({ eventId, players }),
    },
  } : undefined);
  const checkpoint = checkpoints[0];
  if (defer && checkpoint) {
    const rewardId = rewardIds[Math.floor(Math.random() * rewardIds.length)];
    return defer({
      ...log,
      playerDied: log.finalState.players.find((unit) => unit.id === player.id)!.hp <= 0,
      rewardItemName: null,
    }, rewardId ? [rewardId] : [], checkpoint);
  }
  return applyBattleSettlement(tx, character, log, rewardIds, options);
}

export async function applyBattleSettlement(
  tx: TransactionClient,
  character: Character,
  log: BattleLog,
  rewardIds: string[],
  options?: BattleSettlementOptions,
): Promise<RaidBattleResult> {
  const characterId = character.id;
  const player = log.initialState.players.find((unit) => unit.id === characterId);
  if (!player) throw new Error("Missing player battle state");
  const finalPlayer = log.finalState.players.find(
    (participant) => participant.id === player.id,
  );
  if (!finalPlayer) throw new Error("Missing player battle result");
  const playerDied = finalPlayer.hp <= 0;
  const playerWon = log.result.winnerTeamId === player.teamId;

  const rewardResolution: {
    rewardItemName: string | null;
    rewardItem: RaidBattleResult["rewardItem"];
  } = await (async () => {
    if (playerDied) {
      await tx
        .delete(raidInventoryItems)
        .where(eq(raidInventoryItems.characterId, characterId));
      await tx
        .delete(characterWeapons)
        .where(eq(characterWeapons.characterId, characterId));
      await tx
        .update(characters)
        .set({
          isRaiding: false,
          ...recoveryVitals(character),
          returnedAt: new Date(),
          time: 0,
          currentNodeId: 0,
          weight: 0,
          activeFoodBuff: null,
        })
        .where(eq(characters.id, characterId));
      return { rewardItemName: null, rewardItem: null };
    }

    const weight = await calculateInventoryWeight(tx, characterId);
    await tx
      .update(characters)
      .set({
        hp: Math.min(character.maxHp, finalPlayer.hp),
        stamina: character.maxStamina,
        weight,
      })
      .where(eq(characters.id, characterId));
    if (!playerWon) return { rewardItemName: null, rewardItem: null };
    const fallbackWeapon = (await tx.query.weaponMasters.findFirst()) as unknown as
      | WeaponMaster
      | undefined;
    const rewardId: string | undefined =
      rewardIds[Math.floor(Math.random() * rewardIds.length)] ??
      fallbackWeapon?.id;
    if (!rewardId) return { rewardItemName: null, rewardItem: null };

    if (options?.deferLootToPending) {
      const dbReward = await tx.query.weaponMasters.findFirst({
        where: eq(weaponMasters.id, rewardId),
      });
      const catalogReward = dbReward ? null : getCatalogItemById(rewardId);
      if (!dbReward && catalogReward) {
        await tx
          .insert(weaponMasters)
          .values({
            id: catalogReward.id,
            name: catalogReward.name,
            damage: catalogReward.damage,
            staminaCost: catalogReward.staminaCost,
            cooldownTicks: catalogReward.cooldownTicks,
            castTicks: catalogReward.castTicks,
            weight: catalogReward.weight,
            value: catalogReward.value,
            description: catalogReward.description,
            attackType: catalogReward.attackType,
            iconKey: catalogReward.iconKey,
            effect: catalogReward.effect,
          })
          .onConflictDoNothing();
      }
      const resolved = dbReward ?? catalogReward;
      if (!resolved) return { rewardItemName: null, rewardItem: null };
      return {
        rewardItemName: resolved.name,
        rewardItem: {
          weaponMasterId: resolved.id,
          name: resolved.name,
          weight: resolved.weight,
          value: resolved.value,
          iconKey: resolved.iconKey,
          quantity: 1,
        },
      };
    }

    const inventory = await tx.query.raidInventoryItems.findMany({
      where: eq(raidInventoryItems.characterId, characterId),
    });
    const reward = await tx.query.weaponMasters.findFirst({
      where: eq(weaponMasters.id, rewardId),
    });
    if (!reward || weight + reward.weight > character.maxWeight) {
      return { rewardItemName: null, rewardItem: null };
    }
    const slotIndex = findNextAvailableBackpackSlotIndex(
      inventory.map((item) => item.slotIndex),
    );
    await tx.insert(raidInventoryItems).values({
      characterId,
      weaponMasterId: rewardId,
      slotIndex,
      quantity: 1,
    });
    await tx
      .update(characters)
      .set({ weight: weight + reward.weight })
      .where(eq(characters.id, characterId));
    return { rewardItemName: reward.name, rewardItem: null };
  })();

  return {
    ...log,
    playerDied,
    rewardItemName: rewardResolution.rewardItemName,
    ...(rewardResolution.rewardItem
      ? { rewardItem: rewardResolution.rewardItem }
      : {}),
  };
}

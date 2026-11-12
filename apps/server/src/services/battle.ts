import type {
  BattleCombatant,
  BattleLog,
  PlayerState,
  GhostMatch,
  RaidBattleResult,
  WeaponData,
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
import { patrolCombat } from "../logic/ghostPatrols";
import { hanlimNpcs } from "../logic/npcs";
import { recoveryVitals } from "../logic/rules";
import { retreatDamageMultiplier } from "../logic/retreat";
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

export function toBattleWeapon(weapon: WeaponMaster): WeaponData {
  const effect = z
    .object({
      type: z.literal("HEAL"),
      amount: z.number().int().positive(),
      hpThreshold: z.number().positive().max(1),
      oncePerBattle: z.boolean(),
    })
    .safeParse(weapon.effect);
  return {
    ...weapon,
    effect: effect.success ? effect.data : undefined,
  };
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
  );
  return { ...result, encounter: { kind: "NPC", name: match.name } };
}

export async function executeHanlimBattleInTransaction(
  tx: TransactionClient,
  characterId: string,
  defer?: DeferBattle,
): Promise<RaidBattleResult> {
  const npc = hanlimNpcs.control;
  const weapon = await tx.query.weaponMasters.findFirst({
    where: eq(weaponMasters.id, npc.weaponId),
  });
  if (!weapon) throw new Error(`Weapon ${npc.weaponId} not found`);
  return executeNpcCombat(tx, characterId, npc.id, npc, toBattleWeapon(weapon), {
    kind: "NPC",
    name: npc.name,
    faction: npc.faction,
    role: npc.role,
    reason: npc.reason,
  }, defer);
}

export async function executePatrolGhostBattleInTransaction(
  tx: TransactionClient,
  characterId: string,
  patrolId: string,
  recordedTime: number,
  defer?: DeferBattle,
): Promise<RaidBattleResult> {
  return executeNpcCombat(
    tx,
    characterId,
    patrolId,
    patrolCombat,
    patrolCombat.weapon,
    { kind: "NPC_GHOST", name: patrolCombat.name, patrolId, recordedTime },
    defer,
  );
}

async function executeNpcCombat(
  tx: TransactionClient,
  characterId: string,
  npcId: string,
  npc: { name: string; hp: number; stamina: number; staminaRegen: number },
  weapon: WeaponData,
  encounter: NonNullable<RaidBattleResult["encounter"]>,
  defer?: DeferBattle,
): Promise<RaidBattleResult> {
  const { character, player } = await loadBattlePlayer(tx, characterId);
  const enemy: BattleCombatant = {
    id: `npc:${npcId}`,
    displayName: npc.name,
    teamId: "TeamB",
    hp: npc.hp,
    maxHp: npc.hp,
    stamina: npc.stamina,
    maxStamina: npc.stamina,
    staminaRegen: npc.staminaRegen,
    weight: weapon.weight,
    maxWeight: 50,
    time: character.time,
    currentWeaponIndex: 0,
    weapons: [weapon, null, null, null, null, null],
  };
  const result = await settleBattle(tx, character, player, [enemy], [weapon.id], defer);
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
    stamina: character.stamina,
    maxStamina: character.maxStamina,
    staminaRegen: character.staminaRegen,
    weight: character.weight,
    maxWeight: character.maxWeight,
    time: character.time,
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
): Promise<RaidBattleResult> {
  const { character, player } = await loadBattlePlayer(tx, characterId);
  await tx.insert(raidGhostEncounters).values({
    raidId,
    snapshotId: ghost.id,
  }).onConflictDoNothing();
  const opponent = {
    ...ghost.combatant,
    id: `ghost:${ghost.id}`,
    teamId: "TeamB",
    currentWeaponIndex: 0,
  };
  const result = await settleBattle(
    tx,
    character,
    player,
    [opponent],
    opponent.weapons.flatMap((weapon) => (weapon ? [weapon.id] : [])),
    defer,
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
  return applyBattleSettlement(tx, character, log, rewardIds);
}

export async function applyBattleSettlement(
  tx: TransactionClient,
  character: Character,
  log: BattleLog,
  rewardIds: string[],
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

  const rewardItemName = await (async () => {
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
          time: 0,
          currentNodeId: 0,
          weight: 0,
        })
        .where(eq(characters.id, characterId));
      return null;
    }

    const weight = await calculateInventoryWeight(tx, characterId);
    await tx
      .update(characters)
      .set({ hp: finalPlayer.hp, stamina: finalPlayer.stamina, weight })
      .where(eq(characters.id, characterId));
    if (!playerWon) return null;
    const rewardId =
      rewardIds[Math.floor(Math.random() * rewardIds.length)] ??
      (await tx.query.weaponMasters.findFirst())?.id;
    if (!rewardId) return null;
    const inventory = await tx.query.raidInventoryItems.findMany({
      where: eq(raidInventoryItems.characterId, characterId),
    });
    const occupied = new Set(inventory.map((item) => item.slotIndex));
    const slotIndex = Array.from({ length: 32 }, (_, index) => index).find(
      (index) => !occupied.has(index),
    );
    if (slotIndex === undefined) return null;
    const reward = await tx.query.weaponMasters.findFirst({
      where: eq(weaponMasters.id, rewardId),
    });
    if (!reward || weight + reward.weight > character.maxWeight) return null;
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
    return reward.name;
  })();

  return { ...log, playerDied, rewardItemName };
}

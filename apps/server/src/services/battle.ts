import type {
  Character,
  Prisma,
  PrismaClient,
  WeaponMaster,
} from "@prisma/client";
import { z } from "zod";
import { hanlimNpcs } from "../logic/npcs";
import type {
  BattleCombatant,
  GhostMatch,
  RaidBattleResult,
  WeaponData,
} from "@webgame/types";
import { simulateBattle } from "../logic/simulateBattle";
import { recoveryVitals } from "../logic/rules";
import {
  calculateInventoryWeight,
  withInventoryTransaction,
} from "./inventory";

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
  database: PrismaClient,
  characterId: string,
  level = 1,
): Promise<RaidBattleResult> {
  return withInventoryTransaction(database, (tx) =>
    executeMonsterBattleInTransaction(tx, characterId, level),
  );
}

export async function executeMonsterBattleInTransaction(
  tx: Prisma.TransactionClient,
  characterId: string,
  level = 1,
): Promise<RaidBattleResult> {
  const { character, player } = await loadBattlePlayer(tx, characterId);
  const monsters = await tx.monsterMaster.findMany({
    include: { weapons: { include: { weaponMaster: true } } },
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
  );
  return { ...result, encounter: { kind: "NPC", name: match.name } };
}

export async function executeHanlimBattleInTransaction(
  tx: Prisma.TransactionClient,
  characterId: string,
): Promise<RaidBattleResult> {
  const { character, player } = await loadBattlePlayer(tx, characterId);
  const npc = hanlimNpcs.control;
  const weapon = await tx.weaponMaster.findUniqueOrThrow({
    where: { id: npc.weaponId },
  });
  const enemy: BattleCombatant = {
    id: `npc:${npc.id}`,
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
    weapons: [toBattleWeapon(weapon), null, null, null, null, null],
  };
  const result = await settleBattle(
    tx,
    character,
    player,
    [enemy],
    [weapon.id],
  );
  return {
    ...result,
    encounter: {
      kind: "NPC",
      name: npc.name,
      faction: npc.faction,
      role: npc.role,
      reason: npc.reason,
      worldlineCode: npc.worldlineCode,
    },
  };
}

export async function loadBattlePlayer(
  tx: Prisma.TransactionClient,
  characterId: string,
) {
  const character = await tx.character.findUnique({
    where: { id: characterId },
    include: {
      weapons: { include: { weaponMaster: true } },
      user: true,
      variant: { include: { definition: true } },
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
  tx: Prisma.TransactionClient,
  characterId: string,
  raidId: string,
  ghost: GhostMatch,
): Promise<RaidBattleResult> {
  const { character, player } = await loadBattlePlayer(tx, characterId);
  await tx.raidGhostEncounter.create({
    data: { raidId, snapshotId: ghost.id },
  });
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
  );
  return {
    ...result,
    encounter: {
      kind: "GHOST",
      name: ghost.source.displayName,
      snapshotId: ghost.id,
      recordedRound: ghost.round,
      recordedAt: ghost.createdAt,
      sourceCharacterId: ghost.source.characterId,
      worldlineCode: ghost.source.worldlineCode,
    },
  };
}

async function settleBattle(
  tx: Prisma.TransactionClient,
  character: Character,
  player: BattleCombatant,
  enemies: BattleCombatant[],
  rewardIds: string[],
): Promise<RaidBattleResult> {
  const characterId = character.id;
  const log = simulateBattle([player, ...enemies]);
  const finalPlayer = log.finalState.players.find(
    (participant) => participant.id === player.id,
  );
  if (!finalPlayer) throw new Error("Missing player battle result");
  const playerDied = finalPlayer.hp <= 0;
  const playerWon = log.result.winnerTeamId === player.teamId;

  const rewardItemName = await (async () => {
    if (playerDied) {
      await tx.raidInventoryItem.deleteMany({ where: { characterId } });
      await tx.characterWeapon.deleteMany({ where: { characterId } });
      await tx.character.update({
        where: { id: characterId },
        data: {
          isRaiding: false,
          ...recoveryVitals(character),
          time: 0,
          currentNodeId: 0,
          weight: 0,
        },
      });
      return null;
    }

    const weight = await calculateInventoryWeight(tx, characterId);
    await tx.character.update({
      where: { id: characterId },
      data: { hp: finalPlayer.hp, stamina: finalPlayer.stamina, weight },
    });
    if (!playerWon) return null;
    const rewardId =
      rewardIds[Math.floor(Math.random() * rewardIds.length)] ??
      (await tx.weaponMaster.findFirst())?.id;
    if (!rewardId) return null;
    const inventory = await tx.raidInventoryItem.findMany({
      where: { characterId },
    });
    const occupied = new Set(inventory.map((item) => item.slotIndex));
    const slotIndex = Array.from({ length: 32 }, (_, index) => index).find(
      (index) => !occupied.has(index),
    );
    if (slotIndex === undefined) return null;
    const reward = await tx.weaponMaster.findUnique({
      where: { id: rewardId },
    });
    if (!reward || weight + reward.weight > character.maxWeight) return null;
    await tx.raidInventoryItem.create({
      data: { characterId, weaponMasterId: rewardId, slotIndex, quantity: 1 },
    });
    await tx.character.update({
      where: { id: characterId },
      data: { weight: weight + reward.weight },
    });
    return reward.name;
  })();

  return { ...log, playerDied, rewardItemName };
}

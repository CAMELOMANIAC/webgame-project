import { Prisma, type PrismaClient } from "@prisma/client";
import type { BattleCombatant, GhostMatch } from "@webgame/types";
import { gameRules } from "../logic/rules";
import { seopoMapVersion } from "@webgame/types";
import { toBattleWeapon } from "./battle";

export async function recordGhosts(
  tx: Prisma.TransactionClient,
  characterId: string,
  raidId: string,
  visits: { nodeId: number; round: number }[],
) {
  const character = await tx.character.findUniqueOrThrow({
    where: { id: characterId },
    include: {
      variant: { include: { definition: true } },
      weapons: { include: { weaponMaster: true } },
    },
  });
  if (character.hp <= 0) return;
  const combatant: BattleCombatant = {
    id: character.id,
    displayName: character.displayName ?? character.variant.definition.name,
    teamId: "TeamB",
    hp: character.hp,
    maxHp: character.maxHp,
    stamina: character.stamina,
    maxStamina: character.maxStamina,
    staminaRegen: character.staminaRegen,
    weight: character.weight,
    maxWeight: character.maxWeight,
    time: 0,
    currentWeaponIndex: 0,
    weapons: [null, null, null, null, null, null],
  };
  for (const equipped of character.weapons) {
    if (equipped.slotIndex >= 0 && equipped.slotIndex < 6)
      combatant.weapons[equipped.slotIndex] = toBattleWeapon(
        equipped.weaponMaster,
      );
  }
  await tx.ghostSnapshot.createMany({
    skipDuplicates: true,
    data: visits.map((visit) => ({
      userId: character.userId,
      characterId,
      raidId,
      nodeId: String(visit.nodeId),
      round: visit.round,
      time: visit.round,
      hp: character.hp,
      maxHp: character.maxHp,
      stamina: character.stamina,
      maxStamina: character.maxStamina,
      staminaRegen: character.staminaRegen,
      weight: character.weight,
      maxWeight: character.maxWeight,
      rulesVersion: gameRules.ghost.rulesVersion,
      mapVersion: seopoMapVersion,
      variantId: character.variantId,
      worldlineCode: character.variant.worldlineCode,
      combatant: JSON.parse(
        JSON.stringify({ ...combatant, time: visit.round }),
      ) as Prisma.InputJsonValue,
    })),
  });
}

export async function matchGhost(
  db: PrismaClient | Prisma.TransactionClient,
  userId: string,
  nodeId: number,
  round: number,
  now = new Date(),
  raidId?: string,
): Promise<GhostMatch | null> {
  const { roundTolerance, maxAgeDays, rulesVersion } = gameRules.ghost;
  const snapshots = await db.ghostSnapshot.findMany({
    where: {
      userId: { not: userId },
      ...(raidId ? { encounters: { none: { raidId } } } : {}),
      nodeId: String(nodeId),
      rulesVersion,
      mapVersion: seopoMapVersion,
      round: {
        gte: Math.max(0, round - roundTolerance),
        lte: round + roundTolerance,
      },
      hp: { gt: 0 },
      combatant: { not: Prisma.AnyNull },
      createdAt: {
        gte: new Date(now.getTime() - maxAgeDays * 86400000),
        lte: now,
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
  });
  const match = snapshots.sort(
    (a, b) => Math.abs(a.round - round) - Math.abs(b.round - round),
  )[0];
  if (!match?.combatant) return null;
  const combatant = match.combatant as unknown as BattleCombatant;
  return {
    id: match.id,
    nodeId: Number(match.nodeId),
    round: match.round,
    createdAt: match.createdAt.toISOString(),
    rulesVersion,
    source: {
      characterId: match.characterId,
      displayName: combatant.displayName ?? "고스트",
      variantId: match.variantId,
      worldlineCode: match.worldlineCode,
    },
    combatant,
  };
}

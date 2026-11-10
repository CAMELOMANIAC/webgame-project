import {
  type BattleCombatant,
  type GhostMatch,
  seopoMapVersion,
} from "@webgame/types";
import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  isNotNull,
  lte,
  ne,
  notExists,
} from "drizzle-orm";
import {
  characters,
  type DbOrTx,
  ghostSnapshots,
  raidGhostEncounters,
  type TransactionClient,
} from "../db";
import { gameRules } from "../logic/rules";
import { toBattleWeapon } from "./battle";

export async function recordGhosts(
  tx: TransactionClient,
  characterId: string,
  raidId: string,
  visits: { nodeId: number; round: number }[],
) {
  const character = await tx.query.characters.findFirst({
    where: eq(characters.id, characterId),
    with: {
      variant: { with: { definition: true } },
      weapons: { with: { weaponMaster: true } },
    },
  });
  if (!character) throw new Error("Character not found");
  if (character.hp <= 0 || visits.length === 0) return;
  const combatant: BattleCombatant = {
    id: character.id,
    displayName:
      character.displayName ?? character.variant?.definition?.name ?? "생존자",
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
  await tx
    .insert(ghostSnapshots)
    .values(
      visits.map((visit) => ({
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
        combatant: JSON.parse(
          JSON.stringify({ ...combatant, time: visit.round }),
        ),
      })),
    )
    .onConflictDoNothing({
      target: [
        ghostSnapshots.raidId,
        ghostSnapshots.round,
        ghostSnapshots.nodeId,
      ],
    });
}

export async function matchGhost(
  db: DbOrTx,
  userId: string,
  nodeId: number,
  round: number,
  now = new Date(),
  raidId?: string,
): Promise<GhostMatch | null> {
  const { roundTolerance, maxAgeDays, rulesVersion } = gameRules.ghost;
  const conditions = [
    ne(ghostSnapshots.userId, userId),
    eq(ghostSnapshots.nodeId, String(nodeId)),
    eq(ghostSnapshots.rulesVersion, rulesVersion),
    eq(ghostSnapshots.mapVersion, seopoMapVersion),
    gte(ghostSnapshots.round, Math.max(0, round - roundTolerance)),
    lte(ghostSnapshots.round, round + roundTolerance),
    gt(ghostSnapshots.hp, 0),
    isNotNull(ghostSnapshots.combatant),
    gte(
      ghostSnapshots.createdAt,
      new Date(now.getTime() - maxAgeDays * 86400000),
    ),
    lte(ghostSnapshots.createdAt, now),
  ];
  if (raidId) {
    conditions.push(
      notExists(
        db
          .select()
          .from(raidGhostEncounters)
          .where(
            and(
              eq(raidGhostEncounters.snapshotId, ghostSnapshots.id),
              eq(raidGhostEncounters.raidId, raidId),
            ),
          ),
      ),
    );
  }
  const snapshots = await db
    .select()
    .from(ghostSnapshots)
    .where(and(...conditions))
    .orderBy(desc(ghostSnapshots.createdAt), asc(ghostSnapshots.id));
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
    },
    combatant,
  };
}

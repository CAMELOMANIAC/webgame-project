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
  sql,
} from "drizzle-orm";
import {
  characters,
  type DbOrTx,
  type GhostSnapshot,
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
  visits: { nodeId: number; time: number }[],
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
  const existing = await tx
    .select({
      time: ghostSnapshots.time,
      nodeId: ghostSnapshots.nodeId,
    })
    .from(ghostSnapshots)
    .where(eq(ghostSnapshots.raidId, raidId));
  const recordedKeys = new Set(
    existing.map((row) => `${row.time}:${row.nodeId}`),
  );
  const uniqueVisits = visits.filter((visit) => {
    const key = `${visit.time}:${visit.nodeId}`;
    if (recordedKeys.has(key)) return false;
    recordedKeys.add(key);
    return true;
  });
  if (uniqueVisits.length === 0) return;

  await tx.insert(ghostSnapshots).values(
    uniqueVisits.map((visit) => ({
      userId: character.userId,
      characterId,
      raidId,
      nodeId: String(visit.nodeId),
      time: visit.time,
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
        JSON.stringify({ ...combatant, time: visit.time }),
      ),
    })),
  );
}

export async function matchGhost(
  db: DbOrTx,
  userId: string,
  nodeId: number,
  time: number,
  now = new Date(),
  raidId?: string,
): Promise<GhostMatch | null> {
  const { maxAgeDays, rulesVersion, matchWindowMinutes } = gameRules.ghost;
  const minTime = Math.max(0, time - matchWindowMinutes);
  const maxTime = time + matchWindowMinutes;
  const conditions = [
    ne(ghostSnapshots.userId, userId),
    eq(ghostSnapshots.nodeId, String(nodeId)),
    eq(ghostSnapshots.rulesVersion, rulesVersion),
    eq(ghostSnapshots.mapVersion, seopoMapVersion),
    gte(ghostSnapshots.time, minTime),
    lte(ghostSnapshots.time, maxTime),
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
  const [match] = await db
    .select()
    .from(ghostSnapshots)
    .where(and(...conditions))
    .orderBy(
      sql`abs(${ghostSnapshots.time} - ${time}) asc`,
      sql`case when ${ghostSnapshots.time} <= ${time} then 0 else 1 end asc`,
      desc(ghostSnapshots.createdAt),
      asc(ghostSnapshots.id),
    )
    .limit(1);
  return match ? toGhostMatch(match) : null;
}

export function toGhostMatch(match: GhostSnapshot): GhostMatch | null {
  if (!match.combatant) return null;
  const combatant = match.combatant as unknown as BattleCombatant;
  return {
    id: match.id,
    nodeId: Number(match.nodeId),
    time: match.time,
    createdAt: match.createdAt.toISOString(),
    rulesVersion: match.rulesVersion,
    source: {
      characterId: match.characterId,
      displayName: combatant.displayName ?? "고스트",
      variantId: match.variantId,
    },
    combatant,
  };
}

import { and, asc, eq, gt, inArray, lte, sql } from "drizzle-orm";
import {
  characters,
  characterWeapons,
  type Database,
  raidInventoryItems,
  stashItems,
  weaponMasters,
} from "../db";
import { gameRules } from "../logic/rules";
import {
  InventoryError,
  updateInventoryWeight,
  withInventoryTransaction,
} from "./inventory";

export async function claimBasicSupplies(
  database: Database,
  userId: string,
  characterId: string,
) {
  return withInventoryTransaction(database, async (tx) => {
    await tx.execute(
      sql`SELECT "id" FROM "Character" WHERE "id" = ${characterId} AND "userId" = ${userId} FOR UPDATE`,
    );
    const character = await tx.query.characters.findFirst({
      where: eq(characters.id, characterId),
    });
    if (!character || character.userId !== userId)
      throw new InventoryError("Character not found", 404);
    const userCharacters = await tx.query.characters.findMany({
      where: eq(characters.userId, userId),
      columns: { id: true, isRaiding: true },
    });
    if (
      !gameRules.basicSuppliesEnabled ||
      character.isRaiding ||
      userCharacters.some((entry) => entry.isRaiding)
    )
      throw new InventoryError("Supplies are only available at the base", 409);
    const characterIds = userCharacters.map((entry) => entry.id);
    const equipped =
      characterIds.length > 0
        ? await tx.query.characterWeapons.findMany({
            where: inArray(characterWeapons.characterId, characterIds),
            columns: { id: true },
          })
        : [];
    const carried =
      characterIds.length > 0
        ? await tx.query.raidInventoryItems.findMany({
            where: inArray(raidInventoryItems.characterId, characterIds),
            columns: { id: true },
          })
        : [];
    const stash = await tx.query.stashItems.findMany({
      where: and(eq(stashItems.userId, userId), gt(stashItems.quantity, 0)),
      columns: { id: true },
    });
    if (equipped.length > 0 || carried.length > 0 || stash.length > 0)
      throw new InventoryError(
        "Use your existing equipment before requesting basic supplies",
        409,
      );
    const weapon = await tx.query.weaponMasters.findFirst({
      where: and(
        gt(weaponMasters.damage, 0),
        lte(weaponMasters.weight, character.maxWeight),
      ),
      orderBy: [asc(weaponMasters.value), asc(weaponMasters.id)],
    });
    if (!weapon)
      throw new InventoryError("No basic supplies are available", 404);
    await tx.insert(characterWeapons).values({
      characterId,
      weaponMasterId: weapon.id,
      slotIndex: 0,
    });
    return {
      status: "success",
      itemName: weapon.name,
      weight: await updateInventoryWeight(tx, character),
    };
  });
}

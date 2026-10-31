import type { PrismaClient } from "@prisma/client";
import { gameRules } from "../logic/rules";
import {
  InventoryError,
  updateInventoryWeight,
  withInventoryTransaction,
} from "./inventory";

export async function claimBasicSupplies(
  database: PrismaClient,
  userId: string,
  characterId: string,
) {
  return withInventoryTransaction(database, async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Character" WHERE "id" = ${characterId} AND "userId" = ${userId} FOR UPDATE`;
    const character = await tx.character.findUnique({
      where: { id: characterId },
    });
    if (!character || character.userId !== userId)
      throw new InventoryError("Character not found", 404);
    if (
      !gameRules.basicSuppliesEnabled ||
      character.isRaiding ||
      (await tx.character.count({ where: { userId, isRaiding: true } }))
    )
      throw new InventoryError("Supplies are only available at the base", 409);
    const equipped = await tx.characterWeapon.count({
      where: { character: { userId } },
    });
    const carried = await tx.raidInventoryItem.count({
      where: { character: { userId } },
    });
    const stash = await tx.stashItem.count({
      where: { userId, quantity: { gt: 0 } },
    });
    if (equipped || carried || stash)
      throw new InventoryError(
        "Use your existing equipment before requesting basic supplies",
        409,
      );
    const weapon = await tx.weaponMaster.findFirst({
      where: { damage: { gt: 0 }, weight: { lte: character.maxWeight } },
      orderBy: [{ value: "asc" }, { id: "asc" }],
    });
    if (!weapon)
      throw new InventoryError("No basic supplies are available", 404);
    await tx.characterWeapon.create({
      data: { characterId, weaponMasterId: weapon.id, slotIndex: 0 },
    });
    return {
      status: "success",
      itemName: weapon.name,
      weight: await updateInventoryWeight(tx, character),
    };
  });
}

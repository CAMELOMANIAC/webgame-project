import { randomUUID } from "node:crypto";
import type { TestContext } from "node:test";
import { asc, eq, inArray } from "drizzle-orm";
import {
  characters,
  characterWeapons,
  createDatabase,
  monsterMasters,
  monsterWeapons,
  raidInventoryItems,
  stashItems,
  users,
  weaponMasters,
} from "../db";

// 기존 .env를 사용하지 않는다. 명시적으로 지정한 로컬 테스트 DB만 허용한다.
const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl)
  throw new Error(
    "Set TEST_DATABASE_URL to a disposable local PostgreSQL database",
  );
const parsedUrl = new URL(databaseUrl);
if (
  !["localhost", "127.0.0.1", "[::1]"].includes(parsedUrl.hostname) ||
  !parsedUrl.pathname.startsWith("/webgame_test_")
) {
  throw new Error(
    "Integration tests require a local database named webgame_test_*",
  );
}

export async function integrationFixture(t: TestContext, maxWeight = 50) {
  const db = createDatabase(databaseUrl);
  const [user] = await db
    .insert(users)
    .values({
      email: `${randomUUID()}@example.test`,
      nickname: "InventoryTest",
    })
    .returning();
  if (!user) throw new Error("Failed to create test user");
  const [character] = await db
    .insert(characters)
    .values({ userId: user.id, maxWeight })
    .returning();
  if (!character) throw new Error("Failed to create test character");
  const [weapon] = await db
    .insert(weaponMasters)
    .values({
      name: `InventoryTest-${randomUUID()}`,
      damage: 1,
      staminaCost: 1,
      cooldownTicks: 1,
      castTicks: 0,
      weight: 2,
      value: 1,
    })
    .returning();
  if (!weapon) throw new Error("Failed to create test weapon");
  const monsterIds: string[] = [];
  t.after(async () => {
    const characterIds = (
      await db.query.characters.findMany({
        where: eq(characters.userId, user.id),
        columns: { id: true },
      })
    ).map((entry) => entry.id);
    if (monsterIds.length > 0) {
      await db
        .delete(monsterWeapons)
        .where(inArray(monsterWeapons.monsterId, monsterIds));
      await db
        .delete(monsterMasters)
        .where(inArray(monsterMasters.id, monsterIds));
    }
    if (characterIds.length > 0) {
      await db
        .delete(raidInventoryItems)
        .where(inArray(raidInventoryItems.characterId, characterIds));
      await db
        .delete(characterWeapons)
        .where(inArray(characterWeapons.characterId, characterIds));
    }
    await db.delete(stashItems).where(eq(stashItems.userId, user.id));
    await db.delete(characters).where(eq(characters.userId, user.id));
    await db.delete(users).where(eq(users.id, user.id));
    await db.delete(weaponMasters).where(eq(weaponMasters.id, weapon.id));
    await db.$disconnect();
  });
  const snapshot = async () => {
    const currentChar = await db.query.characters.findFirst({
      where: eq(characters.id, character.id),
    });
    if (!currentChar) throw new Error("Character not found in snapshot");
    return {
      equipment: await db.query.characterWeapons.findMany({
        where: eq(characterWeapons.characterId, character.id),
        orderBy: [asc(characterWeapons.slotIndex)],
      }),
      inventory: await db.query.raidInventoryItems.findMany({
        where: eq(raidInventoryItems.characterId, character.id),
        orderBy: [asc(raidInventoryItems.slotIndex)],
      }),
      stash: await db.query.stashItems.findMany({
        where: eq(stashItems.userId, user.id),
        orderBy: [asc(stashItems.id)],
      }),
      character: currentChar,
    };
  };
  return { db, user, character, weapon, snapshot, monsterIds };
}

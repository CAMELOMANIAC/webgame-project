import { randomUUID } from "node:crypto";
import type { TestContext } from "node:test";
import { PrismaClient } from "@prisma/client";

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
  const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const user = await db.user.create({
    data: { email: `${randomUUID()}@example.test`, nickname: "InventoryTest" },
  });
  const character = await db.character.create({
    data: { userId: user.id, maxWeight },
  });
  const weapon = await db.weaponMaster.create({
    data: {
      name: `InventoryTest-${randomUUID()}`,
      damage: 1,
      staminaCost: 1,
      cooldownTicks: 1,
      castTicks: 0,
      weight: 2,
      value: 1,
    },
  });
  const monsterIds: string[] = [];
  t.after(async () => {
    const characterIds = (
      await db.character.findMany({
        where: { userId: user.id },
        select: { id: true },
      })
    ).map((entry) => entry.id);
    await db.monsterWeapon.deleteMany({
      where: { monsterId: { in: monsterIds } },
    });
    await db.monsterMaster.deleteMany({ where: { id: { in: monsterIds } } });
    await db.raidInventoryItem.deleteMany({
      where: { characterId: { in: characterIds } },
    });
    await db.characterWeapon.deleteMany({
      where: { characterId: { in: characterIds } },
    });
    await db.stashItem.deleteMany({ where: { userId: user.id } });
    await db.character.deleteMany({ where: { userId: user.id } });
    await db.user.delete({ where: { id: user.id } });
    await db.weaponMaster.delete({ where: { id: weapon.id } });
    await db.$disconnect();
  });
  const snapshot = async () => ({
    equipment: await db.characterWeapon.findMany({
      where: { characterId: character.id },
      orderBy: { slotIndex: "asc" },
    }),
    inventory: await db.raidInventoryItem.findMany({
      where: { characterId: character.id },
      orderBy: { slotIndex: "asc" },
    }),
    stash: await db.stashItem.findMany({
      where: { userId: user.id },
      orderBy: { id: "asc" },
    }),
    character: await db.character.findUniqueOrThrow({
      where: { id: character.id },
    }),
  });
  return { db, user, character, weapon, snapshot, monsterIds };
}

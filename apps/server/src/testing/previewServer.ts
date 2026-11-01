import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { buildApp } from "../app";
import {
  characters,
  characterWeapons,
  createDatabase,
  raidInventoryItems,
  stashItems,
  users,
  weaponMasters,
} from "../db";
import { firstMission } from "../logic/story";
import { extractRaid, navigateRaid, startRaid } from "../services/raid";
import { pathToNode } from "./mapRoute";
import { localTestDatabaseUrl } from "./testDatabase";

async function main() {
  const db = createDatabase(localTestDatabaseUrl());
  const fixtures = await db.transaction(async (tx) => {
    const [weapon] = await tx
      .insert(weaponMasters)
      .values({
        name: "검증용 잔상 장비",
        damage: 4,
        staminaCost: 1,
        cooldownTicks: 2,
        castTicks: 0,
        weight: 2,
        value: 1,
        attackType: "RANGED",
        iconKey: "RIFLE",
      })
      .returning();
    if (!weapon) throw new Error("Failed to create preview weapon");

    const [user] = await tx
      .insert(users)
      .values({
        email: `preview-${randomUUID()}@example.test`,
        nickname: "로컬 검증 생존자",
      })
      .returning();
    if (!user) throw new Error("Failed to create preview user");

    const [userChar] = await tx
      .insert(characters)
      .values({
        userId: user.id,
        displayName: "생존자",
      })
      .returning();
    if (!userChar) throw new Error("Failed to create preview character");

    const [source] = await tx
      .insert(users)
      .values({
        email: `ghost-${randomUUID()}@example.test`,
        nickname: "고스트 검증 기록",
      })
      .returning();
    if (!source) throw new Error("Failed to create source user");

    const [sourceChar] = await tx
      .insert(characters)
      .values({
        userId: source.id,
        displayName: "생존자",
        hp: 40,
        maxHp: 40,
        weight: weapon.weight,
      })
      .returning();
    if (!sourceChar) throw new Error("Failed to create source character");

    await tx.insert(characterWeapons).values({
      characterId: sourceChar.id,
      weaponMasterId: weapon.id,
      slotIndex: 0,
    });

    return {
      weapon,
      user: { ...user, characters: [userChar] },
      source: { ...source, characters: [sourceChar] },
    };
  });
  const { weapon, user, source } = fixtures;
  const app = buildApp({ database: db, logger: false });
  let closing = false;
  const cleanup = async () => {
    if (closing) return;
    closing = true;
    const keepAlive = setInterval(() => {}, 1000);
    try {
      await app.close();
      for (const owner of [user, source]) {
        const ids = (
          await db.query.characters.findMany({
            where: eq(characters.userId, owner.id),
            columns: { id: true },
          })
        ).map((character) => character.id);
        if (ids.length > 0) {
          await db
            .delete(raidInventoryItems)
            .where(inArray(raidInventoryItems.characterId, ids));
          await db
            .delete(characterWeapons)
            .where(inArray(characterWeapons.characterId, ids));
        }
        await db.delete(stashItems).where(eq(stashItems.userId, owner.id));
        await db.delete(characters).where(eq(characters.userId, owner.id));
        await db.delete(users).where(eq(users.id, owner.id));
      }
      await db.delete(weaponMasters).where(eq(weaponMasters.id, weapon.id));
    } finally {
      await db.$disconnect();
      clearInterval(keepAlive);
    }
  };
  try {
    const characterId = source.characters[0]!.id;
    const raid = (await startRaid(db, source.id, characterId)).raid;
    const path = pathToNode(firstMission.targetNodeId);
    const command = (version: number) => ({
      raidId: raid.id,
      expectedVersion: version,
      requestId: randomUUID(),
    });
    const outward = await navigateRaid(
      db,
      source.id,
      characterId,
      { ...command(0), path },
      () => 0.99,
    );
    const back = await navigateRaid(
      db,
      source.id,
      characterId,
      { ...command(outward.raid.version), path: [...path].reverse() },
      () => 0.99,
    );
    await extractRaid(db, source.id, characterId, command(back.raid.version));
    await app.listen({ host: "127.0.0.1", port: 3001 });
  } catch (error) {
    await cleanup();
    throw error;
  }
  const stop = () => {
    void cleanup().catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  console.log(
    JSON.stringify({
      url: "http://127.0.0.1:3001",
      nickname: user.nickname,
      userId: user.id,
      characterId: user.characters[0]!.id,
    }),
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

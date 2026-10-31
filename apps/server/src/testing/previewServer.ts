import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { buildApp } from "../app";
import { firstMission } from "../logic/story";
import { extractRaid, navigateRaid, startRaid } from "../services/raid";
import { pathToNode } from "./mapRoute";
import { localTestDatabaseUrl } from "./testDatabase";

async function main() {
  const db = new PrismaClient({
    datasources: { db: { url: localTestDatabaseUrl() } },
  });
  const fixtures = await db.$transaction(async (tx) => {
    const weapon = await tx.weaponMaster.create({
      data: {
        name: "검증용 잔상 장비",
        damage: 4,
        staminaCost: 1,
        cooldownTicks: 2,
        castTicks: 0,
        weight: 2,
        value: 1,
        attackType: "RANGED",
        iconKey: "RIFLE",
      },
    });
    const user = await tx.user.create({
      data: {
        email: `preview-${randomUUID()}@example.test`,
        nickname: "로컬 검증 생존자",
        characters: { create: { displayName: "생존자" } },
      },
      include: { characters: true },
    });
    const source = await tx.user.create({
      data: {
        email: `ghost-${randomUUID()}@example.test`,
        nickname: "고스트 검증 기록",
        characters: {
          create: {
            displayName: "생존자",
            hp: 40,
            maxHp: 40,
            weight: weapon.weight,
            weapons: { create: { weaponMasterId: weapon.id, slotIndex: 0 } },
          },
        },
      },
      include: { characters: true },
    });
    return { weapon, user, source };
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
          await db.character.findMany({
            where: { userId: owner.id },
            select: { id: true },
          })
        ).map((character) => character.id);
        await db.raidInventoryItem.deleteMany({
          where: { characterId: { in: ids } },
        });
        await db.characterWeapon.deleteMany({
          where: { characterId: { in: ids } },
        });
        await db.stashItem.deleteMany({ where: { userId: owner.id } });
        await db.character.deleteMany({ where: { userId: owner.id } });
        await db.user.delete({ where: { id: owner.id } });
      }
      await db.weaponMaster.delete({ where: { id: weapon.id } });
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

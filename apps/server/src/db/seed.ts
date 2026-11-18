import { ALL_CATALOG_ITEMS } from "@webgame/types";
import { eq } from "drizzle-orm";
import {
  characters,
  characterWeapons,
  createDatabase,
  ghostSnapshots,
  ghostWeapons,
  monsterMasters,
  monsterWeapons,
  raidInventoryItems,
  stashItems,
  users,
  type WeaponMaster,
  weaponMasters,
} from "./index";

const db = createDatabase();

async function main() {
  const weapons: (typeof weaponMasters.$inferInsert)[] = ALL_CATALOG_ITEMS.map(
    (item) => ({
      id: item.id,
      name: item.name,
      damage: item.damage,
      staminaCost: item.staminaCost,
      cooldownTicks: item.cooldownTicks,
      castTicks: item.castTicks,
      weight: item.weight,
      value: item.value,
      description: item.description,
      attackType: item.attackType,
      iconKey: item.iconKey,
      effect: item.effect,
    }),
  );

  console.log("Clearing existing data...");
  await db.delete(raidInventoryItems);
  await db.delete(characterWeapons);
  await db.delete(characters);
  await db.delete(monsterWeapons);
  await db.delete(monsterMasters);
  await db.delete(ghostWeapons);
  await db.delete(ghostSnapshots);
  await db.delete(stashItems);
  await db.delete(weaponMasters);

  console.log("Seeding weapons...");
  const weaponData: WeaponMaster[] = [];
  for (const w of weapons) {
    const [created] = await db.insert(weaponMasters).values(w).returning();
    if (created) weaponData.push(created);
  }

  console.log("Seeding monsters...");
  const monsters = [
    {
      name: "Slime",
      hp: 30,
      maxHp: 30,
      stamina: 50,
      maxStamina: 50,
      staminaRegen: 5,
      level: 1,
    },
    {
      name: "Goblin",
      hp: 60,
      maxHp: 60,
      stamina: 80,
      maxStamina: 80,
      staminaRegen: 8,
      level: 3,
    },
    {
      name: "Orc Warrior",
      hp: 150,
      maxHp: 150,
      stamina: 120,
      maxStamina: 120,
      staminaRegen: 10,
      level: 7,
    },
  ];

  const primarySword = weaponData.find((w) => w.id === "wpn_primary" || w.name === "표준 도검");
  const secondaryDagger = weaponData.find((w) => w.id === "wpn_dagger" || w.name === "전술 단검");
  const giantSlayer = weaponData.find((w) => w.id === "wpn_giant_slayer" || w.name === "중량 파쇄 해머");
  const sniperRifle = weaponData.find((w) => w.id === "wpn_sniper" || w.name === "정밀 저격 소총");
  const lifeSaver = weaponData.find((w) => w.id === "wpn_lifesaver" || w.name === "응급 생체 팩");

  for (const m of monsters) {
    const [createdMonster] = await db
      .insert(monsterMasters)
      .values(m)
      .returning();
    if (!createdMonster) continue;

    if (m.name === "Slime" && secondaryDagger) {
      await db.insert(monsterWeapons).values({
        monsterId: createdMonster.id,
        weaponMasterId: secondaryDagger.id,
        slotIndex: 0,
      });
    } else if (m.name === "Goblin" && primarySword) {
      await db.insert(monsterWeapons).values({
        monsterId: createdMonster.id,
        weaponMasterId: primarySword.id,
        slotIndex: 0,
      });
    } else if (m.name === "Orc Warrior") {
      if (primarySword) {
        await db.insert(monsterWeapons).values({
          monsterId: createdMonster.id,
          weaponMasterId: primarySword.id,
          slotIndex: 0,
        });
      }
      if (giantSlayer) {
        await db.insert(monsterWeapons).values({
          monsterId: createdMonster.id,
          weaponMasterId: giantSlayer.id,
          slotIndex: 1,
        });
      }
    }
  }

  console.log("Creating test user and character...");
  let user = await db.query.users.findFirst({
    where: eq(users.email, "test@example.com"),
  });
  if (!user) {
    const [createdUser] = await db
      .insert(users)
      .values({
        email: "test@example.com",
        nickname: "TestPlayer",
      })
      .returning();
    user = createdUser!;
  }

  let character = user.selectedCharacterId
    ? await db.query.characters.findFirst({
        where: eq(characters.id, user.selectedCharacterId),
      })
    : undefined;

  if (character) {
    const [updatedChar] = await db
      .update(characters)
      .set({
        hp: 100,
        maxHp: 100,
        stamina: 100,
        maxStamina: 100,
        staminaRegen: 10,
        weight: 0,
        maxWeight: 60,
        time: 0,
        isRaiding: false,
      })
      .where(eq(characters.id, character.id))
      .returning();
    character = updatedChar!;
  } else {
    const [createdChar] = await db
      .insert(characters)
      .values({
        userId: user.id,
        hp: 100,
        maxHp: 100,
        stamina: 100,
        maxStamina: 100,
        staminaRegen: 10,
        weight: 0,
        maxWeight: 60,
        time: 0,
        isRaiding: false,
      })
      .returning();
    character = createdChar!;
  }

  console.log("Equipping character weapons...");
  if (primarySword) {
    await db.insert(characterWeapons).values({
      characterId: character.id,
      weaponMasterId: primarySword.id,
      slotIndex: 0,
    });
  }
  if (secondaryDagger) {
    await db.insert(characterWeapons).values({
      characterId: character.id,
      weaponMasterId: secondaryDagger.id,
      slotIndex: 1,
    });
  }

  console.log("Adding items to character inventory (backpack)...");
  if (sniperRifle) {
    await db.insert(raidInventoryItems).values({
      characterId: character.id,
      weaponMasterId: sniperRifle.id,
      slotIndex: 0,
    });
  }
  if (lifeSaver) {
    await db.insert(raidInventoryItems).values({
      characterId: character.id,
      weaponMasterId: lifeSaver.id,
      slotIndex: 1,
    });
  }

  console.log("Adding weapons to user stash (warehouse)...");
  const allWeapons = (await db.query.weaponMasters.findMany()) as unknown as {
    id: string;
  }[];
  for (const wm of allWeapons) {
    await db.insert(stashItems).values({
      userId: user.id,
      weaponMasterId: wm.id,
      quantity: 1,
    });
  }

  console.log("Seed completed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

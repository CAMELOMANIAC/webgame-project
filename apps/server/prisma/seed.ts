import { PrismaClient, Prisma } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const weapons = [
    {
      name: "Primary Sword",
      damage: 10,
      cooldownTicks: 10,
      staminaCost: 10,
      castTicks: 0,
      weight: 5,
      value: 100,
      description: "A standard sword.",
    },
    {
      name: "Secondary Dagger",
      damage: 5,
      cooldownTicks: 8,
      staminaCost: 5,
      castTicks: 0,
      weight: 3,
      value: 50,
      description: "Quick but weak.",
    },
    {
      name: "Life-saver",
      damage: 0,
      cooldownTicks: 0,
      staminaCost: 20,
      castTicks: 0,
      weight: 2,
      value: 150,
      description: "Heals you when health is low.",
    },
    {
      name: "Sniper Rifle",
      damage: 25,
      cooldownTicks: 20,
      staminaCost: 30,
      castTicks: 15,
      weight: 15,
      value: 300,
      description: "Heavy damage from distance.",
    },
    {
      name: "Giant Slayer",
      damage: 15,
      cooldownTicks: 12,
      staminaCost: 15,
      castTicks: 5,
      weight: 10,
      value: 200,
      description: "Strong against tanky enemies.",
    },
  ];

  console.log("Clearing existing data...");
  await prisma.raidInventoryItem.deleteMany();
  await prisma.characterWeapon.deleteMany();
  await prisma.character.deleteMany();
  await prisma.monsterWeapon.deleteMany();
  await prisma.monsterMaster.deleteMany();
  await prisma.ghostWeapon.deleteMany();
  await prisma.ghostSnapshot.deleteMany();
  await prisma.stashItem.deleteMany();
  await prisma.weaponMaster.deleteMany();

  console.log("Seeding weapons...");
  const weaponData: any[] = []; // Using any here for local storage, but creating with prisma types
  for (const w of weapons) {
    const created = await prisma.weaponMaster.create({
      data: w,
    });
    weaponData.push(created);
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

  const primarySword = weaponData.find((w) => w.name === "Primary Sword");
  const secondaryDagger = weaponData.find((w) => w.name === "Secondary Dagger");
  const giantSlayer = weaponData.find((w) => w.name === "Giant Slayer");
  const sniperRifle = weaponData.find((w) => w.name === "Sniper Rifle");
  const lifeSaver = weaponData.find((w) => w.name === "Life-saver");

  for (const m of monsters) {
    const createdMonster = await prisma.monsterMaster.create({
      data: m,
    });

    if (m.name === "Slime" && secondaryDagger) {
      await prisma.monsterWeapon.create({
        data: { monsterId: createdMonster.id, weaponMasterId: secondaryDagger.id, slotIndex: 0 },
      });
    } else if (m.name === "Goblin" && primarySword) {
      await prisma.monsterWeapon.create({
        data: { monsterId: createdMonster.id, weaponMasterId: primarySword.id, slotIndex: 0 },
      });
    } else if (m.name === "Orc Warrior") {
      if (primarySword) {
        await prisma.monsterWeapon.create({
          data: { monsterId: createdMonster.id, weaponMasterId: primarySword.id, slotIndex: 0 },
        });
      }
      if (giantSlayer) {
        await prisma.monsterWeapon.create({
          data: { monsterId: createdMonster.id, weaponMasterId: giantSlayer.id, slotIndex: 1 },
        });
      }
    }
  }

  console.log("Creating test user and character...");
  const user = await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: {
      email: "test@example.com",
      nickname: "TestPlayer",
    },
  });

  const character = await prisma.character.upsert({
    where: { userId: user.id },
    update: {
      hp: 100,
      maxHp: 100,
      stamina: 100,
      maxStamina: 100,
      staminaRegen: 10,
      weight: 0,
      maxWeight: 60,
      time: 0,
      isRaiding: false,
    },
    create: {
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
    },
  });

  console.log("Equipping character weapons...");
  if (primarySword) {
    await prisma.characterWeapon.create({
      data: { characterId: character.id, weaponMasterId: primarySword.id, slotIndex: 0 },
    });
  }
  if (secondaryDagger) {
    await prisma.characterWeapon.create({
      data: { characterId: character.id, weaponMasterId: secondaryDagger.id, slotIndex: 1 },
    });
  }

  console.log("Adding items to character inventory (backpack)...");
  if (sniperRifle) {
    await prisma.raidInventoryItem.create({
      data: { characterId: character.id, weaponMasterId: sniperRifle.id, slotIndex: 0 },
    });
  }
  if (lifeSaver) {
    await prisma.raidInventoryItem.create({
      data: { characterId: character.id, weaponMasterId: lifeSaver.id, slotIndex: 1 },
    });
  }

  console.log("Adding weapons to user stash (warehouse)...");
  const weaponMasters = await prisma.weaponMaster.findMany();
  for (const wm of weaponMasters) {
    await prisma.stashItem.create({
      data: {
        userId: user.id,
        weaponMasterId: wm.id,
        quantity: 1,
      },
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
    await prisma.$disconnect();
  });

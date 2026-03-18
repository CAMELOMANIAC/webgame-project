import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

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
      description: "A standard sword."
    },
    {
      name: "Secondary Dagger",
      damage: 5,
      cooldownTicks: 8,
      staminaCost: 5,
      castTicks: 0,
      weight: 3,
      value: 50,
      description: "Quick but weak."
    },
    {
      name: "Life-saver",
      damage: 0,
      cooldownTicks: 0,
      staminaCost: 20,
      castTicks: 0,
      weight: 2,
      value: 150,
      description: "Heals you when health is low."
    },
    {
      name: "Sniper Rifle",
      damage: 25,
      cooldownTicks: 20,
      staminaCost: 30,
      castTicks: 15,
      weight: 15,
      value: 300,
      description: "Heavy damage from distance."
    },
    {
      name: "Giant Slayer",
      damage: 15,
      cooldownTicks: 12,
      staminaCost: 15,
      castTicks: 5,
      weight: 10,
      value: 200,
      description: "Strong against tanky enemies."
    }
  ]

  console.log('Clearing existing data...')
  await prisma.stashItem.deleteMany()
  await prisma.weaponMaster.deleteMany()
  // User should be upserted instead of deleted to avoid breaking snapshots

  console.log('Seeding weapons...')
  for (const w of weapons) {
    await prisma.weaponMaster.create({
      data: w
    })
  }

  console.log('Creating test user...')
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      nickname: 'TestPlayer',
    },
  })

  console.log('Adding weapons to stash...')
  const weaponMasters = await prisma.weaponMaster.findMany()
  for (const wm of weaponMasters) {
    await prisma.stashItem.create({
      data: {
        userId: user.id,
        weaponMasterId: wm.id,
        quantity: 1
      }
    })
  }

  console.log('Seed completed')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hp" INTEGER NOT NULL DEFAULT 100,
    "maxHp" INTEGER NOT NULL DEFAULT 100,
    "stamina" INTEGER NOT NULL DEFAULT 100,
    "maxStamina" INTEGER NOT NULL DEFAULT 100,
    "staminaRegen" INTEGER NOT NULL DEFAULT 10,
    "weight" INTEGER NOT NULL DEFAULT 0,
    "maxWeight" INTEGER NOT NULL DEFAULT 50,
    "time" INTEGER NOT NULL DEFAULT 0,
    "isRaiding" BOOLEAN NOT NULL DEFAULT false,
    "currentNodeId" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterWeapon" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "weaponMasterId" TEXT NOT NULL,
    "slotIndex" INTEGER NOT NULL,

    CONSTRAINT "CharacterWeapon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaidInventoryItem" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "weaponMasterId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "slotIndex" INTEGER NOT NULL,

    CONSTRAINT "RaidInventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeaponMaster" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "damage" INTEGER NOT NULL,
    "staminaCost" INTEGER NOT NULL,
    "cooldownTicks" INTEGER NOT NULL,
    "castTicks" INTEGER NOT NULL,
    "weight" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,
    "description" TEXT,

    CONSTRAINT "WeaponMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonsterMaster" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hp" INTEGER NOT NULL,
    "maxHp" INTEGER NOT NULL,
    "stamina" INTEGER NOT NULL,
    "maxStamina" INTEGER NOT NULL,
    "staminaRegen" INTEGER NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "MonsterMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonsterWeapon" (
    "id" TEXT NOT NULL,
    "monsterId" TEXT NOT NULL,
    "weaponMasterId" TEXT NOT NULL,
    "slotIndex" INTEGER NOT NULL,

    CONSTRAINT "MonsterWeapon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StashItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weaponMasterId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "StashItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GhostSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "time" INTEGER NOT NULL,
    "hp" INTEGER NOT NULL,
    "maxHp" INTEGER NOT NULL,
    "stamina" INTEGER NOT NULL,
    "maxStamina" INTEGER NOT NULL,
    "staminaRegen" INTEGER NOT NULL,
    "weight" INTEGER NOT NULL,
    "maxWeight" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GhostSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GhostWeapon" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "weaponMasterId" TEXT NOT NULL,
    "slotIndex" INTEGER NOT NULL,

    CONSTRAINT "GhostWeapon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Character_userId_key" ON "Character"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterWeapon_characterId_slotIndex_key" ON "CharacterWeapon"("characterId", "slotIndex");

-- CreateIndex
CREATE UNIQUE INDEX "RaidInventoryItem_characterId_slotIndex_key" ON "RaidInventoryItem"("characterId", "slotIndex");

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterWeapon" ADD CONSTRAINT "CharacterWeapon_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterWeapon" ADD CONSTRAINT "CharacterWeapon_weaponMasterId_fkey" FOREIGN KEY ("weaponMasterId") REFERENCES "WeaponMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidInventoryItem" ADD CONSTRAINT "RaidInventoryItem_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidInventoryItem" ADD CONSTRAINT "RaidInventoryItem_weaponMasterId_fkey" FOREIGN KEY ("weaponMasterId") REFERENCES "WeaponMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterWeapon" ADD CONSTRAINT "MonsterWeapon_monsterId_fkey" FOREIGN KEY ("monsterId") REFERENCES "MonsterMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterWeapon" ADD CONSTRAINT "MonsterWeapon_weaponMasterId_fkey" FOREIGN KEY ("weaponMasterId") REFERENCES "WeaponMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StashItem" ADD CONSTRAINT "StashItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StashItem" ADD CONSTRAINT "StashItem_weaponMasterId_fkey" FOREIGN KEY ("weaponMasterId") REFERENCES "WeaponMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GhostSnapshot" ADD CONSTRAINT "GhostSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GhostWeapon" ADD CONSTRAINT "GhostWeapon_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "GhostSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GhostWeapon" ADD CONSTRAINT "GhostWeapon_weaponMasterId_fkey" FOREIGN KEY ("weaponMasterId") REFERENCES "WeaponMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

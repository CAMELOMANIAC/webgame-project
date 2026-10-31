-- DropForeignKey
ALTER TABLE "GhostSnapshot" DROP CONSTRAINT "GhostSnapshot_userId_fkey";

-- DropForeignKey
ALTER TABLE "GhostWeapon" DROP CONSTRAINT "GhostWeapon_snapshotId_fkey";

-- AlterTable
ALTER TABLE "GhostSnapshot" ADD COLUMN     "characterId" TEXT,
ADD COLUMN     "combatant" JSONB,
ADD COLUMN     "raidId" TEXT,
ADD COLUMN     "round" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rulesVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "variantId" TEXT,
ADD COLUMN     "worldlineCode" TEXT;

-- CreateIndex
CREATE INDEX "GhostSnapshot_nodeId_rulesVersion_round_createdAt_idx" ON "GhostSnapshot"("nodeId", "rulesVersion", "round", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GhostSnapshot_raidId_round_nodeId_key" ON "GhostSnapshot"("raidId", "round", "nodeId");

-- AddForeignKey
ALTER TABLE "GhostSnapshot" ADD CONSTRAINT "GhostSnapshot_raidId_fkey" FOREIGN KEY ("raidId") REFERENCES "RaidSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GhostSnapshot" ADD CONSTRAINT "GhostSnapshot_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GhostSnapshot" ADD CONSTRAINT "GhostSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GhostWeapon" ADD CONSTRAINT "GhostWeapon_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "GhostSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

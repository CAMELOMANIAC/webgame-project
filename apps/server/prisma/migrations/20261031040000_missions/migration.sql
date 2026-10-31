-- CreateEnum
CREATE TYPE "QuestStatus" AS ENUM ('ACTIVE', 'RECOVERED', 'READY', 'COMPLETE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "storyTier" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "QuestProgress" (
    "userId" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "definitionVersion" INTEGER NOT NULL DEFAULT 1,
    "status" "QuestStatus" NOT NULL DEFAULT 'ACTIVE',
    "recoveredRaidId" TEXT,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "QuestProgress_pkey" PRIMARY KEY ("userId","questId")
);

-- AddForeignKey
ALTER TABLE "QuestProgress" ADD CONSTRAINT "QuestProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestProgress" ADD CONSTRAINT "QuestProgress_recoveredRaidId_fkey" FOREIGN KEY ("recoveredRaidId") REFERENCES "RaidSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

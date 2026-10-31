-- CreateEnum
CREATE TYPE "RaidStatus" AS ENUM ('ACTIVE', 'EXTRACTED', 'DEAD');

-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "activeRaidId" TEXT;

-- CreateTable
CREATE TABLE "RaidSession" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "status" "RaidStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 0,
    "currentNodeId" INTEGER NOT NULL DEFAULT 0,
    "round" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "RaidSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaidCommand" (
    "id" TEXT NOT NULL,
    "raidId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RaidCommand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RaidSession_characterId_startedAt_idx" ON "RaidSession"("characterId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RaidCommand_raidId_requestId_key" ON "RaidCommand"("raidId", "requestId");

-- CreateIndex
CREATE UNIQUE INDEX "Character_activeRaidId_key" ON "Character"("activeRaidId");

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_activeRaidId_fkey" FOREIGN KEY ("activeRaidId") REFERENCES "RaidSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidSession" ADD CONSTRAINT "RaidSession_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidCommand" ADD CONSTRAINT "RaidCommand_raidId_fkey" FOREIGN KEY ("raidId") REFERENCES "RaidSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 기존 탐사 중인 캐릭터는 상태를 보존한 세션으로 연결한다.
INSERT INTO "RaidSession" ("id", "characterId", "status", "version", "currentNodeId", "round", "startedAt")
SELECT "id", "id", 'ACTIVE', 0, "currentNodeId", "time", CURRENT_TIMESTAMP
FROM "Character" WHERE "isRaiding" = true;

UPDATE "Character" SET "activeRaidId" = "id" WHERE "isRaiding" = true;

CREATE TABLE "RaidGhostEncounter" (
  "raidId" TEXT NOT NULL,
  "snapshotId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RaidGhostEncounter_pkey" PRIMARY KEY ("raidId", "snapshotId"),
  CONSTRAINT "RaidGhostEncounter_raidId_fkey" FOREIGN KEY ("raidId") REFERENCES "RaidSession"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RaidGhostEncounter_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "GhostSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

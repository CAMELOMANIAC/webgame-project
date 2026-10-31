CREATE TABLE "CharacterDefinition" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL
);
CREATE TABLE "CharacterVariant" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "definitionId" TEXT NOT NULL,
  "worldlineCode" TEXT NOT NULL,
  "maxHp" INTEGER NOT NULL DEFAULT 100,
  "maxStamina" INTEGER NOT NULL DEFAULT 100,
  "staminaRegen" INTEGER NOT NULL DEFAULT 10,
  "maxWeight" INTEGER NOT NULL DEFAULT 50,
  CONSTRAINT "CharacterVariant_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "CharacterDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CharacterVariant_definitionId_worldlineCode_key" ON "CharacterVariant"("definitionId", "worldlineCode");

-- 기존 인물은 미분류 세계선으로 보존한다. 나머지는 개발 검증용 제안 데이터다.
INSERT INTO "CharacterDefinition" ("id", "name") VALUES
  ('legacy-survivor', '생존자'), ('dev-researcher', '개발용 연구원');
INSERT INTO "CharacterVariant" ("id", "definitionId", "worldlineCode") VALUES
  ('legacy-origin', 'legacy-survivor', '미분류'),
  ('dev-survivor-beta', 'legacy-survivor', '개발용 B'),
  ('dev-researcher-origin', 'dev-researcher', '개발용 A');

ALTER TABLE "Character" ADD COLUMN "variantId" TEXT NOT NULL DEFAULT 'legacy-origin',
  ADD COLUMN "displayName" TEXT,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "Character" AS c SET "displayName" = u."nickname" FROM "User" AS u WHERE c."userId" = u."id";
ALTER TABLE "Character" ADD CONSTRAINT "Character_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "CharacterVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
DROP INDEX "Character_userId_key";
CREATE INDEX "Character_userId_createdAt_idx" ON "Character"("userId", "createdAt");

ALTER TABLE "User" ADD COLUMN "selectedCharacterId" TEXT;
UPDATE "User" AS u SET "selectedCharacterId" = c."id" FROM "Character" AS c WHERE c."userId" = u."id";
ALTER TABLE "User" ADD CONSTRAINT "User_selectedCharacterId_fkey" FOREIGN KEY ("selectedCharacterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TYPE "AttackType" AS ENUM ('MELEE', 'RANGED');
ALTER TABLE "WeaponMaster" ADD COLUMN "attackType" "AttackType" NOT NULL DEFAULT 'MELEE',
  ADD COLUMN "iconKey" TEXT NOT NULL DEFAULT 'WEAPON', ADD COLUMN "effect" JSONB;
-- 이름 기반 구분은 기존 데이터의 일회성 변환에서만 사용한다.
UPDATE "WeaponMaster" SET "attackType" = 'RANGED', "iconKey" = 'RIFLE' WHERE lower("name") ~ '(sniper|staff|bow|rifle|gun)';
UPDATE "WeaponMaster" SET "iconKey" = 'DAGGER' WHERE lower("name") LIKE '%dagger%';
UPDATE "WeaponMaster" SET "iconKey" = 'SWORD' WHERE lower("name") LIKE '%sword%';
UPDATE "WeaponMaster" SET "iconKey" = 'AXE' WHERE lower("name") LIKE '%giant%';
UPDATE "WeaponMaster" SET "iconKey" = 'STAFF' WHERE lower("name") LIKE '%staff%';
UPDATE "WeaponMaster" SET "iconKey" = 'HEAL', "effect" = '{"type":"HEAL","amount":50,"hpThreshold":0.5,"oncePerBattle":true}'::jsonb WHERE "name" = 'Life-saver';
INSERT INTO "WeaponMaster" ("id", "name", "damage", "staminaCost", "cooldownTicks", "castTicks", "weight", "value", "attackType", "iconKey", "description") VALUES
 ('hanlim-relief-carbine', '한림 구호용 카빈', 16, 4, 2, 0, 3, 40, 'RANGED', 'RIFLE', '한림그룹 생존 지원용 장비. 검증용 기획 초안.'),
 ('hanlim-control-baton', '한림 제식 충격봉', 6, 3, 3, 0, 2, 30, 'MELEE', 'STAFF', '제한 시설의 출입 통제용 장비. 검증용 기획 초안.');
ALTER TABLE "GhostSnapshot" ADD COLUMN "mapVersion" TEXT NOT NULL DEFAULT 'seopo-prototype-1';
ALTER TABLE "RaidSession" ADD COLUMN "mapVersion" TEXT NOT NULL DEFAULT 'seopo-prototype-1';

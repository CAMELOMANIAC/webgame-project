-- 캐릭터 수집 이전 스키마에서 만든 보존 검증용 데이터. 일회용 테스트 DB 전용.
INSERT INTO "User" ("id", "email", "nickname", "updatedAt") VALUES ('migration-user', 'migration@example.test', '동일 이름', CURRENT_TIMESTAMP);
INSERT INTO "Character" ("id", "userId", "hp", "maxHp", "stamina", "weight", "isRaiding", "currentNodeId", "time") VALUES ('migration-character', 'migration-user', 37, 150, 42, 6, true, 26, 4);
INSERT INTO "WeaponMaster" ("id", "name", "damage", "staminaCost", "cooldownTicks", "castTicks", "weight", "value") VALUES ('migration-weapon', '이전 장비', 10, 1, 1, 0, 2, 1);
INSERT INTO "CharacterWeapon" ("id", "characterId", "weaponMasterId", "slotIndex") VALUES ('migration-equipped', 'migration-character', 'migration-weapon', 0);
INSERT INTO "RaidInventoryItem" ("id", "characterId", "weaponMasterId", "quantity", "slotIndex") VALUES ('migration-bag', 'migration-character', 'migration-weapon', 2, 0);
INSERT INTO "StashItem" ("id", "userId", "weaponMasterId", "quantity") VALUES ('migration-stash', 'migration-user', 'migration-weapon', 3);

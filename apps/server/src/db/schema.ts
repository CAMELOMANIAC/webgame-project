import { randomUUID } from "node:crypto";
import { relations } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const attackTypeEnum = pgEnum("AttackType", ["MELEE", "RANGED"]);
export const raidStatusEnum = pgEnum("RaidStatus", [
  "ACTIVE",
  "EXTRACTED",
  "DEAD",
]);
export const questStatusEnum = pgEnum("QuestStatus", [
  "ACTIVE",
  "RECOVERED",
  "READY",
  "COMPLETE",
]);

export type AttackType = (typeof attackTypeEnum.enumValues)[number];
export type RaidStatus = (typeof raidStatusEnum.enumValues)[number];
export type QuestStatus = (typeof questStatusEnum.enumValues)[number];

export const users = pgTable(
  "User",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    email: text("email").notNull(),
    nickname: text("nickname").notNull(),
    createdAt: timestamp("createdAt", { precision: 3, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { precision: 3, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    selectedCharacterId: text("selectedCharacterId").references(
      (): AnyPgColumn => characters.id,
      { onDelete: "set null", onUpdate: "cascade" },
    ),
    storyTier: integer("storyTier").notNull().default(0),
  },
  (table) => [uniqueIndex("User_email_key").on(table.email)],
);

export const characterDefinitions = pgTable("CharacterDefinition", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
});

export const characterVariants = pgTable(
  "CharacterVariant",
  {
    id: text("id").primaryKey(),
    definitionId: text("definitionId")
      .notNull()
      .references(() => characterDefinitions.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    maxHp: integer("maxHp").notNull().default(100),
    maxStamina: integer("maxStamina").notNull().default(100),
    staminaRegen: integer("staminaRegen").notNull().default(10),
    maxWeight: integer("maxWeight").notNull().default(50),
  },
);

export const characters = pgTable(
  "Character",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    variantId: text("variantId")
      .notNull()
      .default("legacy-origin")
      .references(() => characterVariants.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    displayName: text("displayName"),
    createdAt: timestamp("createdAt", { precision: 3, mode: "date" })
      .notNull()
      .defaultNow(),
    hp: integer("hp").notNull().default(100),
    maxHp: integer("maxHp").notNull().default(100),
    stamina: integer("stamina").notNull().default(100),
    maxStamina: integer("maxStamina").notNull().default(100),
    staminaRegen: integer("staminaRegen").notNull().default(10),
    weight: integer("weight").notNull().default(0),
    maxWeight: integer("maxWeight").notNull().default(50),
    time: integer("time").notNull().default(0),
    isRaiding: boolean("isRaiding").notNull().default(false),
    currentNodeId: integer("currentNodeId").notNull().default(0),
    activeRaidId: text("activeRaidId").references(
      (): AnyPgColumn => raidSessions.id,
      { onDelete: "set null", onUpdate: "cascade" },
    ),
  },
  (table) => [
    uniqueIndex("Character_activeRaidId_key").on(table.activeRaidId),
    index("Character_userId_createdAt_idx").on(table.userId, table.createdAt),
  ],
);

export const weaponMasters = pgTable("WeaponMaster", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  name: text("name").notNull(),
  damage: integer("damage").notNull(),
  staminaCost: integer("staminaCost").notNull(),
  cooldownTicks: integer("cooldownTicks").notNull(),
  castTicks: integer("castTicks").notNull(),
  weight: integer("weight").notNull(),
  value: integer("value").notNull(),
  description: text("description"),
  attackType: attackTypeEnum("attackType").notNull().default("MELEE"),
  iconKey: text("iconKey").notNull().default("WEAPON"),
  effect: jsonb("effect"),
});

export const characterWeapons = pgTable(
  "CharacterWeapon",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    characterId: text("characterId")
      .notNull()
      .references(() => characters.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    weaponMasterId: text("weaponMasterId")
      .notNull()
      .references(() => weaponMasters.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    slotIndex: integer("slotIndex").notNull(),
  },
  (table) => [
    uniqueIndex("CharacterWeapon_characterId_slotIndex_key").on(
      table.characterId,
      table.slotIndex,
    ),
  ],
);

export const raidInventoryItems = pgTable(
  "RaidInventoryItem",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    characterId: text("characterId")
      .notNull()
      .references(() => characters.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    weaponMasterId: text("weaponMasterId")
      .notNull()
      .references(() => weaponMasters.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    quantity: integer("quantity").notNull().default(1),
    slotIndex: integer("slotIndex").notNull(),
  },
  (table) => [
    uniqueIndex("RaidInventoryItem_characterId_slotIndex_key").on(
      table.characterId,
      table.slotIndex,
    ),
  ],
);

export const monsterMasters = pgTable("MonsterMaster", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  name: text("name").notNull(),
  hp: integer("hp").notNull(),
  maxHp: integer("maxHp").notNull(),
  stamina: integer("stamina").notNull(),
  maxStamina: integer("maxStamina").notNull(),
  staminaRegen: integer("staminaRegen").notNull(),
  level: integer("level").notNull().default(1),
});

export const monsterWeapons = pgTable("MonsterWeapon", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  monsterId: text("monsterId")
    .notNull()
    .references(() => monsterMasters.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
  weaponMasterId: text("weaponMasterId")
    .notNull()
    .references(() => weaponMasters.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
  slotIndex: integer("slotIndex").notNull(),
});

export const stashItems = pgTable("StashItem", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: text("userId")
    .notNull()
    .references(() => users.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
  weaponMasterId: text("weaponMasterId")
    .notNull()
    .references(() => weaponMasters.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
  quantity: integer("quantity").notNull().default(1),
});

export const raidSessions = pgTable(
  "RaidSession",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    characterId: text("characterId")
      .notNull()
      .references(() => characters.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    status: raidStatusEnum("status").notNull().default("ACTIVE"),
    version: integer("version").notNull().default(0),
    currentNodeId: integer("currentNodeId").notNull().default(0),
    round: integer("round").notNull().default(0),
    // 이전 거리 기반 판정으로 저장된 탐사 데이터를 보존한다.
    encounterTravel: jsonb("encounterTravel").$type<{
      visitedEdges: string[];
      remainingDistance: number;
    }>(),
    ghostRoster: jsonb("ghostRoster").$type<{
      tracks: {
        sourceRaidId: string;
        characterId: string;
        lastRound: number;
        recordedThrough: string;
      }[];
      defeatedCharacterIds: string[];
    }>(),
    startedAt: timestamp("startedAt", { precision: 3, mode: "date" })
      .notNull()
      .defaultNow(),
    mapVersion: text("mapVersion").notNull().default("seopo-prototype-1"),
    endedAt: timestamp("endedAt", { precision: 3, mode: "date" }),
  },
  (table) => [
    index("RaidSession_characterId_startedAt_idx").on(
      table.characterId,
      table.startedAt,
    ),
  ],
);

export const raidCommands = pgTable(
  "RaidCommand",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    raidId: text("raidId")
      .notNull()
      .references(() => raidSessions.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    requestId: text("requestId").notNull(),
    kind: text("kind").notNull(),
    fingerprint: text("fingerprint").notNull(),
    response: jsonb("response").notNull(),
    createdAt: timestamp("createdAt", { precision: 3, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("RaidCommand_raidId_requestId_key").on(
      table.raidId,
      table.requestId,
    ),
  ],
);

export const ghostSnapshots = pgTable(
  "GhostSnapshot",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    nodeId: text("nodeId").notNull(),
    time: integer("time").notNull(),
    hp: integer("hp").notNull(),
    maxHp: integer("maxHp").notNull(),
    stamina: integer("stamina").notNull(),
    maxStamina: integer("maxStamina").notNull(),
    staminaRegen: integer("staminaRegen").notNull(),
    weight: integer("weight").notNull(),
    maxWeight: integer("maxWeight").notNull(),
    createdAt: timestamp("createdAt", { precision: 3, mode: "date" })
      .notNull()
      .defaultNow(),
    raidId: text("raidId").references(() => raidSessions.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    characterId: text("characterId").references(() => characters.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    round: integer("round").notNull().default(0),
    rulesVersion: integer("rulesVersion").notNull().default(0),
    mapVersion: text("mapVersion").notNull().default("seopo-prototype-1"),
    combatant: jsonb("combatant"),
    variantId: text("variantId"),
  },
  (table) => [
    uniqueIndex("GhostSnapshot_raidId_round_nodeId_key").on(
      table.raidId,
      table.round,
      table.nodeId,
    ),
    index("GhostSnapshot_nodeId_rulesVersion_round_createdAt_idx").on(
      table.nodeId,
      table.rulesVersion,
      table.round,
      table.createdAt,
    ),
    index("GhostSnapshot_round_rulesVersion_mapVersion_createdAt_idx").on(
      table.round,
      table.rulesVersion,
      table.mapVersion,
      table.createdAt,
    ),
  ],
);

export const ghostWeapons = pgTable("GhostWeapon", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  snapshotId: text("snapshotId")
    .notNull()
    .references(() => ghostSnapshots.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  weaponMasterId: text("weaponMasterId")
    .notNull()
    .references(() => weaponMasters.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
  slotIndex: integer("slotIndex").notNull(),
});

export const raidGhostEncounters = pgTable(
  "RaidGhostEncounter",
  {
    raidId: text("raidId")
      .notNull()
      .references(() => raidSessions.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    snapshotId: text("snapshotId")
      .notNull()
      .references(() => ghostSnapshots.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    createdAt: timestamp("createdAt", { precision: 3, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "RaidGhostEncounter_pkey",
      columns: [table.raidId, table.snapshotId],
    }),
  ],
);

export const questProgresses = pgTable(
  "QuestProgress",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    questId: text("questId").notNull(),
    definitionVersion: integer("definitionVersion").notNull().default(1),
    status: questStatusEnum("status").notNull().default("ACTIVE"),
    recoveredRaidId: text("recoveredRaidId").references(() => raidSessions.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    acceptedAt: timestamp("acceptedAt", { precision: 3, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { precision: 3, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    completedAt: timestamp("completedAt", { precision: 3, mode: "date" }),
  },
  (table) => [
    primaryKey({
      name: "QuestProgress_pkey",
      columns: [table.userId, table.questId],
    }),
  ],
);

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  stash: many(stashItems),
  snapshots: many(ghostSnapshots),
  characters: many(characters, { relationName: "OwnedCharacters" }),
  selectedCharacter: one(characters, {
    fields: [users.selectedCharacterId],
    references: [characters.id],
    relationName: "SelectedCharacter",
  }),
  quests: many(questProgresses),
}));

export const characterDefinitionsRelations = relations(
  characterDefinitions,
  ({ many }) => ({
    variants: many(characterVariants),
  }),
);

export const characterVariantsRelations = relations(
  characterVariants,
  ({ one, many }) => ({
    definition: one(characterDefinitions, {
      fields: [characterVariants.definitionId],
      references: [characterDefinitions.id],
    }),
    characters: many(characters),
  }),
);

export const charactersRelations = relations(characters, ({ one, many }) => ({
  user: one(users, {
    fields: [characters.userId],
    references: [users.id],
    relationName: "OwnedCharacters",
  }),
  selectedBy: many(users, { relationName: "SelectedCharacter" }),
  variant: one(characterVariants, {
    fields: [characters.variantId],
    references: [characterVariants.id],
  }),
  activeRaid: one(raidSessions, {
    fields: [characters.activeRaidId],
    references: [raidSessions.id],
    relationName: "ActiveRaid",
  }),
  raids: many(raidSessions, { relationName: "CharacterRaids" }),
  weapons: many(characterWeapons),
  inventory: many(raidInventoryItems),
  snapshots: many(ghostSnapshots),
}));

export const weaponMastersRelations = relations(weaponMasters, ({ many }) => ({
  stashItems: many(stashItems),
  ghostWeapons: many(ghostWeapons),
  charWeapons: many(characterWeapons),
  raidInventory: many(raidInventoryItems),
  monsterWeapons: many(monsterWeapons),
}));

export const characterWeaponsRelations = relations(
  characterWeapons,
  ({ one }) => ({
    character: one(characters, {
      fields: [characterWeapons.characterId],
      references: [characters.id],
    }),
    weaponMaster: one(weaponMasters, {
      fields: [characterWeapons.weaponMasterId],
      references: [weaponMasters.id],
    }),
  }),
);

export const raidInventoryItemsRelations = relations(
  raidInventoryItems,
  ({ one }) => ({
    character: one(characters, {
      fields: [raidInventoryItems.characterId],
      references: [characters.id],
    }),
    weaponMaster: one(weaponMasters, {
      fields: [raidInventoryItems.weaponMasterId],
      references: [weaponMasters.id],
    }),
  }),
);

export const monsterMastersRelations = relations(
  monsterMasters,
  ({ many }) => ({
    weapons: many(monsterWeapons),
  }),
);

export const monsterWeaponsRelations = relations(monsterWeapons, ({ one }) => ({
  monster: one(monsterMasters, {
    fields: [monsterWeapons.monsterId],
    references: [monsterMasters.id],
  }),
  weaponMaster: one(weaponMasters, {
    fields: [monsterWeapons.weaponMasterId],
    references: [weaponMasters.id],
  }),
}));

export const stashItemsRelations = relations(stashItems, ({ one }) => ({
  user: one(users, {
    fields: [stashItems.userId],
    references: [users.id],
  }),
  weaponMaster: one(weaponMasters, {
    fields: [stashItems.weaponMasterId],
    references: [weaponMasters.id],
  }),
}));

export const raidSessionsRelations = relations(
  raidSessions,
  ({ one, many }) => ({
    character: one(characters, {
      fields: [raidSessions.characterId],
      references: [characters.id],
      relationName: "CharacterRaids",
    }),
    activeCharacter: one(characters, {
      fields: [raidSessions.id],
      references: [characters.activeRaidId],
      relationName: "ActiveRaid",
    }),
    commands: many(raidCommands),
    snapshots: many(ghostSnapshots),
    ghostEncounters: many(raidGhostEncounters),
    recoveredQuests: many(questProgresses),
  }),
);

export const raidCommandsRelations = relations(raidCommands, ({ one }) => ({
  raid: one(raidSessions, {
    fields: [raidCommands.raidId],
    references: [raidSessions.id],
  }),
}));

export const ghostSnapshotsRelations = relations(
  ghostSnapshots,
  ({ one, many }) => ({
    user: one(users, {
      fields: [ghostSnapshots.userId],
      references: [users.id],
    }),
    raid: one(raidSessions, {
      fields: [ghostSnapshots.raidId],
      references: [raidSessions.id],
    }),
    character: one(characters, {
      fields: [ghostSnapshots.characterId],
      references: [characters.id],
    }),
    weapons: many(ghostWeapons),
    encounters: many(raidGhostEncounters),
  }),
);

export const ghostWeaponsRelations = relations(ghostWeapons, ({ one }) => ({
  snapshot: one(ghostSnapshots, {
    fields: [ghostWeapons.snapshotId],
    references: [ghostSnapshots.id],
  }),
  weaponMaster: one(weaponMasters, {
    fields: [ghostWeapons.weaponMasterId],
    references: [weaponMasters.id],
  }),
}));

export const raidGhostEncountersRelations = relations(
  raidGhostEncounters,
  ({ one }) => ({
    raid: one(raidSessions, {
      fields: [raidGhostEncounters.raidId],
      references: [raidSessions.id],
    }),
    snapshot: one(ghostSnapshots, {
      fields: [raidGhostEncounters.snapshotId],
      references: [ghostSnapshots.id],
    }),
  }),
);

export const questProgressesRelations = relations(
  questProgresses,
  ({ one }) => ({
    user: one(users, {
      fields: [questProgresses.userId],
      references: [users.id],
    }),
    recoveredRaid: one(raidSessions, {
      fields: [questProgresses.recoveredRaidId],
      references: [raidSessions.id],
    }),
  }),
);

// Row Types
export type User = typeof users.$inferSelect;
export type CharacterDefinition = typeof characterDefinitions.$inferSelect;
export type CharacterVariant = typeof characterVariants.$inferSelect;
export type Character = typeof characters.$inferSelect;
export type CharacterWeapon = typeof characterWeapons.$inferSelect;
export type RaidInventoryItem = typeof raidInventoryItems.$inferSelect;
export type WeaponMaster = typeof weaponMasters.$inferSelect;
export type MonsterMaster = typeof monsterMasters.$inferSelect;
export type MonsterWeapon = typeof monsterWeapons.$inferSelect;
export type StashItem = typeof stashItems.$inferSelect;
export type GhostSnapshot = typeof ghostSnapshots.$inferSelect;
export type GhostWeapon = typeof ghostWeapons.$inferSelect;
export type RaidSession = typeof raidSessions.$inferSelect;
export type RaidCommand = typeof raidCommands.$inferSelect;
export type RaidGhostEncounter = typeof raidGhostEncounters.$inferSelect;
export type QuestProgress = typeof questProgresses.$inferSelect;

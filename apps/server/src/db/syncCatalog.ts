import { ALL_CATALOG_ITEMS, CHARACTER_VARIANT_CATALOG } from "@webgame/types";
import { sql } from "drizzle-orm";
import { ensureCharacterVariantCatalog } from "../services/characters";
import { createDatabase, weaponMasters } from "./index";

const db = createDatabase();

/**
 * ALL_CATALOG_ITEMS와 CHARACTER_VARIANT_CATALOG를 비파괴적으로(upsert) 동기화합니다.
 * 기존 유저/캐릭터/인벤토리 데이터는 유지됩니다.
 */
async function main() {
  const rows: (typeof weaponMasters.$inferInsert)[] = ALL_CATALOG_ITEMS.map(
    (item) => ({
      id: item.id,
      name: item.name,
      damage: item.damage,
      staminaCost: item.staminaCost,
      cooldownTicks: item.cooldownTicks,
      castTicks: item.castTicks,
      weight: item.weight,
      value: item.value,
      description: item.description,
      attackType: item.attackType,
      iconKey: item.iconKey,
      effect: item.effect,
    }),
  );

  if (rows.length > 0) {
    await db
      .insert(weaponMasters)
      .values(rows)
      .onConflictDoUpdate({
        target: weaponMasters.id,
        set: {
          name: sql`excluded."name"`,
          damage: sql`excluded."damage"`,
          staminaCost: sql`excluded."staminaCost"`,
          cooldownTicks: sql`excluded."cooldownTicks"`,
          castTicks: sql`excluded."castTicks"`,
          weight: sql`excluded."weight"`,
          value: sql`excluded."value"`,
          description: sql`excluded."description"`,
          attackType: sql`excluded."attackType"`,
          iconKey: sql`excluded."iconKey"`,
          effect: sql`excluded."effect"`,
        },
      });
  }

  await ensureCharacterVariantCatalog(db);

  console.log(
    `Synced ${rows.length} catalog items and ${CHARACTER_VARIANT_CATALOG.length} character variants.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

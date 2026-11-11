import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
  type Character,
  characters,
  characterWeapons,
  type Database,
  raidInventoryItems,
  type StashItem,
  stashItems,
  type TransactionClient,
} from "../db";

const equipmentEntry = z.object({
  weaponMasterId: z.string().min(1),
  slotIndex: z.number().int().min(0).max(5),
});
const inventoryEntry = z.object({
  weaponMasterId: z.string().min(1),
  slotIndex: z.number().int().min(0).max(31),
  quantity: z.number().int().positive().max(2147483647).default(1),
});
const uniqueSlots = (items: { slotIndex: number }[]) =>
  new Set(items.map((item) => item.slotIndex)).size === items.length;
export const SlotsSchema = z.object({
  equipment: z
    .array(equipmentEntry)
    .max(6)
    .refine(uniqueSlots, "Duplicate equipment slot"),
  inventory: z
    .array(inventoryEntry)
    .max(32)
    .refine(uniqueSlots, "Duplicate backpack slot"),
});
export const MoveItemSchema = z.object({
  direction: z.enum(["to_backpack", "to_stash"]),
  weaponMasterId: z.string().min(1),
  slotIndex: z.number().int().min(0).max(31),
});
export const EquipItemSchema = z.object({
  slotIndex: z.number().int().min(0).max(5),
  weaponMasterId: z.string().min(1).nullable(),
});

export class InventoryError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
  ) {
    super(message);
  }
}

export type Tx = TransactionClient;
export type SlotsInput = z.infer<typeof SlotsSchema>;

export function isSerializationError(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current && typeof current === "object"; depth++) {
    const record = current as { code?: unknown; cause?: unknown };
    if (record.code === "40001" || record.code === "40P01") {
      return true;
    }
    current = record.cause;
  }
  return false;
}

// 같은 아이템을 동시에 이동해도 수량을 잃거나 복제하지 않도록 직렬화 충돌을 재시도한다.
export async function withInventoryTransaction<T>(
  database: Database,
  action: (tx: Tx) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await database.transaction(action, {
        isolationLevel: "serializable",
      });
    } catch (error) {
      if (!isSerializationError(error)) throw error;
      if (attempt === 4)
        throw new InventoryError(
          "Inventory changed concurrently; retry the request",
          409,
        );
    }
  }
  throw new InventoryError("Inventory transaction failed", 409);
}

async function getCharacter(tx: Tx, characterId: string) {
  const character = await tx.query.characters.findFirst({
    where: eq(characters.id, characterId),
  });
  if (!character) throw new InventoryError("Character not found", 404);
  return character;
}

export function countItems(
  equipment: { weaponMasterId: string }[],
  inventory: { weaponMasterId: string; quantity: number }[],
) {
  const counts = new Map<string, number>();
  for (const item of equipment)
    counts.set(item.weaponMasterId, (counts.get(item.weaponMasterId) ?? 0) + 1);
  for (const item of inventory) {
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1)
      throw new InventoryError("Invalid item quantity");
    counts.set(
      item.weaponMasterId,
      (counts.get(item.weaponMasterId) ?? 0) + item.quantity,
    );
  }
  return counts;
}

export async function calculateInventoryWeight(tx: Tx, characterId: string) {
  const equipment = await tx.query.characterWeapons.findMany({
    where: eq(characterWeapons.characterId, characterId),
    with: { weaponMaster: true },
  });
  const inventory = await tx.query.raidInventoryItems.findMany({
    where: eq(raidInventoryItems.characterId, characterId),
    with: { weaponMaster: true },
  });
  return (
    equipment.reduce((sum, item) => sum + item.weaponMaster.weight, 0) +
    inventory.reduce(
      (sum, item) => sum + item.weaponMaster.weight * item.quantity,
      0,
    )
  );
}

export async function updateInventoryWeight(
  tx: Tx,
  character: Pick<Character, "id" | "maxWeight">,
) {
  const weight = await calculateInventoryWeight(tx, character.id);
  if (weight > character.maxWeight)
    throw new InventoryError("Maximum carrying weight exceeded");
  await tx
    .update(characters)
    .set({ weight })
    .where(eq(characters.id, character.id));
  return weight;
}

export async function syncSlots(
  database: Database,
  characterId: string,
  input: SlotsInput,
) {
  return withInventoryTransaction(database, (tx) =>
    syncSlotsInTransaction(tx, characterId, input),
  );
}

export async function syncSlotsInTransaction(
  tx: Tx,
  characterId: string,
  input: SlotsInput,
) {
  const data = SlotsSchema.parse(input);
  const character = await getCharacter(tx, characterId);
  const equipment = await tx.query.characterWeapons.findMany({
    where: eq(characterWeapons.characterId, characterId),
  });
  const inventory = await tx.query.raidInventoryItems.findMany({
    where: eq(raidInventoryItems.characterId, characterId),
  });
  const actual = countItems(equipment, inventory);
  const requested = countItems(data.equipment, data.inventory);
  if (
    actual.size !== requested.size ||
    [...actual].some(([id, count]) => requested.get(id) !== count)
  ) {
    throw new InventoryError("Item quantities must be preserved");
  }
  await tx
    .delete(characterWeapons)
    .where(eq(characterWeapons.characterId, characterId));
  await tx
    .delete(raidInventoryItems)
    .where(eq(raidInventoryItems.characterId, characterId));
  if (data.equipment.length)
    await tx
      .insert(characterWeapons)
      .values(data.equipment.map((item) => ({ ...item, characterId })));
  if (data.inventory.length)
    await tx
      .insert(raidInventoryItems)
      .values(data.inventory.map((item) => ({ ...item, characterId })));
  return {
    status: "success",
    weight: await updateInventoryWeight(tx, character),
  };
}

/**
 * 캐릭터(장비·가방)와 공용 창고의 총 보유 수량 풀을 기준으로 새 로드아웃 후 창고 잔여 수량을 계산한다.
 */
export function reconcileLoadoutWithStash(
  pool: ReadonlyMap<string, number>,
  stashCounts: ReadonlyMap<string, number>,
  requestedCounts: ReadonlyMap<string, number>,
): Map<string, number> {
  for (const [weaponMasterId, requestedQty] of requestedCounts) {
    const available = pool.get(weaponMasterId) ?? 0;
    if (requestedQty > available) {
      throw new InventoryError("Insufficient items in character and stash");
    }
  }

  const nextStash = new Map<string, number>();
  for (const [weaponMasterId, totalQty] of pool) {
    const requestedQty = requestedCounts.get(weaponMasterId) ?? 0;
    const nextQty = totalQty - requestedQty;
    const prevQty = stashCounts.get(weaponMasterId) ?? 0;
    if (nextQty !== prevQty) {
      nextStash.set(weaponMasterId, nextQty);
    }
  }
  return nextStash;
}

/**
 * 배치 시작 시점에 캐릭터 장비·가방과 유저 공용 창고 수량을 단일 트랜잭션으로 정산·반영한다.
 */
export async function syncLoadoutWithStashInTransaction(
  tx: Tx,
  userId: string,
  characterId: string,
  input: SlotsInput,
) {
  const data = SlotsSchema.parse(input);
  const character = await getCharacter(tx, characterId);
  if (character.userId !== userId) {
    throw new InventoryError("User does not own this character", 403);
  }

  const [stash, equipment, inventory] = await Promise.all([
    tx.query.stashItems.findMany({
      where: eq(stashItems.userId, userId),
      orderBy: [asc(stashItems.id)],
    }),
    tx.query.characterWeapons.findMany({
      where: eq(characterWeapons.characterId, characterId),
    }),
    tx.query.raidInventoryItems.findMany({
      where: eq(raidInventoryItems.characterId, characterId),
    }),
  ]);

  const stashRowsByWeapon = new Map<string, StashItem[]>();
  for (const row of stash) {
    const list = stashRowsByWeapon.get(row.weaponMasterId);
    if (list) list.push(row);
    else stashRowsByWeapon.set(row.weaponMasterId, [row]);
  }

  const stashCounts = countItems([], stash);
  const charCounts = countItems(equipment, inventory);
  const pool = new Map<string, number>();
  for (const [id, qty] of stashCounts) pool.set(id, (pool.get(id) ?? 0) + qty);
  for (const [id, qty] of charCounts) pool.set(id, (pool.get(id) ?? 0) + qty);

  const requestedCounts = countItems(data.equipment, data.inventory);
  const changedStashQuantities = reconcileLoadoutWithStash(
    pool,
    stashCounts,
    requestedCounts,
  );

  await tx
    .delete(characterWeapons)
    .where(eq(characterWeapons.characterId, characterId));
  await tx
    .delete(raidInventoryItems)
    .where(eq(raidInventoryItems.characterId, characterId));

  if (data.equipment.length > 0) {
    await tx
      .insert(characterWeapons)
      .values(data.equipment.map((item) => ({ ...item, characterId })));
  }
  if (data.inventory.length > 0) {
    await tx
      .insert(raidInventoryItems)
      .values(data.inventory.map((item) => ({ ...item, characterId })));
  }

  for (const [weaponMasterId, nextQty] of changedStashQuantities) {
    await writeStashQuantity(
      tx,
      userId,
      weaponMasterId,
      stashRowsByWeapon.get(weaponMasterId) ?? [],
      nextQty,
    );
  }

  return {
    status: "success",
    weight: await updateInventoryWeight(tx, character),
  };
}

async function writeStashQuantity(
  tx: Tx,
  userId: string,
  weaponMasterId: string,
  rows: StashItem[],
  quantity: number,
) {
  if (
    !Number.isSafeInteger(quantity) ||
    quantity < 0 ||
    quantity > 2147483647
  ) {
    throw new InventoryError("Invalid stash quantity");
  }
  const first = rows[0];
  if (quantity === 0) {
    await tx
      .delete(stashItems)
      .where(
        and(
          eq(stashItems.userId, userId),
          eq(stashItems.weaponMasterId, weaponMasterId),
        ),
      );
  } else if (first) {
    await tx
      .update(stashItems)
      .set({ quantity })
      .where(eq(stashItems.id, first.id));
    const duplicateIds = rows.slice(1).map((row) => row.id);
    if (duplicateIds.length > 0) {
      await tx
        .delete(stashItems)
        .where(inArray(stashItems.id, duplicateIds));
    }
  } else {
    await tx.insert(stashItems).values({ userId, weaponMasterId, quantity });
  }
}

export async function mergeIntoStash(
  tx: Tx,
  userId: string,
  weaponMasterId: string,
  quantity: number,
) {
  const rows = await tx.query.stashItems.findMany({
    where: and(
      eq(stashItems.userId, userId),
      eq(stashItems.weaponMasterId, weaponMasterId),
    ),
    orderBy: [asc(stashItems.id)],
  });
  const existing = countItems([], rows).get(weaponMasterId) ?? 0;
  await writeStashQuantity(
    tx,
    userId,
    weaponMasterId,
    rows,
    existing + quantity,
  );
}

export async function moveStashItem(
  database: Database,
  characterId: string,
  input: z.infer<typeof MoveItemSchema>,
) {
  const { direction, weaponMasterId, slotIndex } = MoveItemSchema.parse(input);
  return withInventoryTransaction(database, async (tx) => {
    const character = await getCharacter(tx, characterId);
    const raidingChars = await tx.query.characters.findMany({
      where: and(
        eq(characters.userId, character.userId),
        eq(characters.isRaiding, true),
      ),
      columns: { id: true },
    });
    if (character.isRaiding || raidingChars.length > 0)
      throw new InventoryError("Stash is unavailable during a raid", 409);
    const stash = await tx.query.stashItems.findMany({
      where: and(
        eq(stashItems.userId, character.userId),
        eq(stashItems.weaponMasterId, weaponMasterId),
      ),
      orderBy: [asc(stashItems.id)],
    });
    const stashQuantity = countItems([], stash).get(weaponMasterId) ?? 0;
    const item = await tx.query.raidInventoryItems.findFirst({
      where: and(
        eq(raidInventoryItems.characterId, characterId),
        eq(raidInventoryItems.slotIndex, slotIndex),
      ),
    });
    if (direction === "to_backpack") {
      if (stashQuantity < 1)
        throw new InventoryError("Item not found in stash");
      if (item) throw new InventoryError("Backpack slot already occupied");
      await writeStashQuantity(
        tx,
        character.userId,
        weaponMasterId,
        stash,
        stashQuantity - 1,
      );
      await tx.insert(raidInventoryItems).values({
        characterId,
        weaponMasterId,
        slotIndex,
        quantity: 1,
      });
    } else {
      if (!item || item.weaponMasterId !== weaponMasterId)
        throw new InventoryError("Item not found in specified backpack slot");
      countItems([], [item]);
      await tx
        .delete(raidInventoryItems)
        .where(eq(raidInventoryItems.id, item.id));
      await writeStashQuantity(
        tx,
        character.userId,
        weaponMasterId,
        stash,
        stashQuantity + item.quantity,
      );
    }
    return {
      status: "success",
      weight: await updateInventoryWeight(tx, character),
    };
  });
}

async function putInBackpack(
  tx: Tx,
  characterId: string,
  weaponMasterId: string,
) {
  const items = await tx.query.raidInventoryItems.findMany({
    where: eq(raidInventoryItems.characterId, characterId),
    orderBy: [asc(raidInventoryItems.slotIndex)],
  });
  const stack = items.find((item) => item.weaponMasterId === weaponMasterId);
  if (stack) {
    await tx
      .update(raidInventoryItems)
      .set({ quantity: sql`${raidInventoryItems.quantity} + 1` })
      .where(eq(raidInventoryItems.id, stack.id));
    return;
  }
  const occupied = new Set(items.map((item) => item.slotIndex));
  const slotIndex = Array.from({ length: 32 }, (_, index) => index).find(
    (index) => !occupied.has(index),
  );
  if (slotIndex === undefined) throw new InventoryError("Backpack is full");
  await tx.insert(raidInventoryItems).values({
    characterId,
    weaponMasterId,
    slotIndex,
    quantity: 1,
  });
}

export async function equipItem(
  database: Database,
  characterId: string,
  input: z.infer<typeof EquipItemSchema>,
) {
  const { slotIndex, weaponMasterId } = EquipItemSchema.parse(input);
  return withInventoryTransaction(database, async (tx) => {
    const character = await getCharacter(tx, characterId);
    const equipped = await tx.query.characterWeapons.findFirst({
      where: and(
        eq(characterWeapons.characterId, characterId),
        eq(characterWeapons.slotIndex, slotIndex),
      ),
    });
    if (equipped?.weaponMasterId !== weaponMasterId) {
      if (weaponMasterId !== null) {
        const source = await tx.query.raidInventoryItems.findFirst({
          where: and(
            eq(raidInventoryItems.characterId, characterId),
            eq(raidInventoryItems.weaponMasterId, weaponMasterId),
          ),
          orderBy: [asc(raidInventoryItems.slotIndex)],
        });
        if (!source) throw new InventoryError("Item not in inventory");
        countItems([], [source]);
        if (source.quantity > 1)
          await tx
            .update(raidInventoryItems)
            .set({ quantity: sql`${raidInventoryItems.quantity} - 1` })
            .where(eq(raidInventoryItems.id, source.id));
        else
          await tx
            .delete(raidInventoryItems)
            .where(eq(raidInventoryItems.id, source.id));
      }
      if (equipped) {
        await tx
          .delete(characterWeapons)
          .where(eq(characterWeapons.id, equipped.id));
        await putInBackpack(tx, characterId, equipped.weaponMasterId);
      }
      if (weaponMasterId !== null)
        await tx
          .insert(characterWeapons)
          .values({ characterId, weaponMasterId, slotIndex });
    }
    return {
      status: "success",
      weight: await updateInventoryWeight(tx, character),
    };
  });
}

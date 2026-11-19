import {
  AUCTION_DURATION_MS,
  getCatalogItemById,
  getItemKind,
  type CancelMarketListingResponse,
  type CreateMarketListingInput,
  type CreateMarketListingResponse,
  type InstantSellInput,
  type InstantSellResponse,
  type MarketAuctionListing,
  type MarketStashEntry,
  type MarketStateResponse,
  NPC_BASE_SUPPLY_ITEM_IDS,
  type PlaceMarketBidInput,
  type PlaceMarketBidResponse,
  resolveMinNextBid,
  resolveNpcAutoBuyMaxUnitPrice,
  resolveNpcInstantSellPrice,
  resolveNpcSupplyUnitPrice,
  resolveNpcUndercutTriggerUnitPrice,
  resolveNpcUndercutUnitPrice,
  type WeaponEffect,
} from "@webgame/types";
import { and, asc, desc, eq, gt, inArray, lte, or, sql } from "drizzle-orm";
import { z } from "zod";
import {
  characters,
  type Database,
  marketListings,
  stashItems,
  type TransactionClient,
  users,
  weaponMasters,
} from "../db";
import {
  InventoryError,
  mergeIntoStash,
  withInventoryTransaction,
} from "./inventory";

export const CreateMarketListingSchema = z.object({
  weaponMasterId: z.string().min(1),
  quantity: z.number().int().positive().max(999),
  startingBid: z.number().int().positive().max(1_000_000_000),
});

export const PlaceMarketBidSchema = z.object({
  amount: z.number().int().positive().max(1_000_000_000),
});

export const InstantSellSchema = z.object({
  weaponMasterId: z.string().min(1),
  quantity: z.number().int().positive().max(999),
});

async function lockUserCredits(
  tx: TransactionClient,
  userId: string,
): Promise<{ id: string; credits: number }> {
  const result = await tx.execute(
    sql`SELECT "id", "credits" FROM "User" WHERE "id" = ${userId} FOR UPDATE`,
  );
  const rows = Array.isArray(result)
    ? result
    : ((result as { rows?: unknown[] }).rows ?? []);
  const row = rows[0] as { id?: unknown; credits?: unknown } | undefined;
  if (!row || typeof row.id !== "string") {
    throw new InventoryError("User not found", 404);
  }
  const credits = Number(row.credits ?? 0);
  return {
    id: row.id,
    credits: Number.isFinite(credits) ? Math.max(0, Math.floor(credits)) : 0,
  };
}

async function lockUsersInOrder(
  tx: TransactionClient,
  userIds: string[],
): Promise<Map<string, number>> {
  const uniqueSorted = [...new Set(userIds)].sort();
  const map = new Map<string, number>();
  for (const id of uniqueSorted) {
    const locked = await lockUserCredits(tx, id);
    map.set(locked.id, locked.credits);
  }
  return map;
}

async function assertUserNotRaiding(tx: TransactionClient, userId: string) {
  const raidingChars = await tx.query.characters.findMany({
    where: and(eq(characters.userId, userId), eq(characters.isRaiding, true)),
    columns: { id: true },
  });
  if (raidingChars.length > 0) {
    throw new InventoryError(
      "탐사 진행 중에는 거점 거래소를 이용할 수 없습니다.",
      409,
    );
  }
}

async function ensureCatalogItemsInMarketTx(
  tx: TransactionClient,
  itemIds: string[],
) {
  const uniqueIds = [...new Set(itemIds)];
  const rows = uniqueIds
    .map((id) => getCatalogItemById(id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .map((item) => ({
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
    }));
  if (rows.length > 0) {
    await tx
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
}

interface RawListingRow {
  id: string;
  sellerUserId: string | null;
  isNpcSeller: boolean;
  weaponMasterId: string;
  quantity: number;
  startingBid: number;
  currentBid: number | null;
  highestBidderUserId: string | null;
  bidCount: number;
  status: "ACTIVE" | "SOLD" | "EXPIRED" | "CANCELLED";
  settledByNpc: boolean;
  endsAt: Date;
  createdAt: Date;
  seller?: { nickname: string } | null;
  weaponMaster: {
    id: string;
    name: string;
    description: string | null;
    weight: number;
    value: number;
    iconKey: string;
    attackType: "MELEE" | "RANGED";
    damage: number;
    effect: unknown;
  };
}

function toAuctionListingView(
  row: RawListingRow,
  viewerUserId: string,
): MarketAuctionListing {
  const catalog = getCatalogItemById(row.weaponMasterId);
  const effect = (row.weaponMaster.effect ?? null) as WeaponEffect | null;
  const itemKind = catalog
    ? getItemKind({ effect: catalog.effect })
    : getItemKind({ effect: effect ?? undefined });
  const value = catalog?.value ?? row.weaponMaster.value;
  const autoBuyMaxTotal = resolveNpcAutoBuyMaxUnitPrice(value) * row.quantity;

  return {
    id: row.id,
    weaponMasterId: row.weaponMasterId,
    name: catalog?.name ?? row.weaponMaster.name,
    description: catalog?.description ?? row.weaponMaster.description ?? "",
    weight: catalog?.weight ?? row.weaponMaster.weight,
    value,
    iconKey: catalog?.iconKey ?? row.weaponMaster.iconKey,
    itemKind,
    attackType: catalog?.attackType ?? row.weaponMaster.attackType,
    damage: catalog?.damage ?? row.weaponMaster.damage,
    tags: catalog ? [...catalog.tags] : [...(effect?.tags ?? [])],
    quantity: row.quantity,
    startingBid: row.startingBid,
    currentBid: row.currentBid,
    minNextBid: resolveMinNextBid(row.startingBid, row.currentBid),
    bidCount: row.bidCount,
    isNpcSeller: row.isNpcSeller,
    sellerLabel: row.isNpcSeller
      ? "최 사장"
      : (row.seller?.nickname ?? "익명 생존자"),
    isMine: !row.isNpcSeller && row.sellerUserId === viewerUserId,
    isHighestBidder: row.highestBidderUserId === viewerUserId,
    npcAutoBuyEligible: !row.isNpcSeller && row.startingBid <= autoBuyMaxTotal,
    status: row.status,
    settledByNpc: row.settledByNpc,
    endsAt: row.endsAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * 마감 시각이 지난 활성 경매를 일괄 정산합니다.
 * - 최고 입찰자 존재: 낙찰자 창고 지급 + 판매자(유저) 크레딧 정산
 * - 무입찰 + 유저 매물 + 시작가 <= 기준가: NPC 유동성 공급자 자동 매입
 * - 무입찰 + 고가 유저 매물: 유찰 후 판매자 창고 반환
 * - 무입찰 + NPC 매물: 만료 처리
 */
export async function settleExpiredAuctions(
  database: Database,
  now = new Date(),
): Promise<number> {
  const expired = await database.query.marketListings.findMany({
    where: and(
      eq(marketListings.status, "ACTIVE"),
      lte(marketListings.endsAt, now),
    ),
    columns: { id: true },
    limit: 50,
  });

  if (expired.length === 0) return 0;

  let settledCount = 0;
  for (const entry of expired) {
    await withInventoryTransaction(database, async (tx) => {
      const lockResult = await tx.execute(
        sql`SELECT "id" FROM "MarketListing" WHERE "id" = ${entry.id} AND "status" = 'ACTIVE' FOR UPDATE`,
      );
      const lockedRows = Array.isArray(lockResult)
        ? lockResult
        : ((lockResult as { rows?: unknown[] }).rows ?? []);
      if (lockedRows.length === 0) return;

      const listing = await tx.query.marketListings.findFirst({
        where: eq(marketListings.id, entry.id),
        with: { weaponMaster: true },
      });
      if (!listing || listing.status !== "ACTIVE" || listing.endsAt > now) {
        return;
      }

      const catalog = getCatalogItemById(listing.weaponMasterId);
      const itemValue = catalog?.value ?? listing.weaponMaster.value;

      if (listing.highestBidderUserId && listing.currentBid !== null) {
        await mergeIntoStash(
          tx,
          listing.highestBidderUserId,
          listing.weaponMasterId,
          listing.quantity,
        );
        if (!listing.isNpcSeller && listing.sellerUserId) {
          const seller = await lockUserCredits(tx, listing.sellerUserId);
          await tx
            .update(users)
            .set({ credits: seller.credits + listing.currentBid })
            .where(eq(users.id, listing.sellerUserId));
        }
        await tx
          .update(marketListings)
          .set({ status: "SOLD", settledByNpc: false })
          .where(eq(marketListings.id, listing.id));
        settledCount += 1;
        return;
      }

      if (!listing.isNpcSeller && listing.sellerUserId) {
        const autoBuyThreshold =
          resolveNpcAutoBuyMaxUnitPrice(itemValue) * listing.quantity;
        if (listing.startingBid <= autoBuyThreshold) {
          const seller = await lockUserCredits(tx, listing.sellerUserId);
          await tx
            .update(users)
            .set({ credits: seller.credits + listing.startingBid })
            .where(eq(users.id, listing.sellerUserId));
          await tx
            .update(marketListings)
            .set({
              status: "SOLD",
              currentBid: listing.startingBid,
              settledByNpc: true,
            })
            .where(eq(marketListings.id, listing.id));
        } else {
          await mergeIntoStash(
            tx,
            listing.sellerUserId,
            listing.weaponMasterId,
            listing.quantity,
          );
          await tx
            .update(marketListings)
            .set({ status: "EXPIRED", settledByNpc: false })
            .where(eq(marketListings.id, listing.id));
        }
        settledCount += 1;
        return;
      }

      await tx
        .update(marketListings)
        .set({ status: "EXPIRED", settledByNpc: false })
        .where(eq(marketListings.id, listing.id));
      settledCount += 1;
    });
  }

  return settledCount;
}

/**
 * 기초 보급품 11종이 거래소에 항상 최소 1건씩 NPC 경매 매물로 유지되도록 보충합니다.
 */
export async function ensureNpcBaseSupplyListings(
  database: Database,
  now = new Date(),
): Promise<number> {
  const baseIds = [...NPC_BASE_SUPPLY_ITEM_IDS];
  const existing = await database.query.marketListings.findMany({
    where: and(
      eq(marketListings.status, "ACTIVE"),
      eq(marketListings.isNpcSeller, true),
      gt(marketListings.endsAt, now),
      inArray(marketListings.weaponMasterId, baseIds),
    ),
    columns: { weaponMasterId: true },
  });
  const presentIds = new Set(existing.map((row) => row.weaponMasterId));
  const missingIds = baseIds.filter((id) => !presentIds.has(id));
  if (missingIds.length === 0) return 0;

  return withInventoryTransaction(database, async (tx) => {
    const recheck = await tx.query.marketListings.findMany({
      where: and(
        eq(marketListings.status, "ACTIVE"),
        eq(marketListings.isNpcSeller, true),
        gt(marketListings.endsAt, now),
        inArray(marketListings.weaponMasterId, missingIds),
      ),
      columns: { weaponMasterId: true },
    });
    const stillPresent = new Set(recheck.map((row) => row.weaponMasterId));
    const toCreate = missingIds.filter((id) => !stillPresent.has(id));
    if (toCreate.length === 0) return 0;

    await ensureCatalogItemsInMarketTx(tx, toCreate);

    const endsAt = new Date(now.getTime() + AUCTION_DURATION_MS);
    const values = toCreate
      .map((id) => getCatalogItemById(id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .map((item) => ({
        sellerUserId: null,
        isNpcSeller: true,
        weaponMasterId: item.id,
        quantity: 1,
        startingBid: resolveNpcSupplyUnitPrice(item.value),
        currentBid: null,
        highestBidderUserId: null,
        bidCount: 0,
        status: "ACTIVE" as const,
        settledByNpc: false,
        endsAt,
      }));

    if (values.length > 0) {
      await tx.insert(marketListings).values(values);
    }
    return values.length;
  });
}

export async function getMarketState(
  database: Database,
  userId: string,
): Promise<MarketStateResponse> {
  const now = new Date();
  await settleExpiredAuctions(database, now);
  await ensureNpcBaseSupplyListings(database, now);

  const user = await database.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, credits: true },
  });
  if (!user) {
    throw new InventoryError("User not found", 404);
  }

  const activeRows = await database.query.marketListings.findMany({
    where: eq(marketListings.status, "ACTIVE"),
    with: {
      weaponMaster: true,
      seller: { columns: { nickname: true } },
    },
    orderBy: [asc(marketListings.endsAt), desc(marketListings.createdAt)],
    limit: 120,
  });

  const myRows = await database.query.marketListings.findMany({
    where: or(
      eq(marketListings.sellerUserId, userId),
      eq(marketListings.highestBidderUserId, userId),
    ),
    with: {
      weaponMaster: true,
      seller: { columns: { nickname: true } },
    },
    orderBy: [desc(marketListings.updatedAt)],
    limit: 30,
  });

  const stashRows = await database.query.stashItems.findMany({
    where: eq(stashItems.userId, userId),
    with: { weaponMaster: true },
    orderBy: [asc(stashItems.id)],
  });

  const stashMap = new Map<string, MarketStashEntry>();
  for (const row of stashRows) {
    if (row.quantity <= 0) continue;
    const existing = stashMap.get(row.weaponMasterId);
    if (existing) {
      existing.quantity += row.quantity;
      continue;
    }
    const catalog = getCatalogItemById(row.weaponMasterId);
    const effect = (row.weaponMaster.effect ?? null) as WeaponEffect | null;
    const itemKind = catalog
      ? getItemKind({ effect: catalog.effect })
      : getItemKind({ effect: effect ?? undefined });
    const value = catalog?.value ?? row.weaponMaster.value;
    stashMap.set(row.weaponMasterId, {
      weaponMasterId: row.weaponMasterId,
      name: catalog?.name ?? row.weaponMaster.name,
      description: catalog?.description ?? row.weaponMaster.description ?? "",
      quantity: row.quantity,
      weight: catalog?.weight ?? row.weaponMaster.weight,
      value,
      instantSellPrice: resolveNpcInstantSellPrice(value),
      npcAutoBuyUnitPrice: resolveNpcAutoBuyMaxUnitPrice(value),
      iconKey: catalog?.iconKey ?? row.weaponMaster.iconKey,
      itemKind,
      tags: catalog ? [...catalog.tags] : [...(effect?.tags ?? [])],
    });
  }

  return {
    credits: user.credits,
    serverTime: now.toISOString(),
    listings: activeRows.map((row) => toAuctionListingView(row, userId)),
    myListings: myRows.map((row) => toAuctionListingView(row, userId)),
    stash: [...stashMap.values()].sort((a, b) =>
      a.name.localeCompare(b.name, "ko"),
    ),
  };
}

export async function createMarketListing(
  database: Database,
  userId: string,
  input: CreateMarketListingInput,
): Promise<CreateMarketListingResponse> {
  const parsed = CreateMarketListingSchema.parse(input);
  const now = new Date();
  await settleExpiredAuctions(database, now);

  return withInventoryTransaction(database, async (tx) => {
    await lockUserCredits(tx, userId);
    await assertUserNotRaiding(tx, userId);

    const rows = await tx.query.stashItems.findMany({
      where: and(
        eq(stashItems.userId, userId),
        eq(stashItems.weaponMasterId, parsed.weaponMasterId),
      ),
      with: { weaponMaster: true },
      orderBy: [asc(stashItems.id)],
    });

    const ownedQuantity = rows.reduce((sum, row) => sum + row.quantity, 0);
    if (rows.length === 0 || ownedQuantity < parsed.quantity) {
      throw new InventoryError("창고에 경매 등록할 수량이 부족합니다.", 400);
    }

    const firstRow = rows[0]!;
    const remaining = ownedQuantity - parsed.quantity;
    if (remaining === 0) {
      await tx
        .delete(stashItems)
        .where(
          and(
            eq(stashItems.userId, userId),
            eq(stashItems.weaponMasterId, parsed.weaponMasterId),
          ),
        );
    } else {
      await tx
        .update(stashItems)
        .set({ quantity: remaining })
        .where(eq(stashItems.id, firstRow.id));
      const duplicateIds = rows.slice(1).map((row) => row.id);
      if (duplicateIds.length > 0) {
        await tx
          .delete(stashItems)
          .where(inArray(stashItems.id, duplicateIds));
      }
    }

    const endsAt = new Date(now.getTime() + AUCTION_DURATION_MS);
    const [inserted] = await tx
      .insert(marketListings)
      .values({
        sellerUserId: userId,
        isNpcSeller: false,
        weaponMasterId: parsed.weaponMasterId,
        quantity: parsed.quantity,
        startingBid: parsed.startingBid,
        currentBid: null,
        highestBidderUserId: null,
        bidCount: 0,
        status: "ACTIVE",
        settledByNpc: false,
        endsAt,
      })
      .returning();

    if (!inserted) {
      throw new InventoryError("경매 매물 등록에 실패했습니다.", 500);
    }

    // 비싼 유저 매물 감지 시 NPC 유동성 공급자가 소폭 저렴한 경쟁 매물 출품
    const catalog = getCatalogItemById(parsed.weaponMasterId);
    const itemValue = catalog?.value ?? firstRow.weaponMaster.value;
    const userUnitPrice = Math.ceil(parsed.startingBid / parsed.quantity);
    let npcUndercutSpawned = false;

    if (userUnitPrice > resolveNpcUndercutTriggerUnitPrice(itemValue)) {
      const existingNpcListing = await tx.query.marketListings.findFirst({
        where: and(
          eq(marketListings.status, "ACTIVE"),
          eq(marketListings.isNpcSeller, true),
          eq(marketListings.weaponMasterId, parsed.weaponMasterId),
          gt(marketListings.endsAt, now),
        ),
        columns: { id: true },
      });

      if (!existingNpcListing) {
        const npcPrice = resolveNpcUndercutUnitPrice(itemValue, userUnitPrice);
        await tx.insert(marketListings).values({
          sellerUserId: null,
          isNpcSeller: true,
          weaponMasterId: parsed.weaponMasterId,
          quantity: 1,
          startingBid: npcPrice,
          currentBid: null,
          highestBidderUserId: null,
          bidCount: 0,
          status: "ACTIVE",
          settledByNpc: false,
          endsAt,
        });
        npcUndercutSpawned = true;
      }
    }

    const createdRow = await tx.query.marketListings.findFirst({
      where: eq(marketListings.id, inserted.id),
      with: {
        weaponMaster: true,
        seller: { columns: { nickname: true } },
      },
    });
    if (!createdRow) {
      throw new InventoryError("등록된 경매 정보를 불러오지 못했습니다.", 500);
    }

    return {
      status: "success",
      listing: toAuctionListingView(createdRow, userId),
      npcUndercutSpawned,
    };
  });
}

export async function placeMarketBid(
  database: Database,
  userId: string,
  listingId: string,
  input: PlaceMarketBidInput,
): Promise<PlaceMarketBidResponse> {
  const parsed = PlaceMarketBidSchema.parse(input);
  const now = new Date();
  await settleExpiredAuctions(database, now);

  return withInventoryTransaction(database, async (tx) => {
    const lockResult = await tx.execute(
      sql`SELECT "id" FROM "MarketListing" WHERE "id" = ${listingId} FOR UPDATE`,
    );
    const lockedRows = Array.isArray(lockResult)
      ? lockResult
      : ((lockResult as { rows?: unknown[] }).rows ?? []);
    if (lockedRows.length === 0) {
      throw new InventoryError("경매 매물을 찾을 수 없습니다.", 404);
    }

    const listing = await tx.query.marketListings.findFirst({
      where: eq(marketListings.id, listingId),
      with: {
        weaponMaster: true,
        seller: { columns: { nickname: true } },
      },
    });
    if (!listing) {
      throw new InventoryError("경매 매물을 찾을 수 없습니다.", 404);
    }
    if (listing.status !== "ACTIVE" || listing.endsAt <= now) {
      throw new InventoryError("이미 마감된 경매입니다.", 409);
    }
    if (!listing.isNpcSeller && listing.sellerUserId === userId) {
      throw new InventoryError("자신이 등록한 매물에는 입찰할 수 없습니다.", 400);
    }
    if (listing.highestBidderUserId === userId) {
      throw new InventoryError("이미 현재 최고 입찰자입니다.", 409);
    }

    const minNextBid = resolveMinNextBid(listing.startingBid, listing.currentBid);
    if (parsed.amount < minNextBid) {
      throw new InventoryError(
        `최소 입찰가는 ${minNextBid.toLocaleString()} CR 이상이어야 합니다.`,
        400,
      );
    }

    const usersToLock = [userId];
    if (listing.highestBidderUserId) {
      usersToLock.push(listing.highestBidderUserId);
    }
    const lockedCredits = await lockUsersInOrder(tx, usersToLock);
    await assertUserNotRaiding(tx, userId);

    const bidderCredits = lockedCredits.get(userId) ?? 0;
    if (bidderCredits < parsed.amount) {
      throw new InventoryError(
        `크레딧이 부족합니다. (필요: ${parsed.amount.toLocaleString()} CR / 보유: ${bidderCredits.toLocaleString()} CR)`,
        400,
      );
    }

    const nextBidderCredits = bidderCredits - parsed.amount;
    await tx
      .update(users)
      .set({ credits: nextBidderCredits })
      .where(eq(users.id, userId));

    if (listing.highestBidderUserId && listing.currentBid !== null) {
      const prevCredits = lockedCredits.get(listing.highestBidderUserId) ?? 0;
      await tx
        .update(users)
        .set({ credits: prevCredits + listing.currentBid })
        .where(eq(users.id, listing.highestBidderUserId));
    }

    const nextBidCount = listing.bidCount + 1;
    await tx
      .update(marketListings)
      .set({
        currentBid: parsed.amount,
        highestBidderUserId: userId,
        bidCount: nextBidCount,
      })
      .where(eq(marketListings.id, listing.id));

    return {
      status: "success",
      credits: nextBidderCredits,
      listing: toAuctionListingView(
        {
          ...listing,
          currentBid: parsed.amount,
          highestBidderUserId: userId,
          bidCount: nextBidCount,
        },
        userId,
      ),
    };
  });
}

export async function cancelMarketListing(
  database: Database,
  userId: string,
  listingId: string,
): Promise<CancelMarketListingResponse> {
  const now = new Date();
  await settleExpiredAuctions(database, now);

  return withInventoryTransaction(database, async (tx) => {
    const lockResult = await tx.execute(
      sql`SELECT "id" FROM "MarketListing" WHERE "id" = ${listingId} FOR UPDATE`,
    );
    const lockedRows = Array.isArray(lockResult)
      ? lockResult
      : ((lockResult as { rows?: unknown[] }).rows ?? []);
    if (lockedRows.length === 0) {
      throw new InventoryError("경매 매물을 찾을 수 없습니다.", 404);
    }

    const listing = await tx.query.marketListings.findFirst({
      where: eq(marketListings.id, listingId),
    });
    if (!listing) {
      throw new InventoryError("경매 매물을 찾을 수 없습니다.", 404);
    }
    if (listing.isNpcSeller || listing.sellerUserId !== userId) {
      throw new InventoryError("본인이 등록한 경매만 취소할 수 있습니다.", 403);
    }
    if (listing.status !== "ACTIVE") {
      throw new InventoryError("이미 종료된 경매입니다.", 409);
    }
    if (listing.bidCount > 0 || listing.highestBidderUserId !== null) {
      throw new InventoryError("입찰이 진행된 경매는 취소할 수 없습니다.", 409);
    }

    await assertUserNotRaiding(tx, userId);

    await tx
      .update(marketListings)
      .set({ status: "CANCELLED" })
      .where(eq(marketListings.id, listing.id));

    await mergeIntoStash(tx, userId, listing.weaponMasterId, listing.quantity);

    return {
      status: "success",
      listingId: listing.id,
    };
  });
}

export async function instantSellMarketItem(
  database: Database,
  userId: string,
  input: InstantSellInput,
): Promise<InstantSellResponse> {
  const parsed = InstantSellSchema.parse(input);
  return withInventoryTransaction(database, async (tx) => {
    const user = await lockUserCredits(tx, userId);
    await assertUserNotRaiding(tx, userId);

    const rows = await tx.query.stashItems.findMany({
      where: and(
        eq(stashItems.userId, userId),
        eq(stashItems.weaponMasterId, parsed.weaponMasterId),
      ),
      with: { weaponMaster: true },
      orderBy: [asc(stashItems.id)],
    });

    const ownedQuantity = rows.reduce((sum, row) => sum + row.quantity, 0);
    if (rows.length === 0 || ownedQuantity < parsed.quantity) {
      throw new InventoryError("창고에 매각할 수량이 부족합니다.", 400);
    }

    const firstRow = rows[0]!;
    const catalogItem = getCatalogItemById(parsed.weaponMasterId);
    const value = catalogItem?.value ?? firstRow.weaponMaster.value;
    const itemName = catalogItem?.name ?? firstRow.weaponMaster.name;
    const unitPrice = resolveNpcInstantSellPrice(value);
    const totalPrice = unitPrice * parsed.quantity;

    const remaining = ownedQuantity - parsed.quantity;
    if (remaining === 0) {
      await tx
        .delete(stashItems)
        .where(
          and(
            eq(stashItems.userId, userId),
            eq(stashItems.weaponMasterId, parsed.weaponMasterId),
          ),
        );
    } else {
      await tx
        .update(stashItems)
        .set({ quantity: remaining })
        .where(eq(stashItems.id, firstRow.id));
      const duplicateIds = rows.slice(1).map((row) => row.id);
      if (duplicateIds.length > 0) {
        await tx
          .delete(stashItems)
          .where(inArray(stashItems.id, duplicateIds));
      }
    }

    const nextCredits = user.credits + totalPrice;
    await tx
      .update(users)
      .set({ credits: nextCredits })
      .where(eq(users.id, userId));

    return {
      status: "success",
      credits: nextCredits,
      soldItem: {
        weaponMasterId: parsed.weaponMasterId,
        name: itemName,
        quantity: parsed.quantity,
        unitPrice,
        totalPrice,
      },
    };
  });
}

import type { ItemKind, WeaponTag } from "./index";

export const AUCTION_DURATION_MS = 5 * 60 * 1000;
export const NPC_INSTANT_SELL_RATE = 0.85;
export const NPC_SUPPLY_MARKUP = 1.25;
export const NPC_UNDERCUT_TRIGGER_MULTIPLIER = 1.5;
export const NPC_UNDERCUT_DISCOUNT_RATE = 0.9;

/** 거래소에 항상 최소 1건씩 NPC 유동성 공급자 매물로 유지되는 기초 보급품 */
export const NPC_BASE_SUPPLY_ITEM_IDS = [
  "wpn_dagger",
  "hanlim-control-baton",
  "hanlim-relief-carbine",
  "med-bandage",
  "med-tourniquet",
  "food-energy-bar",
  "food-ion-drink",
  "mat-tape",
  "mat-wire",
  "mat-lighter",
  "mat-electrolyte",
] as const;

export function resolveNpcInstantSellPrice(value: number): number {
  return Math.max(1, Math.floor(value * NPC_INSTANT_SELL_RATE));
}

export function resolveNpcAutoBuyMaxUnitPrice(value: number): number {
  return Math.max(1, Math.floor(value));
}

export function resolveNpcSupplyUnitPrice(value: number): number {
  return Math.max(1, Math.ceil(value * NPC_SUPPLY_MARKUP));
}

export function resolveNpcUndercutTriggerUnitPrice(value: number): number {
  return Math.max(2, Math.ceil(value * NPC_UNDERCUT_TRIGGER_MULTIPLIER));
}

export function resolveNpcUndercutUnitPrice(
  value: number,
  userUnitPrice: number,
): number {
  const floorPrice = resolveNpcSupplyUnitPrice(value);
  const discounted = Math.floor(userUnitPrice * NPC_UNDERCUT_DISCOUNT_RATE);
  const capped = Math.min(userUnitPrice - 1, discounted);
  return Math.max(floorPrice, capped);
}

export function resolveMinNextBid(
  startingBid: number,
  currentBid: number | null,
): number {
  if (currentBid === null) return Math.max(1, Math.floor(startingBid));
  const increment = Math.max(1, Math.ceil(currentBid * 0.05));
  return currentBid + increment;
}

export type MarketListingStatus = "ACTIVE" | "SOLD" | "EXPIRED" | "CANCELLED";

export interface MarketAuctionListing {
  id: string;
  weaponMasterId: string;
  name: string;
  description: string;
  weight: number;
  value: number;
  iconKey: string;
  itemKind: ItemKind;
  attackType: "MELEE" | "RANGED";
  damage: number;
  tags: WeaponTag[];
  quantity: number;
  startingBid: number;
  currentBid: number | null;
  minNextBid: number;
  bidCount: number;
  isNpcSeller: boolean;
  sellerLabel: string;
  isMine: boolean;
  isHighestBidder: boolean;
  npcAutoBuyEligible: boolean;
  status: MarketListingStatus;
  settledByNpc: boolean;
  endsAt: string;
  createdAt: string;
}

export interface MarketStashEntry {
  weaponMasterId: string;
  name: string;
  description: string;
  quantity: number;
  weight: number;
  value: number;
  instantSellPrice: number;
  npcAutoBuyUnitPrice: number;
  iconKey: string;
  itemKind: ItemKind;
  tags: WeaponTag[];
}

export interface MarketStateResponse {
  credits: number;
  serverTime: string;
  listings: MarketAuctionListing[];
  myListings: MarketAuctionListing[];
  stash: MarketStashEntry[];
}

export interface CreateMarketListingInput {
  weaponMasterId: string;
  quantity: number;
  startingBid: number;
}

export interface CreateMarketListingResponse {
  status: "success";
  listing: MarketAuctionListing;
  npcUndercutSpawned: boolean;
}

export interface PlaceMarketBidInput {
  amount: number;
}

export interface PlaceMarketBidResponse {
  status: "success";
  credits: number;
  listing: MarketAuctionListing;
}

export interface CancelMarketListingResponse {
  status: "success";
  listingId: string;
}

export interface InstantSellInput {
  weaponMasterId: string;
  quantity: number;
}

export interface InstantSellResponse {
  status: "success";
  credits: number;
  soldItem: {
    weaponMasterId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  };
}

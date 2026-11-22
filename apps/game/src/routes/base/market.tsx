import { createFileRoute } from "@tanstack/react-router";
import {
  type ItemKind,
  type MarketAuctionListing,
  WEAPON_TAG_LABELS,
} from "@webgame/types";
import { useEffect, useMemo, useState } from "react";

import choiPortrait from "@/assets/choi-portrait.png";
import { resolveItemImageSrc } from "@/assets/items";
import { BaseScreen } from "@/components/lobby/BaseScreen";
import * as baseStyles from "@/components/lobby/BaseScreen.css";
import {
  useCancelMarketListing,
  useCreateMarketListing,
  useInstantSellMarketItem,
  useMarket,
  usePlaceMarketBid,
} from "@/utils/hooks/useMarket";

import * as styles from "./market.css";

type MarketTab = "AUCTIONS" | "SELL" | "MY_TRADES";
type CategoryFilter = "ALL" | ItemKind;

const ITEM_KIND_LABELS: Record<ItemKind, string> = {
  EQUIPMENT: "장비",
  CONSUMABLE: "소모품",
  MATERIAL: "재료",
};

const CATEGORY_FILTERS: { id: CategoryFilter; label: string }[] = [
  { id: "ALL", label: "전체" },
  { id: "EQUIPMENT", label: "장비" },
  { id: "CONSUMABLE", label: "소모품" },
  { id: "MATERIAL", label: "재료" },
];

function formatRemaining(endsAtIso: string, nowMs: number): string {
  const diffSec = Math.max(0, Math.floor((Date.parse(endsAtIso) - nowMs) / 1000));
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function getStatusLabel(listing: MarketAuctionListing): {
  label: string;
  tone: "neutral" | "positive" | "negative";
} {
  if (listing.status === "ACTIVE") {
    return listing.isHighestBidder
      ? { label: "최고 입찰중", tone: "positive" }
      : { label: "진행중", tone: "neutral" };
  }
  if (listing.status === "SOLD") {
    return listing.settledByNpc
      ? { label: "최 사장 매입", tone: "positive" }
      : { label: "낙찰 완료", tone: "positive" };
  }
  if (listing.status === "CANCELLED") {
    return { label: "취소됨", tone: "neutral" };
  }
  return { label: "유찰 반환", tone: "negative" };
}

export const Route = createFileRoute("/base/market")({
  component: MarketScreen,
});

function MarketScreen() {
  const marketQuery = useMarket();
  const createListingMutation = useCreateMarketListing();
  const bidMutation = usePlaceMarketBid();
  const cancelMutation = useCancelMarketListing();
  const instantSellMutation = useInstantSellMarketItem();

  const [tab, setTab] = useState<MarketTab>("AUCTIONS");
  const [category, setCategory] = useState<CategoryFilter>("ALL");
  const [searchText, setSearchText] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [bidInputs, setBidInputs] = useState<Record<string, string>>({});
  const [sellQtyMap, setSellQtyMap] = useState<Record<string, number>>({});
  const [sellStartBidMap, setSellStartBidMap] = useState<Record<string, string>>(
    {},
  );
  const [feedback, setFeedback] = useState<{
    tone: "positive" | "negative";
    message: string;
  } | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const credits = marketQuery.data?.credits ?? 0;
  const listings = useMemo(
    () => marketQuery.data?.listings ?? [],
    [marketQuery.data?.listings],
  );
  const myListings = useMemo(
    () => marketQuery.data?.myListings ?? [],
    [marketQuery.data?.myListings],
  );
  const stash = useMemo(
    () => marketQuery.data?.stash ?? [],
    [marketQuery.data?.stash],
  );

  // 마감 시각이 지난 활성 경매가 있으면 자동 갱신해 정산 결과를 반영
  const hasExpiredActive = useMemo(
    () => listings.some((item) => Date.parse(item.endsAt) <= nowMs),
    [listings, nowMs],
  );
  useEffect(() => {
    if (hasExpiredActive && !marketQuery.isFetching) {
      void marketQuery.refetch();
    }
  }, [hasExpiredActive, marketQuery]);

  const activeMyCount = useMemo(
    () => myListings.filter((item) => item.status === "ACTIVE").length,
    [myListings],
  );

  const normalizedQuery = searchText.trim().toLowerCase();

  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      if (category !== "ALL" && item.itemKind !== category) return false;
      if (
        normalizedQuery &&
        !item.name.toLowerCase().includes(normalizedQuery) &&
        !item.weaponMasterId.toLowerCase().includes(normalizedQuery)
      ) {
        return false;
      }
      return true;
    });
  }, [listings, category, normalizedQuery]);

  const filteredStash = useMemo(() => {
    return stash.filter((item) => {
      if (category !== "ALL" && item.itemKind !== category) return false;
      if (
        normalizedQuery &&
        !item.name.toLowerCase().includes(normalizedQuery) &&
        !item.weaponMasterId.toLowerCase().includes(normalizedQuery)
      ) {
        return false;
      }
      return true;
    });
  }, [stash, category, normalizedQuery]);

  const isBusy =
    createListingMutation.isPending ||
    bidMutation.isPending ||
    cancelMutation.isPending ||
    instantSellMutation.isPending;

  const getSellQty = (id: string, max: number) => {
    const raw = sellQtyMap[id] ?? 1;
    return Math.max(1, Math.min(raw, Math.max(1, max)));
  };

  const setSellQty = (id: string, next: number, max: number, unitAutoBuy: number) => {
    const clamped = Math.max(1, Math.min(next, Math.max(1, max)));
    setSellQtyMap((prev) => ({ ...prev, [id]: clamped }));
    setSellStartBidMap((prev) => ({
      ...prev,
      [id]: String(unitAutoBuy * clamped),
    }));
  };

  const handleBid = (listing: MarketAuctionListing) => {
    setFeedback(null);
    const raw = bidInputs[listing.id];
    const amount = raw ? Number.parseInt(raw, 10) : listing.minNextBid;
    if (!Number.isFinite(amount) || amount < listing.minNextBid) {
      setFeedback({
        tone: "negative",
        message: `최소 입찰가는 ${listing.minNextBid.toLocaleString()} CR입니다.`,
      });
      return;
    }
    bidMutation.mutate(
      { listingId: listing.id, input: { amount } },
      {
        onSuccess: (res) => {
          setBidInputs((prev) => {
            const next = { ...prev };
            delete next[listing.id];
            return next;
          });
          setFeedback({
            tone: "positive",
            message: `${res.listing.name}에 ${amount.toLocaleString()} CR 입찰 완료`,
          });
        },
        onError: (error) => {
          setFeedback({ tone: "negative", message: error.message });
        },
      },
    );
  };

  const handleCreateListing = (
    weaponMasterId: string,
    quantity: number,
    startingBid: number,
  ) => {
    setFeedback(null);
    if (!Number.isFinite(startingBid) || startingBid < 1) {
      setFeedback({
        tone: "negative",
        message: "시작가는 1 CR 이상이어야 합니다.",
      });
      return;
    }
    createListingMutation.mutate(
      { weaponMasterId, quantity, startingBid },
      {
        onSuccess: (res) => {
          setSellQtyMap((prev) => ({ ...prev, [weaponMasterId]: 1 }));
          setFeedback({
            tone: "positive",
            message: res.npcUndercutSpawned
              ? `${res.listing.name} ×${res.listing.quantity} 경매 등록 완료 (고가 감지: 최 사장 경쟁 매물 출품)`
              : `${res.listing.name} ×${res.listing.quantity} 경매 등록 완료 (시작가 ${res.listing.startingBid.toLocaleString()} CR)`,
          });
        },
        onError: (error) => {
          setFeedback({ tone: "negative", message: error.message });
        },
      },
    );
  };

  const handleInstantSell = (weaponMasterId: string, quantity: number) => {
    setFeedback(null);
    instantSellMutation.mutate(
      { weaponMasterId, quantity },
      {
        onSuccess: (res) => {
          setSellQtyMap((prev) => ({ ...prev, [weaponMasterId]: 1 }));
          setFeedback({
            tone: "positive",
            message: `${res.soldItem.name} ×${res.soldItem.quantity} 즉시 매각 완료 (+${res.soldItem.totalPrice.toLocaleString()} CR)`,
          });
        },
        onError: (error) => {
          setFeedback({ tone: "negative", message: error.message });
        },
      },
    );
  };

  const handleCancel = (listingId: string) => {
    setFeedback(null);
    cancelMutation.mutate(listingId, {
      onSuccess: () => {
        setFeedback({
          tone: "positive",
          message: "경매가 취소되어 품목이 창고로 반환되었습니다.",
        });
      },
      onError: (error) => {
        setFeedback({ tone: "negative", message: error.message });
      },
    });
  };

  return (
    <BaseScreen
      title="거래소"
      description={'최 사장 · "쓸 만한 물건이면 내가 시세 맞춰 바로 쳐줄게. 급하면 여기 매대부터 뒤져봐."'}
      portraitSrc={choiPortrait}
    >
      <div className={styles.layout}>
        <div className={styles.telemetryGrid}>
          <div className={styles.telemetryCell}>
            <span className={styles.telemetryLabel}>보유 크레딧</span>
            <span
              className={styles.telemetryValue({
                tone: credits > 0 ? "positive" : "default",
              })}
            >
              {credits.toLocaleString()} CR
            </span>
          </div>
          <div className={styles.telemetryCell}>
            <span className={styles.telemetryLabel}>진행 중 경매</span>
            <span className={styles.telemetryValue()}>
              {listings.length.toLocaleString()}
            </span>
          </div>
          <div className={styles.telemetryCell}>
            <span className={styles.telemetryLabel}>내 거래</span>
            <span className={styles.telemetryValue()}>
              {activeMyCount.toLocaleString()}
            </span>
          </div>
        </div>

        {marketQuery.error && (
          <p className={baseStyles.banner({ tone: "negative" })} role="alert">
            {marketQuery.error.message}
          </p>
        )}

        {feedback && (
          <p
            className={baseStyles.banner({ tone: feedback.tone })}
            role={feedback.tone === "negative" ? "alert" : "status"}
          >
            {feedback.message}
          </p>
        )}

        <div className={styles.toolbar}>
          <div className={styles.tabGroup}>
            <button
              type="button"
              className={styles.modeTab({ active: tab === "AUCTIONS" })}
              onClick={() => setTab("AUCTIONS")}
            >
              경매장 ({listings.length})
            </button>
            <button
              type="button"
              className={styles.modeTab({ active: tab === "SELL" })}
              onClick={() => setTab("SELL")}
            >
              출품 · 즉시 매각 ({stash.length})
            </button>
            <button
              type="button"
              className={styles.modeTab({ active: tab === "MY_TRADES" })}
              onClick={() => setTab("MY_TRADES")}
            >
              내 거래 ({myListings.length})
            </button>
          </div>

          {tab !== "MY_TRADES" && (
            <>
              <div className={styles.tabGroup}>
                {CATEGORY_FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    className={styles.filterTab({
                      active: category === filter.id,
                    })}
                    onClick={() => setCategory(filter.id)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              <input
                type="search"
                className={styles.searchInput}
                placeholder="품목명 검색..."
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                aria-label="품목명 검색"
              />
            </>
          )}
        </div>

        {marketQuery.isLoading ? (
          <div className={styles.tableShell}>
            <div className={styles.emptyState}>거래소 데이터를 불러오는 중...</div>
          </div>
        ) : tab === "AUCTIONS" ? (
          <div className={styles.tableShell}>
            {filteredListings.length === 0 ? (
              <div className={styles.emptyState}>진행 중인 경매가 없습니다.</div>
            ) : (
              filteredListings.map((listing) => {
                const imgSrc = resolveItemImageSrc(
                  listing.weaponMasterId,
                  listing.iconKey,
                );
                const bidValue =
                  bidInputs[listing.id] ?? String(listing.minNextBid);
                const parsedBid = Number.parseInt(bidValue, 10);
                const canAfford =
                  Number.isFinite(parsedBid) &&
                  parsedBid >= listing.minNextBid &&
                  credits >= parsedBid;
                const remaining = formatRemaining(listing.endsAt, nowMs);
                const tagText = listing.tags
                  .map((tag) => WEAPON_TAG_LABELS[tag] ?? tag)
                  .join(" · ");

                return (
                  <div key={listing.id} className={styles.auctionRow}>
                    <div className={styles.thumbBox}>
                      {imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={listing.name}
                          className={styles.thumbImg}
                        />
                      ) : (
                        <span className={styles.thumbFallback}>ITEM</span>
                      )}
                    </div>

                    <div className={styles.itemInfo}>
                      <div className={styles.itemTitleRow}>
                        <span className={styles.itemName}>{listing.name}</span>
                        {listing.quantity > 1 && (
                          <span className={styles.qtyPill}>
                            ×{listing.quantity}
                          </span>
                        )}
                        <span className={styles.badge()}>
                          {ITEM_KIND_LABELS[listing.itemKind]}
                        </span>
                        <span
                          className={styles.badge({
                            tone: listing.isNpcSeller ? "neutral" : "positive",
                          })}
                        >
                          {listing.isMine ? "내 매물" : listing.sellerLabel}
                        </span>
                        {listing.isHighestBidder && (
                          <span className={styles.badge({ tone: "positive" })}>
                            최고 입찰중
                          </span>
                        )}
                      </div>
                      <span className={styles.itemMeta}>
                        {listing.itemKind === "EQUIPMENT" && listing.damage > 0
                          ? `ATK ${listing.damage} · `
                          : ""}
                        WT {listing.weight}
                        {tagText ? ` · ${tagText}` : ""}
                      </span>
                    </div>

                    <div className={styles.statCell}>
                      <span className={styles.statSub}>남은 시간</span>
                      <span className={styles.statVal()}>{remaining}</span>
                    </div>

                    <div className={styles.statCell}>
                      <span className={styles.statSub}>
                        {listing.currentBid !== null
                          ? `현재가 · 입찰 ${listing.bidCount}`
                          : "시작가 · 입찰 0"}
                      </span>
                      <span className={styles.statVal()}>
                        {(
                          listing.currentBid ?? listing.startingBid
                        ).toLocaleString()}{" "}
                        CR
                      </span>
                    </div>

                    <div className={styles.actionCell}>
                      {listing.isMine ? (
                        <button
                          type="button"
                          className={styles.secondaryBtn}
                          disabled={isBusy || listing.bidCount > 0}
                          onClick={() => handleCancel(listing.id)}
                        >
                          {listing.bidCount > 0 ? "입찰 진행중" : "출품 취소"}
                        </button>
                      ) : listing.isHighestBidder ? (
                        <span className={styles.badge({ tone: "positive" })}>
                          낙찰 대기중
                        </span>
                      ) : (
                        <>
                          <input
                            type="number"
                            min={listing.minNextBid}
                            className={styles.numberInput}
                            value={bidValue}
                            onChange={(event) =>
                              setBidInputs((prev) => ({
                                ...prev,
                                [listing.id]: event.target.value,
                              }))
                            }
                            aria-label={`${listing.name} 입찰가`}
                          />
                          <button
                            type="button"
                            className={styles.primaryBtn}
                            disabled={isBusy || !canAfford}
                            onClick={() => handleBid(listing)}
                          >
                            입찰
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : tab === "SELL" ? (
          <div className={styles.tableShell}>
            {filteredStash.length === 0 ? (
              <div className={styles.emptyState}>
                창고에 출품 또는 매각할 품목이 없습니다.
              </div>
            ) : (
              filteredStash.map((item) => {
                const qty = getSellQty(item.weaponMasterId, item.quantity);
                const defaultStartBid = item.npcAutoBuyUnitPrice * qty;
                const startBidStr =
                  sellStartBidMap[item.weaponMasterId] ??
                  String(defaultStartBid);
                const parsedStartBid = Number.parseInt(startBidStr, 10);
                const npcGuaranteed =
                  Number.isFinite(parsedStartBid) &&
                  parsedStartBid > 0 &&
                  parsedStartBid <= item.npcAutoBuyUnitPrice * qty;
                const instantGain = item.instantSellPrice * qty;
                const imgSrc = resolveItemImageSrc(
                  item.weaponMasterId,
                  item.iconKey,
                );

                return (
                  <div key={item.weaponMasterId} className={styles.auctionRow}>
                    <div className={styles.thumbBox}>
                      {imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={item.name}
                          className={styles.thumbImg}
                        />
                      ) : (
                        <span className={styles.thumbFallback}>ITEM</span>
                      )}
                    </div>

                    <div className={styles.itemInfo}>
                      <div className={styles.itemTitleRow}>
                        <span className={styles.itemName}>{item.name}</span>
                        <span className={styles.badge()}>
                          {ITEM_KIND_LABELS[item.itemKind]}
                        </span>
                        {npcGuaranteed && (
                          <span className={styles.badge({ tone: "positive" })}>
                            최 사장 매입 보장
                          </span>
                        )}
                      </div>
                      <span className={styles.itemMeta}>
                        기준가 {item.value} CR · 즉시 매각 {item.instantSellPrice}{" "}
                        CR/개
                      </span>
                    </div>

                    <div className={styles.statCell}>
                      <span className={styles.statSub}>창고 보유</span>
                      <span className={styles.statVal()}>{item.quantity}</span>
                    </div>

                    <div className={styles.statCell}>
                      <span className={styles.statSub}>경매 시작가 (CR)</span>
                      <input
                        type="number"
                        min={1}
                        className={styles.numberInput}
                        value={startBidStr}
                        onChange={(event) =>
                          setSellStartBidMap((prev) => ({
                            ...prev,
                            [item.weaponMasterId]: event.target.value,
                          }))
                        }
                        aria-label={`${item.name} 경매 시작가`}
                      />
                    </div>

                    <div className={styles.actionCell}>
                      <div className={styles.qtyStepper}>
                        <button
                          type="button"
                          className={styles.qtyBtn}
                          disabled={isBusy || qty <= 1}
                          onClick={() =>
                            setSellQty(
                              item.weaponMasterId,
                              qty - 1,
                              item.quantity,
                              item.npcAutoBuyUnitPrice,
                            )
                          }
                          aria-label="수량 감소"
                        >
                          -
                        </button>
                        <span className={styles.qtyDisplay}>{qty}</span>
                        <button
                          type="button"
                          className={styles.qtyBtn}
                          disabled={isBusy || qty >= item.quantity}
                          onClick={() =>
                            setSellQty(
                              item.weaponMasterId,
                              qty + 1,
                              item.quantity,
                              item.npcAutoBuyUnitPrice,
                            )
                          }
                          aria-label="수량 증가"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className={styles.primaryBtn}
                        disabled={
                          isBusy ||
                          !Number.isFinite(parsedStartBid) ||
                          parsedStartBid < 1
                        }
                        onClick={() =>
                          handleCreateListing(
                            item.weaponMasterId,
                            qty,
                            parsedStartBid,
                          )
                        }
                      >
                        경매 등록
                      </button>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        disabled={isBusy}
                        onClick={() =>
                          handleInstantSell(item.weaponMasterId, qty)
                        }
                      >
                        즉시 +{instantGain.toLocaleString()} CR
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className={styles.tableShell}>
            {myListings.length === 0 ? (
              <div className={styles.emptyState}>
                최근 출품하거나 입찰한 거래 내역이 없습니다.
              </div>
            ) : (
              myListings.map((listing) => {
                const statusInfo = getStatusLabel(listing);
                const imgSrc = resolveItemImageSrc(
                  listing.weaponMasterId,
                  listing.iconKey,
                );
                const price = listing.currentBid ?? listing.startingBid;

                return (
                  <div key={listing.id} className={styles.auctionRow}>
                    <div className={styles.thumbBox}>
                      {imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={listing.name}
                          className={styles.thumbImg}
                        />
                      ) : (
                        <span className={styles.thumbFallback}>ITEM</span>
                      )}
                    </div>

                    <div className={styles.itemInfo}>
                      <div className={styles.itemTitleRow}>
                        <span className={styles.itemName}>{listing.name}</span>
                        {listing.quantity > 1 && (
                          <span className={styles.qtyPill}>
                            ×{listing.quantity}
                          </span>
                        )}
                        <span className={styles.badge()}>
                          {listing.isMine ? "출품" : "입찰"}
                        </span>
                        <span
                          className={styles.badge({ tone: statusInfo.tone })}
                        >
                          {statusInfo.label}
                        </span>
                      </div>
                      <span className={styles.itemMeta}>
                        시작가 {listing.startingBid.toLocaleString()} CR · 입찰{" "}
                        {listing.bidCount}건
                      </span>
                    </div>

                    <div className={styles.statCell}>
                      <span className={styles.statSub}>
                        {listing.status === "ACTIVE" ? "남은 시간" : "상태"}
                      </span>
                      <span className={styles.statVal()}>
                        {listing.status === "ACTIVE"
                          ? formatRemaining(listing.endsAt, nowMs)
                          : statusInfo.label}
                      </span>
                    </div>

                    <div className={styles.statCell}>
                      <span className={styles.statSub}>거래가</span>
                      <span
                        className={styles.statVal({
                          tone:
                            listing.status === "SOLD" ? "positive" : "default",
                        })}
                      >
                        {price.toLocaleString()} CR
                      </span>
                    </div>

                    <div className={styles.actionCell}>
                      {listing.status === "ACTIVE" &&
                        listing.isMine &&
                        listing.bidCount === 0 && (
                          <button
                            type="button"
                            className={styles.secondaryBtn}
                            disabled={isBusy}
                            onClick={() => handleCancel(listing.id)}
                          >
                            출품 취소
                          </button>
                        )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </BaseScreen>
  );
}

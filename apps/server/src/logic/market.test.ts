import assert from "node:assert/strict";
import test from "node:test";
import {
  ALL_CATALOG_ITEMS,
  getCatalogItemById,
  hasBuildingChoiceCondition,
  isUnarmedLoadout,
  JUNK_EXCHANGE_EVENT,
  NPC_BASE_SUPPLY_ITEM_IDS,
  resolveBuildingIntroEvent,
  resolveMinNextBid,
  resolveNpcAutoBuyMaxUnitPrice,
  resolveNpcInstantSellPrice,
  resolveNpcSupplyUnitPrice,
  resolveNpcUndercutTriggerUnitPrice,
  resolveNpcUndercutUnitPrice,
} from "@webgame/types";

test("모든 NPC 상시 보급 품목 ID가 카탈로그에 존재한다", () => {
  for (const id of NPC_BASE_SUPPLY_ITEM_IDS) {
    assert.ok(getCatalogItemById(id), `missing catalog item: ${id}`);
  }
});

test("즉시 매각가 <= NPC 자동 매입 상한 < NPC 출품가 순서를 유지해 무한 차익을 방지한다", () => {
  for (const item of ALL_CATALOG_ITEMS) {
    const instantSell = resolveNpcInstantSellPrice(item.value);
    const autoBuyMax = resolveNpcAutoBuyMaxUnitPrice(item.value);
    const npcSupply = resolveNpcSupplyUnitPrice(item.value);
    assert.ok(instantSell >= 1);
    assert.ok(instantSell <= autoBuyMax);
    if (item.value >= 2) {
      assert.ok(npcSupply > autoBuyMax);
    }
  }
});

test("유저가 고가로 출품하면 NPC 경쟁 출품가가 유저가보다 저렴하되 기본 공급가 이상으로 계산된다", () => {
  const baseValue = 100;
  const trigger = resolveNpcUndercutTriggerUnitPrice(baseValue);
  const highUserPrice = trigger + 80;
  const undercut = resolveNpcUndercutUnitPrice(baseValue, highUserPrice);

  assert.ok(undercut < highUserPrice);
  assert.ok(undercut >= resolveNpcSupplyUnitPrice(baseValue));
});

test("최소 다음 입찰가는 첫 입찰 시 시작가, 이후에는 현재가보다 엄격히 높다", () => {
  assert.equal(resolveMinNextBid(50, null), 50);
  assert.ok(resolveMinNextBid(50, 50) > 50);
  assert.equal(resolveMinNextBid(50, 200), 210);
});

test("비무장 상태에서는 일반 건물마다 교환 이벤트가 완료 전까지 발동한다", () => {
  const sampleBuilding = { id: 999999, height: 28 };
  const sampleDistrict = { kind: "RESIDENTIAL" as const };

  const first = resolveBuildingIntroEvent(sampleBuilding, sampleDistrict, [], {
    isUnarmed: true,
  });
  assert.equal(first.id, JUNK_EXCHANGE_EVENT.id);
  assert.equal(first.oncePerRaid, true);
  assert.equal(first.allowSearch, true);

  const afterExchange = resolveBuildingIntroEvent(
    sampleBuilding,
    sampleDistrict,
    [JUNK_EXCHANGE_EVENT.id],
    { isUnarmed: true },
  );
  assert.notEqual(afterExchange.id, JUNK_EXCHANGE_EVENT.id);

  // 조합 설비 건물에서는 발동하지 않는다.
  const facility = resolveBuildingIntroEvent(
    { id: 999998, category: "PUBLIC" },
    sampleDistrict,
    [],
    { isUnarmed: true },
  );
  assert.notEqual(facility.id, JUNK_EXCHANGE_EVENT.id);
});

test("교환 이벤트는 가방 아이템 1개로 단검+테이프, 2개로 카빈을 준다", () => {
  const [one, two] = JUNK_EXCHANGE_EVENT.choices ?? [];
  assert.ok(one && two);
  assert.equal(hasBuildingChoiceCondition(one, [], 0), false);
  assert.equal(hasBuildingChoiceCondition(one, [], 1), true);
  assert.equal(hasBuildingChoiceCondition(two, [], 1), false);
  assert.equal(hasBuildingChoiceCondition(two, [], 2), true);
  assert.deepEqual(one.outcomes?.[0]?.rewardItemIds, [
    "wpn_dagger",
    "mat-tape",
  ]);
  assert.deepEqual(two.outcomes?.[0]?.rewardItemIds, [
    "hanlim-relief-carbine",
  ]);
  for (const choice of [one, two]) {
    for (const itemId of choice.outcomes?.[0]?.rewardItemIds ?? []) {
      assert.ok(getCatalogItemById(itemId), `invalid reward item ${itemId}`);
    }
  }
});

test("재료만 장착한 상태는 비무장으로 보고 무기를 장착하면 무장으로 본다", () => {
  assert.equal(isUnarmedLoadout([]), true);
  assert.equal(isUnarmedLoadout(["mat-tape", "mat-lighter"]), true);
  assert.equal(isUnarmedLoadout(["mat-tape", "wpn_dagger"]), false);
  assert.equal(isUnarmedLoadout(["hanlim-relief-carbine"]), false);
});

test("무장 상태에서는 교환 이벤트가 발동하지 않는다", () => {
  const sampleBuilding = { id: 999999, height: 28 };
  const sampleDistrict = { kind: "RESIDENTIAL" as const };
  const armedEvent = resolveBuildingIntroEvent(
    sampleBuilding,
    sampleDistrict,
    [],
    { isUnarmed: false },
  );
  assert.notEqual(armedEvent.id, JUNK_EXCHANGE_EVENT.id);
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  ALL_CATALOG_ITEMS,
  getCatalogItemById,
  NPC_BASE_SUPPLY_ITEM_IDS,
  resolveBuildingIntroEvent,
  resolveMinNextBid,
  resolveNpcAutoBuyMaxUnitPrice,
  resolveNpcInstantSellPrice,
  resolveNpcSupplyUnitPrice,
  resolveNpcUndercutTriggerUnitPrice,
  resolveNpcUndercutUnitPrice,
  UNARMED_RECOVERY_EVENT_CHAIN,
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

test("비무장 상태에서는 1단계 → 2단계 복구 이벤트 체인이 순서대로 발동한다", () => {
  const sampleBuilding = { id: 999999, height: 28 };
  const sampleDistrict = { kind: "RESIDENTIAL" as const };

  const stage1 = resolveBuildingIntroEvent(sampleBuilding, sampleDistrict, [], {
    isUnarmed: true,
  });
  assert.equal(stage1.id, UNARMED_RECOVERY_EVENT_CHAIN[0]?.id);

  const stage2 = resolveBuildingIntroEvent(
    sampleBuilding,
    sampleDistrict,
    [stage1.id],
    { isUnarmed: true },
  );
  assert.equal(stage2.id, UNARMED_RECOVERY_EVENT_CHAIN[1]?.id);

  const afterChain = resolveBuildingIntroEvent(
    sampleBuilding,
    sampleDistrict,
    [stage1.id, stage2.id],
    { isUnarmed: true },
  );
  assert.notEqual(afterChain.id, stage1.id);
  assert.notEqual(afterChain.id, stage2.id);
});

test("비무장 복구 이벤트의 모든 보상 아이템이 카탈로그에 유효하게 존재한다", () => {
  for (const event of UNARMED_RECOVERY_EVENT_CHAIN) {
    for (const choice of event.choices ?? []) {
      for (const outcome of choice.outcomes ?? []) {
        for (const itemId of outcome.rewardItemIds ?? []) {
          assert.ok(
            getCatalogItemById(itemId),
            `invalid reward item ${itemId}`,
          );
        }
      }
    }
  }
});

test("무장 상태에서는 비무장 복구 이벤트가 발동하지 않는다", () => {
  const sampleBuilding = { id: 999999, height: 28 };
  const sampleDistrict = { kind: "RESIDENTIAL" as const };
  const armedEvent = resolveBuildingIntroEvent(
    sampleBuilding,
    sampleDistrict,
    [],
    { isUnarmed: false },
  );
  assert.notEqual(armedEvent.id, UNARMED_RECOVERY_EVENT_CHAIN[0]?.id);
});

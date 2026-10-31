import assert from "node:assert/strict";
import { test } from "node:test";
import { swapEquipmentBackpack } from "@webgame/types";

function fixture({ full = false, equipped = false } = {}) {
  const equipment = Array.from({ length: 6 }, (_, slotIndex) => ({
    id: `empty-wpn-${slotIndex}`,
    slotIndex,
    weaponMaster: null as { id: string } | null,
  }));
  const inventory = Array.from({ length: 32 }, (_, slotIndex) => ({
    id: `empty-inv-${slotIndex}`,
    slotIndex,
    quantity: 0,
    weaponMaster: null as { id: string } | null,
  }));
  inventory[0] = {
    id: "stack",
    slotIndex: 0,
    quantity: 3,
    weaponMaster: { id: "a" },
  };
  if (equipped)
    equipment[0] = { id: "equipped", slotIndex: 0, weaponMaster: { id: "b" } };
  if (full)
    for (let slotIndex = 1; slotIndex < 32; slotIndex++) {
      inventory[slotIndex] = {
        id: `item-${slotIndex}`,
        slotIndex,
        quantity: 1,
        weaponMaster: { id: "c" },
      };
    }
  return { equipment, inventory };
}

test("묶음에서 하나만 장착하고 나머지 수량과 고유 ID를 유지한다", () => {
  const { equipment, inventory } = fixture();
  assert.equal(
    swapEquipmentBackpack(equipment, inventory, 0, 0, () => "unique"),
    true,
  );
  assert.equal(equipment[0]?.weaponMaster?.id, "a");
  assert.equal(inventory[0]?.quantity, 2);
  assert.notEqual(equipment[0]?.id, inventory[0]?.id);
});

test("묶음과 장착 무기를 교환할 때 기존 장비를 빈 가방 슬롯으로 옮긴다", () => {
  const { equipment, inventory } = fixture({ equipped: true });
  assert.equal(
    swapEquipmentBackpack(equipment, inventory, 0, 0, () => "unique"),
    true,
  );
  assert.equal(equipment[0]?.weaponMaster?.id, "a");
  assert.equal(inventory[0]?.quantity, 2);
  assert.equal(inventory[1]?.weaponMaster?.id, "b");
  assert.equal(inventory[1]?.quantity, 1);
});

test("교환할 장비를 보관할 자리가 없으면 변경하지 않는다", () => {
  const { equipment, inventory } = fixture({ equipped: true, full: true });
  const before = structuredClone({ equipment, inventory });
  assert.equal(swapEquipmentBackpack(equipment, inventory, 0, 0), false);
  assert.deepEqual({ equipment, inventory }, before);
});

test("단일 장비를 빈 가방 슬롯으로 해제하면 수량 한 개를 유지한다", () => {
  const { equipment, inventory } = fixture({ equipped: true });
  assert.equal(swapEquipmentBackpack(equipment, inventory, 0, 1), true);
  assert.equal(equipment[0]?.weaponMaster, null);
  assert.equal(inventory[1]?.quantity, 1);
  assert.equal(inventory[1]?.weaponMaster?.id, "b");
});

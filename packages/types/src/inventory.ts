interface EquipmentEntry<T> {
  id: string;
  slotIndex: number;
  weaponMaster: T | null;
}

interface BackpackEntry<T> extends EquipmentEntry<T> {
  quantity: number;
}

// 화면의 슬롯 교환에서도 여러 개짜리 묶음을 장착하며 수량이 사라지지 않게 한다.
export function swapEquipmentBackpack<T extends { id: string }>(
  equipment: EquipmentEntry<T>[],
  inventory: BackpackEntry<T>[],
  equipmentIndex: number,
  inventoryIndex: number,
  createId: () => string = () => crypto.randomUUID(),
): boolean {
  const equipped = equipment[equipmentIndex];
  const carried = inventory[inventoryIndex];
  if (
    !equipped ||
    !carried ||
    (!equipped.weaponMaster && !carried.weaponMaster)
  )
    return false;
  if (carried.weaponMaster && carried.quantity > 1) {
    if (equipped.weaponMaster?.id === carried.weaponMaster.id) return false;
    const emptyIndex = equipped.weaponMaster
      ? inventory.findIndex(
          (item, index) => index !== inventoryIndex && !item.weaponMaster,
        )
      : -1;
    if (equipped.weaponMaster && emptyIndex === -1) return false;
    if (equipped.weaponMaster)
      inventory[emptyIndex] = {
        ...equipped,
        slotIndex: emptyIndex,
        quantity: 1,
      };
    equipment[equipmentIndex] = {
      id: `local-equipment-${createId()}`,
      slotIndex: equipmentIndex,
      weaponMaster: carried.weaponMaster,
    };
    inventory[inventoryIndex] = { ...carried, quantity: carried.quantity - 1 };
  } else {
    equipment[equipmentIndex] = {
      id: carried.weaponMaster ? carried.id : `empty-wpn-${equipmentIndex}`,
      slotIndex: equipmentIndex,
      weaponMaster: carried.weaponMaster,
    };
    inventory[inventoryIndex] = {
      id: equipped.weaponMaster ? equipped.id : `empty-inv-${inventoryIndex}`,
      slotIndex: inventoryIndex,
      weaponMaster: equipped.weaponMaster,
      quantity: equipped.weaponMaster ? 1 : 0,
    };
  }
  return true;
}

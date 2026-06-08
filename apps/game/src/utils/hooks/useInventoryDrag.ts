import { type DragEndEvent, type DragStartEvent, type UniqueIdentifier } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useQueryClient } from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import { useState } from "react";

import { isInventoryDirtyAtom } from "@/atoms/raidAtom";
import type { CharacterData } from "@/utils/hooks/useGetCharacter";

export function useInventoryDrag(characterData: CharacterData | undefined) {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const setIsInventoryDirty = useSetAtom(isInventoryDirtyAtom);

  const handleDragStart = (event: DragStartEvent) => {
    if (event.active.id.toString().includes("empty")) {
      setActiveId(null);
      return;
    }
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !characterData) return;

    const activeIdStr = active.id.toString();
    const overIdStr = over.id.toString();

    if (activeIdStr === overIdStr) return;

    let didChange = false;

    queryClient.setQueryData(["character", characterData.raw.userId], (old: CharacterData | undefined) => {
      if (!old) return old;

      const newRaw = JSON.parse(JSON.stringify(old.raw)) as typeof old.raw;
      let { equipment: rawEquipment, inventory: rawInventory } = newRaw;

      const activeEquipIdx = rawEquipment.findIndex((w) => w.id === activeIdStr);
      const overEquipIdx = rawEquipment.findIndex((w) => w.id === overIdStr);
      const activeInvIdx = rawInventory.findIndex((i) => i.id === activeIdStr);
      const overInvIdx = rawInventory.findIndex((i) => i.id === overIdStr);

      let didSwap = false;

      // 1. Equipment 내 정렬 (리스트형 - 밀어내기)
      if (activeEquipIdx !== -1 && overEquipIdx !== -1) {
        rawEquipment = arrayMove(rawEquipment, activeEquipIdx, overEquipIdx);
        newRaw.equipment = rawEquipment;
        didSwap = true;
      }
      // 2. Inventory 내 정렬
      else if (activeInvIdx !== -1 && overInvIdx !== -1) {
        [rawInventory[activeInvIdx], rawInventory[overInvIdx]] = [
          rawInventory[overInvIdx],
          rawInventory[activeInvIdx],
        ];
        didSwap = true;
      }
      // 3. Inventory -> Equipment
      else if (activeInvIdx !== -1 && overEquipIdx !== -1) {
        const itemToEquip = rawInventory[activeInvIdx];
        const itemToUnequip = rawEquipment[overEquipIdx];

        rawEquipment[overEquipIdx] = {
          id: itemToEquip.id.startsWith("empty-") ? `empty-wpn-${overEquipIdx}` : itemToEquip.id,
          slotIndex: overEquipIdx,
          weaponMaster: itemToEquip.weaponMaster,
        };

        rawInventory[activeInvIdx] = {
          id: itemToUnequip.id.startsWith("empty-") ? `empty-inv-${activeInvIdx}` : itemToUnequip.id,
          slotIndex: activeInvIdx,
          weaponMaster: itemToUnequip.weaponMaster,
          quantity: itemToUnequip.weaponMaster ? 1 : 0,
        };
        didSwap = true;
      }
      // 4. Equipment -> Inventory
      else if (activeEquipIdx !== -1 && overInvIdx !== -1) {
        const itemToUnequip = rawEquipment[activeEquipIdx];
        const itemToEquip = rawInventory[overInvIdx];

        rawEquipment[activeEquipIdx] = {
          id: itemToEquip.id.startsWith("empty-") ? `empty-wpn-${activeEquipIdx}` : itemToEquip.id,
          slotIndex: activeEquipIdx,
          weaponMaster: itemToEquip.weaponMaster,
        };

        rawInventory[overInvIdx] = {
          id: itemToUnequip.id.startsWith("empty-") ? `empty-inv-${overInvIdx}` : itemToUnequip.id,
          slotIndex: overInvIdx,
          weaponMaster: itemToUnequip.weaponMaster,
          quantity: itemToUnequip.weaponMaster ? 1 : 0,
        };
        didSwap = true;
      }

      if (didSwap) {
        rawEquipment.forEach((w, index) => {
          w.slotIndex = index;
          if (!w.weaponMaster) {
            w.id = `empty-wpn-${index}`;
          }
        });
        rawInventory.forEach((i, index) => {
          i.slotIndex = index;
          if (!i.weaponMaster) {
            i.id = `empty-inv-${index}`;
          }
        });

        const equipment = rawEquipment.map((w) => ({
          id: w.id,
          name: w.weaponMaster?.name || "",
          weight: w.weaponMaster?.weight || 0,
          value: w.weaponMaster?.value || 0,
        }));

        const inventory = rawInventory.map((i) => ({
          id: i.id,
          name: i.weaponMaster?.name || "",
          weight: i.weaponMaster?.weight || 0,
          value: i.weaponMaster?.value || 0,
        }));

        didChange = true;

        return {
          ...old,
          equipment,
          inventory,
          raw: newRaw,
        };
      }

      return old;
    });

    if (didChange) {
      console.log("[InventoryDrag] Item reordered. Marking inventory dirty for sync.");
      setIsInventoryDirty(true);
    }
  };

  return { activeId, handleDragStart, handleDragEnd };
}

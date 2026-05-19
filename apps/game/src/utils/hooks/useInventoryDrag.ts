import { type DragEndEvent, type DragStartEvent, type UniqueIdentifier } from "@dnd-kit/core";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import type { CharacterData } from "@/utils/hooks/useGetCharacter";

export function useInventoryDrag(characterData: CharacterData | undefined) {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

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

    queryClient.setQueryData(["character", characterData.raw.userId], (old: CharacterData | undefined) => {
      if (!old) return old;

      const newEquipment = [...old.equipment];
      const newInventory = [...old.inventory];
      const newRawInventory = [...old.raw.inventory];

      const activeEquipIdx = newEquipment.findIndex((i) => i.id === activeIdStr);
      const overEquipIdx = newEquipment.findIndex((i) => i.id === overIdStr);
      const activeInvIdx = newInventory.findIndex((i) => i.id === activeIdStr);
      const overInvIdx = newInventory.findIndex((i) => i.id === overIdStr);

      // 1. Equipment 내 정렬
      if (activeEquipIdx !== -1 && overEquipIdx !== -1) {
        [newEquipment[activeEquipIdx], newEquipment[overEquipIdx]] = [
          newEquipment[overEquipIdx],
          newEquipment[activeEquipIdx],
        ];
        return { ...old, equipment: newEquipment };
      }

      // 2. Inventory 내 정렬
      if (activeInvIdx !== -1 && overInvIdx !== -1) {
        [newInventory[activeInvIdx], newInventory[overInvIdx]] = [newInventory[overInvIdx], newInventory[activeInvIdx]];
        [newRawInventory[activeInvIdx], newRawInventory[overInvIdx]] = [
          newRawInventory[overInvIdx],
          newRawInventory[activeInvIdx],
        ];
        return { ...old, inventory: newInventory, raw: { ...old.raw, inventory: newRawInventory } };
      }

      // 3. Inventory -> Equipment
      if (activeInvIdx !== -1 && overEquipIdx !== -1) {
        const itemToEquip = newInventory[activeInvIdx];
        const itemToUnequip = newEquipment[overEquipIdx];

        newEquipment[overEquipIdx] = itemToEquip;
        newInventory[activeInvIdx] = itemToUnequip;
        return { ...old, equipment: newEquipment, inventory: newInventory };
      }

      // 4. Equipment -> Inventory
      if (activeEquipIdx !== -1 && overInvIdx !== -1) {
        const itemToUnequip = newEquipment[activeEquipIdx];
        const itemToEquip = newInventory[overInvIdx];

        newEquipment[activeEquipIdx] = itemToEquip;
        newInventory[overInvIdx] = itemToUnequip;
        return { ...old, equipment: newEquipment, inventory: newInventory };
      }

      return old;
    });
  };

  return { activeId, handleDragStart, handleDragEnd };
}

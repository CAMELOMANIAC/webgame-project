import {
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useQueryClient } from "@tanstack/react-query";
import { swapEquipmentBackpack } from "@webgame/types";
import { useAtomValue, useSetAtom } from "jotai";
import { useRef } from "react";

import {
  activeDragIdAtom,
  animatingSlotIdsAtom,
  isCombatAtom,
  isInventoryDirtyAtom,
  isNavigatingAtom,
} from "@/atoms/raidAtom";
import type { CharacterData } from "@/utils/hooks/useGetCharacter";

import { characterKey } from "./useCharacterCollection";

export function useInventoryDrag(characterData: CharacterData | undefined) {
  const queryClient = useQueryClient();
  const isCombat = useAtomValue(isCombatAtom);
  const isNavigating = useAtomValue(isNavigatingAtom);
  const setActiveDragId = useSetAtom(activeDragIdAtom);
  const setAnimatingSlotIds = useSetAtom(animatingSlotIdsAtom);
  const setIsInventoryDirty = useSetAtom(isInventoryDirtyAtom);
  const activeIdRef = useRef<UniqueIdentifier | null>(null);
  const animTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    if (isCombat || isNavigating) return;
    if (event.active.id.toString().includes("empty")) {
      setActiveDragId(null);
      activeIdRef.current = null;
      return;
    }
    setActiveDragId(event.active.id);
    activeIdRef.current = event.active.id;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (isCombat || isNavigating) return;
    const { active, over } = event;
    setActiveDragId(null);
    activeIdRef.current = null;

    if (!over || !characterData) return;

    const activeIdStr = active.id.toString();
    const overIdStr = over.id.toString();

    if (activeIdStr === overIdStr) return;

    let didChange = false;

    queryClient.setQueryData(
      characterKey(characterData.raw.userId, characterData.raw.id),
      (old: CharacterData | undefined) => {
        if (!old) return old;

        const newRaw = JSON.parse(JSON.stringify(old.raw)) as typeof old.raw;
        let { equipment: rawEquipment } = newRaw;
        const { inventory: rawInventory } = newRaw;

        const activeEquipIdx = rawEquipment.findIndex(
          (w) => w.id === activeIdStr,
        );
        const overEquipIdx = rawEquipment.findIndex((w) => w.id === overIdStr);
        const activeInvIdx = rawInventory.findIndex(
          (i) => i.id === activeIdStr,
        );
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
          const carriedId = rawInventory[activeInvIdx]?.id;
          const wasStack = (rawInventory[activeInvIdx]?.quantity ?? 0) > 1;
          didSwap = swapEquipmentBackpack(
            rawEquipment,
            rawInventory,
            overEquipIdx,
            activeInvIdx,
          );
          if (didSwap && wasStack && carriedId && rawEquipment[overEquipIdx]) {
            const generatedId = rawEquipment[overEquipIdx].id;
            rawEquipment[overEquipIdx].id = carriedId;
            if (rawInventory[activeInvIdx]) {
              rawInventory[activeInvIdx].id = generatedId;
            }
          }
        }
        // 4. Equipment -> Inventory
        else if (activeEquipIdx !== -1 && overInvIdx !== -1) {
          didSwap = swapEquipmentBackpack(
            rawEquipment,
            rawInventory,
            activeEquipIdx,
            overInvIdx,
          );
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
            iconKey: w.weaponMaster?.iconKey,
            weight: w.weaponMaster?.weight || 0,
            value: w.weaponMaster?.value || 0,
          }));

          const inventory = rawInventory.map((i) => ({
            id: i.id,
            name: i.weaponMaster?.name || "",
            iconKey: i.weaponMaster?.iconKey,
            weight: i.weaponMaster?.weight || 0,
            value: i.weaponMaster?.value || 0,
            quantity: i.quantity,
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
      },
    );

    if (didChange) {
      setIsInventoryDirty(true);
      const movedIds = [activeIdStr, overIdStr].filter(
        (id) => !id.includes("empty"),
      );
      if (movedIds.length > 0) {
        if (animTimeoutRef.current) {
          clearTimeout(animTimeoutRef.current);
        }
        setAnimatingSlotIds(movedIds);
        animTimeoutRef.current = setTimeout(() => {
          setAnimatingSlotIds([]);
          animTimeoutRef.current = null;
        }, 360);
      }
    }
  };

  return { handleDragStart, handleDragEnd };
}

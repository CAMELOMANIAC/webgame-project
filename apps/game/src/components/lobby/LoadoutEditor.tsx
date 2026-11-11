import {
  type CollisionDetection,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useAtomValue, useSetAtom } from "jotai";
import { LayoutGroup, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import {
  activeDragIdAtom,
  animatingSlotIdsAtom,
  isCombatAtom,
  isInventoryDirtyAtom,
  isNavigatingAtom,
} from "@/atoms/raidAtom";
import BackpackSlot from "@/components/itemSlot/BackpackSlot";
import Equipment from "@/components/itemSlot/Equipment";
import SlotManager from "@/components/itemSlot/SlotManager";
import * as baseStyles from "@/components/lobby/BaseScreen.css";
import type { CharacterData } from "@/utils/hooks/useGetCharacter";
import type { StashItemResponse } from "@/utils/hooks/useGetStash";
import { useInventoryDrag } from "@/utils/hooks/useInventoryDrag";
import { useMoveStashItem } from "@/utils/hooks/useMoveStashItem";
import { useSyncItemsMutation } from "@/utils/hooks/useSyncItemsMutation";
import {
  moveSlotToStashDraft,
  moveStashToBackpackDraft,
  moveStashToEquipmentDraft,
} from "@/utils/loadoutDraft";

import * as styles from "./LoadoutEditor.css";

const BACKPACK_DROPZONE_ID = "backpack-dropzone";
const STASH_DROPZONE_ID = "stash-dropzone";

interface LoadoutEditorProps {
  characterData: CharacterData | undefined;
  isLoading: boolean;
  stash: StashItemResponse[];
  disabled?: boolean;
  commitMode?: "immediate" | "deferred";
  onDraftChange?: (
    nextCharacterData: CharacterData,
    nextStash: StashItemResponse[],
  ) => void;
}

function StashItemCard({
  item,
  disabled,
  onMoveToBackpack,
}: {
  item: StashItemResponse;
  disabled: boolean;
  onMoveToBackpack: (weaponMasterId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `stash:${item.weaponMasterId}`,
    disabled,
  });

  return (
    <motion.button
      ref={setNodeRef}
      type="button"
      disabled={disabled}
      className={`${baseStyles.itemSlotButton({ equipped: false })} ${styles.stashDraggableItem({ dragging: isDragging })}`}
      onClick={() => onMoveToBackpack(item.weaponMasterId)}
      {...attributes}
      {...listeners}
    >
      <div className={baseStyles.slotTopMeta}>
        <span>STASH</span>
        <span className={baseStyles.quantityBadge}>×{item.quantity}</span>
      </div>
      <p className={baseStyles.itemName}>{item.weaponMaster.name}</p>
      <span className={baseStyles.itemDetails}>
        DMG {item.weaponMaster.damage} · {item.weaponMaster.weight}kg
      </span>
    </motion.button>
  );
}

/**
 * 거점 정비소 및 탐사 준비 화면 공용 장비/창고/가방 드래그앤드롭 편집기.
 */
export function LoadoutEditor({
  characterData,
  isLoading,
  stash,
  disabled = false,
  commitMode = "immediate",
  onDraftChange,
}: LoadoutEditorProps) {
  const [localError, setLocalError] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const suppressClickRef = useRef(false);

  const activeId = useAtomValue(activeDragIdAtom);
  const animatingSlotIds = useAtomValue(animatingSlotIdsAtom);
  const setActiveDragId = useSetAtom(activeDragIdAtom);
  const setIsInventoryDirty = useSetAtom(isInventoryDirtyAtom);
  const setIsCombat = useSetAtom(isCombatAtom);
  const setIsNavigating = useSetAtom(isNavigatingAtom);

  const moveItemMutation = useMoveStashItem();
  const syncMutation = useSyncItemsMutation();

  const character = characterData?.raw;
  const equipment = character?.equipment ?? [];
  const backpack = character?.inventory ?? [];
  const filledInventoryItems = (characterData?.inventory ?? []).filter(
    (item) => !item.id.toString().includes("empty"),
  );
  const equippedCount =
    equipment.filter((slot) => slot.weaponMaster).length ?? 0;

  useEffect(() => {
    if (character && !character.isRaiding) {
      setIsCombat(false);
      setIsNavigating(false);
    }
  }, [character, setIsCombat, setIsNavigating]);

  const isBusy = Boolean(
    disabled ||
      !character ||
      (commitMode === "immediate" &&
        (moveItemMutation.isPending || syncMutation.isPending)),
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const {
    handleDragStart: handleInventoryDragStart,
    handleDragEnd: handleInventoryDragEnd,
  } = useInventoryDrag(characterData, {
    deferCacheWrite: commitMode === "deferred",
    ignoreCombatLock: true,
    onCommitted: (updated) => {
      setLocalError(null);
      if (commitMode === "deferred") {
        onDraftChange?.(updated, stash);
        return;
      }
      syncMutation.mutate(
        { characterId: updated.raw.id, data: updated },
        {
          onSuccess: () => {
            setIsInventoryDirty(false);
          },
        },
      );
    },
  });

  const firstEmptySlot = backpack.find((slot) => !slot.weaponMaster);
  const activeIdStr = activeId ? String(activeId) : null;
  const isDraggingStash = Boolean(activeIdStr?.startsWith("stash:"));
  const isDraggingBackpack = Boolean(
    activeIdStr && backpack.some((slot) => slot.id === activeIdStr),
  );
  const isDraggingEquipment = Boolean(
    activeIdStr && equipment.some((slot) => slot.id === activeIdStr),
  );

  const canDropInBackpack = isDraggingStash || isDraggingEquipment;
  const canDropInStash =
    isDraggingBackpack || (commitMode === "deferred" && isDraggingEquipment);

  const { setNodeRef: setBackpackDropRef, isOver: isBackpackPanelOver } =
    useDroppable({
      id: BACKPACK_DROPZONE_ID,
      disabled: isBusy || !canDropInBackpack,
    });

  const { setNodeRef: setStashDropRef, isOver: isStashPanelOver } =
    useDroppable({
      id: STASH_DROPZONE_ID,
      disabled: isBusy || !canDropInStash,
    });

  const isBackpackOver =
    canDropInBackpack &&
    (isBackpackPanelOver ||
      Boolean(overId && backpack.some((slot) => slot.id === overId)));
  const isStashOver =
    canDropInStash && (isStashPanelOver || overId === STASH_DROPZONE_ID);

  const handleMoveToBackpack = (
    weaponMasterId: string,
    preferredSlotIndex?: number,
  ) => {
    if (!characterData || !character || isBusy) return;
    if (commitMode === "deferred") {
      const result = moveStashToBackpackDraft(
        characterData,
        stash,
        weaponMasterId,
        preferredSlotIndex,
      );
      if (!result.ok) {
        setLocalError(result.error);
        return;
      }
      setLocalError(null);
      onDraftChange?.(result.characterData, result.stash);
      return;
    }

    const targetSlot =
      preferredSlotIndex !== undefined &&
      !backpack[preferredSlotIndex]?.weaponMaster
        ? backpack[preferredSlotIndex]
        : firstEmptySlot;

    if (!targetSlot) {
      setLocalError("가방 슬롯이 가득 찼습니다.");
      return;
    }
    setLocalError(null);
    moveItemMutation.mutate({
      characterId: character.id,
      direction: "to_backpack",
      weaponMasterId,
      slotIndex: targetSlot.slotIndex,
    });
  };

  const handleMoveToEquipment = (
    weaponMasterId: string,
    equipSlotIndex: number,
  ) => {
    if (!characterData || isBusy || commitMode !== "deferred") return;
    const result = moveStashToEquipmentDraft(
      characterData,
      stash,
      weaponMasterId,
      equipSlotIndex,
    );
    if (!result.ok) {
      setLocalError(result.error);
      return;
    }
    setLocalError(null);
    onDraftChange?.(result.characterData, result.stash);
  };

  const handleMoveToStash = (
    slotId: string,
    weaponMasterId?: string,
    slotIndex?: number,
  ) => {
    if (!characterData || !character || isBusy) return;
    if (commitMode === "deferred") {
      const result = moveSlotToStashDraft(characterData, stash, slotId);
      if (!result.ok) {
        setLocalError(result.error);
        return;
      }
      setLocalError(null);
      onDraftChange?.(result.characterData, result.stash);
      return;
    }

    if (weaponMasterId === undefined || slotIndex === undefined) return;
    setLocalError(null);
    moveItemMutation.mutate({
      characterId: character.id,
      direction: "to_stash",
      weaponMasterId,
      slotIndex,
    });
  };

  const collisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    const collisions =
      pointerCollisions.length > 0 ? pointerCollisions : rectIntersection(args);
    // 개별 슬롯(장비/가방) 위를 우선하고, 빈 여백일 때만 패널 드롭존을 선택한다.
    const specificSlot = collisions.find(
      (c) => c.id !== BACKPACK_DROPZONE_ID && c.id !== STASH_DROPZONE_ID,
    );
    return specificSlot ? [specificSlot] : collisions;
  };

  const resetDragUiState = () => {
    setOverId(null);
    setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (isBusy) return;
    suppressClickRef.current = true;
    handleInventoryDragStart(event);
  };

  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over ? String(event.over.id) : null);
  };

  const handleDragCancel = () => {
    setActiveDragId(null);
    resetDragUiState();
  };

  const handleDragEnd = (event: DragEndEvent) => {
    resetDragUiState();

    if (isBusy || !characterData || !event.over) {
      setActiveDragId(null);
      return;
    }

    const draggedId = String(event.active.id);
    const dropTargetId = String(event.over.id);

    if (draggedId.startsWith("stash:")) {
      setActiveDragId(null);
      const weaponMasterId = draggedId.replace(/^stash:/, "");
      if (
        dropTargetId === BACKPACK_DROPZONE_ID ||
        backpack.some((item) => item.id === dropTargetId)
      ) {
        const targetSlot = backpack.find(
          (slot) => slot.id === dropTargetId && !slot.weaponMaster,
        );
        handleMoveToBackpack(weaponMasterId, targetSlot?.slotIndex);
        return;
      }

      if (commitMode === "deferred") {
        const equipIndex = equipment.findIndex(
          (slot) => slot.id === dropTargetId,
        );
        if (equipIndex !== -1) {
          handleMoveToEquipment(weaponMasterId, equipIndex);
        }
      }
      return;
    }

    if (dropTargetId === STASH_DROPZONE_ID) {
      setActiveDragId(null);
      const draggedBackpackSlot = backpack.find(
        (slot) => slot.id === draggedId,
      );
      if (draggedBackpackSlot?.weaponMaster) {
        handleMoveToStash(
          draggedId,
          draggedBackpackSlot.weaponMaster.id,
          draggedBackpackSlot.slotIndex,
        );
        return;
      }

      if (commitMode === "deferred") {
        const draggedEquipSlot = equipment.find(
          (slot) => slot.id === draggedId,
        );
        if (draggedEquipSlot?.weaponMaster) {
          handleMoveToStash(draggedId);
        }
      }
      return;
    }

    if (dropTargetId === BACKPACK_DROPZONE_ID && isDraggingEquipment) {
      if (!firstEmptySlot) {
        setActiveDragId(null);
        setLocalError("가방 슬롯이 가득 찼습니다.");
        return;
      }
      handleInventoryDragEnd({
        ...event,
        over: { ...event.over, id: firstEmptySlot.id },
      });
      return;
    }

    handleInventoryDragEnd(event);
  };

  const activeStashItem = activeIdStr?.startsWith("stash:")
    ? stash.find((item) => `stash:${item.weaponMasterId}` === activeIdStr)
    : undefined;
  const activeSlotItem =
    characterData?.equipment.find((item) => item.id === activeId) ||
    characterData?.inventory.find((item) => item.id === activeId);
  const activeOverlayName =
    activeSlotItem?.name || activeStashItem?.weaponMaster.name;

  const isSlotAnimating = animatingSlotIds.length > 0;
  const errorMessage =
    localError ??
    (commitMode === "immediate"
      ? (moveItemMutation.error?.message ?? syncMutation.error?.message ?? null)
      : null);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <LayoutGroup id="base-inventory-group">
        {errorMessage && (
          <p className={baseStyles.banner({ tone: "negative" })} role="alert">
            {errorMessage}
          </p>
        )}

        <div className={baseStyles.inventoryStashArea}>
          {/* 1. 배치 장비 (6슬롯 고정) */}
          <div className={baseStyles.sectionPanel}>
            <h2 className={baseStyles.sectionHeader}>
              <span>배치 장비</span>
              <span className={baseStyles.sectionCode}>
                LOADOUT // {equippedCount}/{equipment.length || 6} ·{" "}
                {character?.weight ?? 0}/{character?.maxWeight ?? 0}kg
              </span>
            </h2>
            <Equipment
              characterData={characterData}
              isLoading={isLoading}
              className={styles.equipmentStrip}
            />
          </div>

          {/* 2. 배치 가방 (아이템에 따라 동적 확장) */}
          <div
            ref={setBackpackDropRef}
            className={styles.panelDropZone({
              over: isBackpackOver,
              ready: canDropInBackpack && !isBackpackOver,
            })}
            style={{ overflow: isSlotAnimating ? "visible" : undefined }}
          >
            <h2 className={baseStyles.sectionHeader}>
              <span>배치 가방</span>
              <span className={baseStyles.sectionCode}>
                PACK // {filledInventoryItems.length} / 32
              </span>
            </h2>
            {filledInventoryItems.length === 0 ? (
              <div className={styles.emptyDropArea({ over: isBackpackOver })}>
                가방이 비어 있습니다.
              </div>
            ) : (
              <div className={styles.backpackGrid}>
                <SlotManager items={filledInventoryItems}>
                  {(item) => <BackpackSlot item={item} />}
                </SlotManager>
              </div>
            )}
          </div>

          {/* 3. 거점 공용 창고 */}
          <div
            ref={setStashDropRef}
            className={styles.panelDropZone({
              over: isStashOver,
              ready: canDropInStash && !isStashOver,
            })}
          >
            <h2 className={baseStyles.sectionHeader}>
              <span>거점 공용 창고</span>
              <span className={baseStyles.sectionCode}>
                STASH // {stash.length} ITEMS
              </span>
            </h2>
            {stash.length === 0 ? (
              <div className={styles.emptyDropArea({ over: isStashOver })}>
                보관 중인 물품이 없습니다.
              </div>
            ) : (
              <div className={baseStyles.itemGrid}>
                {stash.map((item) => (
                  <StashItemCard
                    key={item.id}
                    item={item}
                    disabled={isBusy}
                    onMoveToBackpack={(weaponMasterId) => {
                      if (suppressClickRef.current) return;
                      handleMoveToBackpack(weaponMasterId);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeOverlayName && (
            <div className={styles.slotOverlay}>{activeOverlayName}</div>
          )}
        </DragOverlay>
      </LayoutGroup>
    </DndContext>
  );
}

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
import type { RecoveredStashDelta } from "@webgame/types";
import { useAtomValue, useSetAtom } from "jotai";
import { LayoutGroup, motion } from "motion/react";
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  activeDragIdAtom,
  animatingSlotIdsAtom,
  isCombatAtom,
  isNavigatingAtom,
} from "@/atoms/raidAtom";
import { ErrorToast } from "@/components/common/ErrorToast";
import BackpackSlot from "@/components/itemSlot/BackpackSlot";
import Equipment from "@/components/itemSlot/Equipment";
import * as slotStyles from "@/components/itemSlot/ItemSlot.css";
import ItemSlotContent from "@/components/itemSlot/ItemSlotContent";
import SlotManager from "@/components/itemSlot/SlotManager";
import * as baseStyles from "@/components/lobby/BaseScreen.css";
import { useCharacterRoster } from "@/utils/hooks/useCharacterCollection";
import type { CharacterData } from "@/utils/hooks/useGetCharacter";
import type { StashItemResponse } from "@/utils/hooks/useGetStash";
import { useInventoryDrag } from "@/utils/hooks/useInventoryDrag";
import { useMoveStashItem } from "@/utils/hooks/useMoveStashItem";
import { useSyncItemsMutation } from "@/utils/hooks/useSyncItemsMutation";
import {
  useUnequipAllEquipment,
  useUnequipOtherEquipment,
} from "@/utils/hooks/useUnequipEquipment";
import {
  moveSlotToStashDraft,
  moveStashToBackpackDraft,
  moveStashToEquipmentDraft,
  unequipAllDraft,
} from "@/utils/loadoutDraft";

import * as styles from "./LoadoutEditor.css";

const BACKPACK_DROPZONE_ID = "backpack-dropzone";
const STASH_DROPZONE_ID = "stash-dropzone";

function LoadoutDropZone({
  id,
  enabled,
  over,
  ready,
  style,
  children,
}: {
  id: string;
  enabled: boolean;
  over: boolean;
  ready: boolean;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id, disabled: !enabled });
  return (
    <div
      ref={setNodeRef}
      className={styles.panelDropZone({ over, ready })}
      style={style}
    >
      {children}
    </div>
  );
}

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
  onRecoveredToStash?: (recoveredItems: RecoveredStashDelta[]) => void;
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
      className={`${slotStyles.slot({ state: "occupied" })} ${slotStyles.button} ${isDragging ? slotStyles.dragging : ""}`}
      title={`${item.weaponMaster.name} · ×${item.quantity} · DMG ${item.weaponMaster.damage} · ${item.weaponMaster.weight}kg`}
      onClick={() => onMoveToBackpack(item.weaponMasterId)}
      {...attributes}
      {...listeners}
    >
      <ItemSlotContent
        name={item.weaponMaster.name}
        iconKey={item.weaponMaster.iconKey}
        quantity={item.quantity}
      />
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
  onRecoveredToStash,
}: LoadoutEditorProps) {
  const [localError, setLocalError] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const suppressClickRef = useRef(false);

  const activeId = useAtomValue(activeDragIdAtom);
  const animatingSlotIds = useAtomValue(animatingSlotIdsAtom);
  const setActiveDragId = useSetAtom(activeDragIdAtom);
  const setIsCombat = useSetAtom(isCombatAtom);
  const setIsNavigating = useSetAtom(isNavigatingAtom);

  const roster = useCharacterRoster();
  const moveItemMutation = useMoveStashItem();
  const syncMutation = useSyncItemsMutation();
  const unequipAllMutation = useUnequipAllEquipment();
  const unequipOthersMutation = useUnequipOtherEquipment();

  const character = characterData?.raw;
  const equipment = character?.equipment ?? [];
  const backpack = character?.inventory ?? [];
  const filledInventoryItems = (characterData?.inventory ?? []).filter(
    (item) => !item.id.toString().includes("empty"),
  );
  const equippedCount =
    equipment.filter((slot) => slot.weaponMaster).length ?? 0;
  const hasOtherSurvivors = (roster.data?.characters.length ?? 0) > 1;

  useEffect(() => {
    if (character && !character.isRaiding) {
      setIsCombat(false);
      setIsNavigating(false);
    }
  }, [character, setIsCombat, setIsNavigating]);

  const isBusy = Boolean(
    disabled ||
    !character ||
    unequipOthersMutation.isPending ||
    (commitMode === "immediate" &&
      (moveItemMutation.isPending ||
        syncMutation.isPending ||
        unequipAllMutation.isPending)),
  );

  const clearErrors = () => {
    setLocalError(null);
    moveItemMutation.reset();
    syncMutation.reset();
    unequipAllMutation.reset();
    unequipOthersMutation.reset();
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const {
    handleDragStart: handleInventoryDragStart,
    handleDragEnd: handleInventoryDragEnd,
  } = useInventoryDrag(characterData, {
    deferCacheWrite: true,
    ignoreCombatLock: true,
    onCommitted: (updated) => {
      clearErrors();
      if (commitMode === "deferred") {
        onDraftChange?.(updated, stash);
        return;
      }
      syncMutation.mutate({ characterId: updated.raw.id, data: updated });
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

  const isBackpackOver =
    canDropInBackpack &&
    (overId === BACKPACK_DROPZONE_ID ||
      backpack.some((slot) => slot.id === overId));
  const isStashOver = canDropInStash && overId === STASH_DROPZONE_ID;

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
        clearErrors();
        setLocalError(result.error);
        return;
      }
      clearErrors();
      onDraftChange?.(result.characterData, result.stash);
      return;
    }

    const targetSlot =
      preferredSlotIndex !== undefined &&
      !backpack[preferredSlotIndex]?.weaponMaster
        ? backpack[preferredSlotIndex]
        : firstEmptySlot;

    if (!targetSlot) {
      clearErrors();
      setLocalError("가방 슬롯이 가득 찼습니다.");
      return;
    }
    clearErrors();
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
      clearErrors();
      setLocalError(result.error);
      return;
    }
    clearErrors();
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
        clearErrors();
        setLocalError(result.error);
        return;
      }
      clearErrors();
      onDraftChange?.(result.characterData, result.stash);
      return;
    }

    if (weaponMasterId === undefined || slotIndex === undefined) return;
    clearErrors();
    moveItemMutation.mutate({
      characterId: character.id,
      direction: "to_stash",
      weaponMasterId,
      slotIndex,
    });
  };

  const handleUnequipAll = () => {
    if (!characterData || !character || isBusy || equippedCount === 0) return;
    if (commitMode === "deferred") {
      const result = unequipAllDraft(characterData, stash);
      if (!result.ok) {
        clearErrors();
        setLocalError(result.error);
        return;
      }
      clearErrors();
      onDraftChange?.(result.characterData, result.stash);
      return;
    }

    clearErrors();
    unequipAllMutation.mutate(character.id);
  };

  const handleUnequipOthers = () => {
    if (!character || isBusy || !hasOtherSurvivors) return;
    clearErrors();
    unequipOthersMutation.mutate(character.id, {
      onSuccess: (data) => {
        if (commitMode === "deferred" && data.recoveredItems.length > 0) {
          onRecoveredToStash?.(data.recoveredItems);
        }
      },
    });
  };

  const collisionDetection: CollisionDetection = (args) => {
    const source = String(args.active.id);
    const fromStash = source.startsWith("stash:");
    const fromEquipment = equipment.some((slot) => slot.id === source);
    const fromBackpack = backpack.some((slot) => slot.id === source);
    const candidates = {
      ...args,
      droppableContainers: args.droppableContainers.filter(({ id }) => {
        if (id === BACKPACK_DROPZONE_ID) return fromStash || fromEquipment;
        if (id === STASH_DROPZONE_ID) {
          return fromBackpack || (fromEquipment && commitMode === "deferred");
        }
        return (
          !fromStash ||
          commitMode === "deferred" ||
          !equipment.some((slot) => slot.id === id)
        );
      }),
    };
    const collisions = args.pointerCoordinates
      ? pointerWithin(candidates)
      : rectIntersection(candidates);
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
        const targetSlot = backpack.find((slot) => slot.id === dropTargetId);
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
    unequipOthersMutation.error?.message ??
    (commitMode === "immediate"
      ? (moveItemMutation.error?.message ??
        syncMutation.error?.message ??
        unequipAllMutation.error?.message ??
        null)
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
        <ErrorToast message={errorMessage} onDismiss={clearErrors} />

        <div className={baseStyles.inventoryStashArea}>
          {/* 1. 배치 장비 (6슬롯 고정, 3×2 + 일괄 해제 액션) */}
          <div className={baseStyles.sectionPanel}>
            <h2 className={baseStyles.sectionHeader}>
              <span>배치 장비</span>
              <span className={baseStyles.sectionCode}>
                LOADOUT // {equippedCount}/{equipment.length || 6} ·{" "}
                {character?.weight ?? 0}/{character?.maxWeight ?? 0}kg
              </span>
            </h2>
            <div className={styles.equipmentRow}>
              <Equipment
                characterData={characterData}
                isLoading={isLoading}
                layout="grid"
              />
              <div className={styles.equipmentActions}>
                <button
                  type="button"
                  className={styles.equipmentActionButton}
                  disabled={isBusy || equippedCount === 0}
                  onClick={handleUnequipAll}
                >
                  장비 일괄 해제
                </button>
                <button
                  type="button"
                  className={styles.equipmentActionButton}
                  disabled={isBusy || !hasOtherSurvivors}
                  onClick={handleUnequipOthers}
                >
                  {unequipOthersMutation.isPending
                    ? "해제 중…"
                    : "타 생존자 장비 해제"}
                </button>
              </div>
            </div>
          </div>

          {/* 2. 배치 가방 (아이템에 따라 동적 확장) */}
          <LoadoutDropZone
            id={BACKPACK_DROPZONE_ID}
            enabled={!isBusy}
            over={isBackpackOver}
            ready={canDropInBackpack && !isBackpackOver}
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
              <div className={styles.slotGrid}>
                <SlotManager items={filledInventoryItems}>
                  {(item) => (
                    <BackpackSlot
                      item={item}
                      index={
                        backpack.find((slot) => slot.id === item.id)?.slotIndex
                      }
                    />
                  )}
                </SlotManager>
              </div>
            )}
          </LoadoutDropZone>

          {/* 3. 거점 공용 창고 */}
          <LoadoutDropZone
            id={STASH_DROPZONE_ID}
            enabled={!isBusy}
            over={isStashOver}
            ready={canDropInStash && !isStashOver}
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
              <div className={styles.slotGrid}>
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
          </LoadoutDropZone>
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

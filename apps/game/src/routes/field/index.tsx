import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useAtom, useAtomValue } from "jotai";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "motion/react";
import { useEffect, useRef, useState } from "react";

import {
  activeDragIdAtom,
  animatingSlotIdsAtom,
  isNavigatingAtom,
  isRecommendDestinationsOpenAtom,
  shortestPathAtom,
  targetBuildingIdAtom,
  targetNodeIdAtom,
} from "@/atoms/raidAtom";
import { RetreatButton } from "@/components/combat/RetreatButton";
import { FieldBackground } from "@/components/field/FieldBackground";
import { FieldHeader } from "@/components/field/FieldHeader";
import FieldStatusSection, {
  FIELD_DISCARD_DROP_ID,
} from "@/components/field/FieldStatusSection";
import NavigationRecovery from "@/components/field/NavigationRecovery";
import Backpack from "@/components/itemSlot/Backpack";
import Equipment from "@/components/itemSlot/Equipment";
import ItemDetailModal, {
  type InspectedItem,
  type ItemDetailAction,
} from "@/components/itemSlot/ItemDetailModal";
import {
  resolveInspectedSlotDetails,
  type SlotInspectTarget,
  SlotInteractionProvider,
} from "@/components/itemSlot/SlotInteractionContext";
import { inheritMotionDiv, page } from "@/styles/theme.css";
import { useEnemyPositions } from "@/utils/hooks/useEnemyPositions";
import { useFieldCombat } from "@/utils/hooks/useFieldCombat";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";
import { useInventoryDrag } from "@/utils/hooks/useInventoryDrag";
import { useLootAction } from "@/utils/hooks/useLootAction";
import { useRaidNoise } from "@/utils/hooks/useRaidNoise";

import * as styles from "./index.css";

type FieldSearch = {
  tab?: string;
};

export const Route = createFileRoute("/field/")({
  validateSearch: (search: Record<string, unknown>): FieldSearch => {
    return {
      tab: search.tab as string | undefined,
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { tab } = useSearch({ from: "/field/" });
  const showBackpack = tab === "backpack";
  const reduceMotion = useReducedMotion();
  const exitOffset = reduceMotion ? 0 : 12;
  // 같은 데이터로 두 슬롯 목록을 함께 갱신해야 layoutId 이동 전환이 이어진다.
  const { data: characterData, isLoading, isError } = useGetCharacter();

  useRaidNoise();

  const { isCombat, setIsCombat, battleLog, navigateRaid, triggerCombat, retreatGauge,
    retreatReady, retreatExpired, retreatWindow, chooseRetreat } =
    useFieldCombat(characterData);
  const { handleDragStart, handleDragEnd, moveSlots } =
    useInventoryDrag(characterData);
  const lootAction = useLootAction();
  const [activeId, setActiveId] = useAtom(activeDragIdAtom);
  const [inspectedTarget, setInspectedTarget] =
    useState<SlotInspectTarget | null>(null);
  const suppressClickRef = useRef(false);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );
  const animatingSlotIds = useAtomValue(animatingSlotIdsAtom);
  const isSlotAnimating = animatingSlotIds.length > 0;
  const enemyPositions = useEnemyPositions(battleLog, characterData?.raw.id);

  const [isNavigating, setIsNavigating] = useAtom(isNavigatingAtom);
  const [, setTargetNodeId] = useAtom(targetNodeIdAtom);
  const [, setTargetBuildingId] = useAtom(targetBuildingIdAtom);
  const [, setShortestPath] = useAtom(shortestPathAtom);
  const [isRecommendOpen, setIsRecommendOpen] = useAtom(
    isRecommendDestinationsOpenAtom,
  );

  useEffect(() => {
    setIsNavigating(false);
    setIsCombat(false);
    setTargetNodeId(null);
    setTargetBuildingId(null);
    setShortestPath([]);
    setIsRecommendOpen(false);
  }, [
    setIsNavigating,
    setIsCombat,
    setTargetNodeId,
    setTargetBuildingId,
    setShortestPath,
    setIsRecommendOpen,
  ]);

  useEffect(() => {
    if (isCombat || tab === "backpack") {
      setIsRecommendOpen(false);
    }
  }, [isCombat, tab, setIsRecommendOpen]);

  const hideFieldInfo = isRecommendOpen && !isCombat && tab !== "backpack";
  const showDiscardDropZone =
    showBackpack && Boolean(activeId) && !isCombat && !isNavigating;

  const resetSuppressClick = () => {
    setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  };

  const handleFieldDragStart = (event: DragStartEvent) => {
    suppressClickRef.current = true;
    handleDragStart(event);
  };

  const handleFieldDragCancel = () => {
    setActiveId(null);
    resetSuppressClick();
  };

  const handleFieldDragEnd = (event: DragEndEvent) => {
    resetSuppressClick();
    if (
      showDiscardDropZone &&
      event.over?.id === FIELD_DISCARD_DROP_ID &&
      characterData
    ) {
      setActiveId(null);
      if (lootAction.isPending) return;
      const activeIdStr = event.active.id.toString();
      const invSlot = characterData.raw.inventory.find(
        (i) => i.id === activeIdStr && i.weaponMaster !== null,
      );
      if (invSlot) {
        lootAction.mutate({
          characterId: characterData.raw.id,
          action: "DISCARD_BACKPACK",
          backpackSlotIndex: invSlot.slotIndex,
        });
        return;
      }
      const eqSlot = characterData.raw.equipment.find(
        (w) => w.id === activeIdStr && w.weaponMaster !== null,
      );
      if (eqSlot) {
        lootAction.mutate({
          characterId: characterData.raw.id,
          action: "DISCARD_EQUIPMENT",
          equipmentSlotIndex: eqSlot.slotIndex,
        });
        return;
      }
      return;
    }
    handleDragEnd(event);
  };

  const inspectedItem: InspectedItem | null = (() => {
    if (!inspectedTarget) return null;
    const { baseItem, rawSlotIndex, firstEmptyEquipId, firstEmptyBackpackId } =
      resolveInspectedSlotDetails(inspectedTarget, characterData);
    const actions: ItemDetailAction[] = [];

    if (!isCombat && !isNavigating && characterData) {
      if (inspectedTarget.source === "equipment") {
        actions.push({
          label: "가방으로 해제",
          disabled: !firstEmptyBackpackId,
          onClick: () => {
            if (firstEmptyBackpackId) {
              moveSlots(inspectedTarget.item.id, firstEmptyBackpackId);
            }
            setInspectedTarget(null);
          },
        });
        if (characterData.raw.isRaiding && rawSlotIndex !== undefined) {
          actions.push({
            label: "버리기",
            tone: "danger",
            disabled: lootAction.isPending,
            onClick: () => {
              lootAction.mutate({
                characterId: characterData.raw.id,
                action: "DISCARD_EQUIPMENT",
                equipmentSlotIndex: rawSlotIndex,
              });
              setInspectedTarget(null);
            },
          });
        }
      } else {
        actions.push({
          label: "장착",
          tone: "primary",
          disabled: !firstEmptyEquipId,
          onClick: () => {
            if (firstEmptyEquipId) {
              moveSlots(inspectedTarget.item.id, firstEmptyEquipId);
            }
            setInspectedTarget(null);
          },
        });
        if (characterData.raw.isRaiding && rawSlotIndex !== undefined) {
          actions.push({
            label: "버리기",
            tone: "danger",
            disabled: lootAction.isPending,
            onClick: () => {
              lootAction.mutate({
                characterId: characterData.raw.id,
                action: "DISCARD_BACKPACK",
                backpackSlotIndex: rawSlotIndex,
              });
              setInspectedTarget(null);
            },
          });
        }
      }
    }

    return { ...baseItem, actions };
  })();

  const activeItem =
    characterData?.equipment.find((item) => item.id === activeId) ||
    characterData?.inventory.find((item) => item.id === activeId);

  return (
    <div
      className={`${page} ${styles.pageTransition}`}
      style={showBackpack ? { paddingBottom: 0 } : undefined}
    >
      <NavigationRecovery
        character={characterData}
        navigation={navigateRaid}
        triggerCombat={triggerCombat}
      />
      <FieldBackground
        isCombat={isCombat}
        battleLog={battleLog}
        enemyPositions={enemyPositions}
        characterId={characterData?.raw.id}
        navigateRaid={navigateRaid}
        triggerCombat={triggerCombat}
      />
      <AnimatePresence initial={false}>
        {showBackpack && (
          <motion.div
            key="backpackBackdrop"
            className={styles.backpackBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: reduceMotion ? 0 : 0.45,
              ease: [0.4, 0, 0.2, 1],
            }}
            style={{ pointerEvents: showBackpack ? "auto" : "none" }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>
      <DndContext
        sensors={sensors}
        onDragStart={handleFieldDragStart}
        onDragEnd={handleFieldDragEnd}
        onDragCancel={handleFieldDragCancel}
      >
        <SlotInteractionProvider
          onInspectSlot={(target) => setInspectedTarget(target)}
          isClickSuppressed={() => suppressClickRef.current}
        >
        <LayoutGroup id="inventory-group">
          <div className={styles.fieldPanels} data-backpack={showBackpack}>
            <AnimatePresence initial={false}>
              {!showBackpack && (
                <motion.div
                  className={`${inheritMotionDiv} ${styles.fieldHeader}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: exitOffset }}
                  transition={{
                    type: "spring",
                    duration: reduceMotion ? 0 : 0.45,
                    bounce: 0,
                  }}
                  key="fieldNavHeader"
                >
                  <FieldHeader isCombat={isCombat} />
                </motion.div>
              )}
              {!hideFieldInfo && (
                <motion.div
                  className={`${inheritMotionDiv} ${styles.fieldInfo}`}
                  key="fieldInfo"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1, y: 0 }}
                  exit={{ height: 0, opacity: 0, y: exitOffset }}
                  transition={{
                    duration: reduceMotion ? 0 : 0.45,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                >
                  {isCombat && (
                    <RetreatButton gauge={retreatGauge} expired={retreatExpired} countdown={retreatWindow}
                      onRetreat={retreatReady ? chooseRetreat : undefined} />
                  )}
                  <FieldStatusSection discardMode={showDiscardDropZone} />
                  <Equipment
                    characterData={characterData}
                    isLoading={isLoading}
                  />
                </motion.div>
              )}
              {showBackpack && (
                <motion.div
                  className={`${inheritMotionDiv} ${styles.backpackPanel}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    type: "spring",
                    duration: reduceMotion ? 0 : 0.45,
                    bounce: 0,
                  }}
                  style={{ overflow: isSlotAnimating ? "visible" : "hidden" }}
                  key="stash"
                >
                  <Backpack
                    characterData={characterData}
                    isLoading={isLoading}
                    isError={isError}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <DragOverlay dropAnimation={null}>
            {activeId && (
              <div className={styles.slotOverlay}>{activeItem?.name}</div>
            )}
          </DragOverlay>
        </LayoutGroup>
        </SlotInteractionProvider>
      </DndContext>
      <ItemDetailModal
        item={inspectedItem}
        onClose={() => setInspectedTarget(null)}
      />
    </div>
  );
}

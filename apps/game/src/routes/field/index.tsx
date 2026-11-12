import { DndContext, DragOverlay } from "@dnd-kit/core";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useAtom, useAtomValue } from "jotai";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "motion/react";
import { useEffect } from "react";

import {
  activeDragIdAtom,
  animatingSlotIdsAtom,
  isNavigatingAtom,
  isRecommendDestinationsOpenAtom,
  shortestPathAtom,
  targetBuildingIdAtom,
  targetNodeIdAtom,
} from "@/atoms/raidAtom";
import { FieldBackground } from "@/components/field/FieldBackground";
import { FieldHeader } from "@/components/field/FieldHeader";
import FieldStatusSection from "@/components/field/FieldStatusSection";
import NavigationRecovery from "@/components/field/NavigationRecovery";
import Backpack from "@/components/itemSlot/Backpack";
import Equipment from "@/components/itemSlot/Equipment";
import { inheritMotionDiv, page } from "@/styles/theme.css";
import { useEnemyPositions } from "@/utils/hooks/useEnemyPositions";
import { useFieldCombat } from "@/utils/hooks/useFieldCombat";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";
import { useInventoryDrag } from "@/utils/hooks/useInventoryDrag";

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
  const reduceMotion = useReducedMotion();
  const exitOffset = reduceMotion ? 0 : 12;
  // 같은 데이터로 두 슬롯 목록을 함께 갱신해야 layoutId 이동 전환이 이어진다.
  const { data: characterData, isLoading, isError } = useGetCharacter();

  const { isCombat, setIsCombat, battleLog, navigateRaid, triggerCombat } =
    useFieldCombat(characterData);
  const { handleDragStart, handleDragEnd } = useInventoryDrag(characterData);
  const activeId = useAtomValue(activeDragIdAtom);
  const animatingSlotIds = useAtomValue(animatingSlotIdsAtom);
  const isSlotAnimating = animatingSlotIds.length > 0;
  const enemyPositions = useEnemyPositions(battleLog, characterData?.raw.id);

  const [, setIsNavigating] = useAtom(isNavigatingAtom);
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

  const activeItem =
    characterData?.equipment.find((item) => item.id === activeId) ||
    characterData?.inventory.find((item) => item.id === activeId);

  return (
    <div
      className={page}
      style={tab === "backpack" ? { paddingBottom: 0 } : undefined}
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
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <LayoutGroup id="inventory-group">
          <AnimatePresence initial={false}>
            {tab !== "backpack" && (
              <motion.div
                className={inheritMotionDiv}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "100%", opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: exitOffset }}
                transition={{
                  type: "spring",
                  duration: reduceMotion ? 0 : 0.45,
                  bounce: 0,
                }}
                style={{ overflow: "hidden" }}
                key="fieldNavHeader"
              >
                <FieldHeader isCombat={isCombat} />
              </motion.div>
            )}
            {!hideFieldInfo && (
              <motion.div
                className={inheritMotionDiv}
                key="fieldInfo"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: exitOffset }}
                transition={{
                  duration: reduceMotion ? 0 : 0.24,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  flexShrink: 0,
                  overflow: isSlotAnimating ? "visible" : "hidden",
                }}
              >
                <FieldStatusSection />
                <Equipment
                  characterData={characterData}
                  isLoading={isLoading}
                />
              </motion.div>
            )}
            {tab === "backpack" && (
              <motion.div
                className={inheritMotionDiv}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "100%", opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: exitOffset }}
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
          <DragOverlay dropAnimation={null}>
            {activeId && (
              <div className={styles.slotOverlay}>{activeItem?.name}</div>
            )}
          </DragOverlay>
        </LayoutGroup>
      </DndContext>
    </div>
  );
}

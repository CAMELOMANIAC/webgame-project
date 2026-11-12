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
import { RetreatButton } from "@/components/combat/RetreatButton";
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
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
                  <FieldStatusSection />
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
      </DndContext>
    </div>
  );
}

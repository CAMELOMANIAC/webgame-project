import { DndContext, DragOverlay } from "@dnd-kit/core";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useAtom, useAtomValue } from "jotai";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useEffect } from "react";

import {
  activeDragIdAtom,
  animatingSlotIdsAtom,
  isNavigatingAtom,
  shortestPathAtom,
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
  const { data: characterData } = useGetCharacter();

  const { isCombat, setIsCombat, battleLog, navigateRaid, triggerCombat } =
    useFieldCombat(characterData);
  const { handleDragStart, handleDragEnd } = useInventoryDrag(characterData);
  const activeId = useAtomValue(activeDragIdAtom);
  const animatingSlotIds = useAtomValue(animatingSlotIdsAtom);
  const isSlotAnimating = animatingSlotIds.length > 0;
  const enemyPositions = useEnemyPositions(
    battleLog,
    characterData?.raw.id,
  );

  const [, setIsNavigating] = useAtom(isNavigatingAtom);
  const [, setTargetNodeId] = useAtom(targetNodeIdAtom);
  const [, setShortestPath] = useAtom(shortestPathAtom);

  useEffect(() => {
    setIsNavigating(false);
    setIsCombat(false);
    setTargetNodeId(null);
    setShortestPath([]);
  }, [setIsNavigating, setIsCombat, setTargetNodeId, setShortestPath]);

  const activeItem =
    characterData?.equipment.find((item) => item.id === activeId) ||
    characterData?.inventory.find((item) => item.id === activeId);

  return (
    <div className={page}>
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
                animate={{ height: "100%", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", duration: 0.45, bounce: 0 }}
                style={{ overflow: "hidden" }}
                key="fieldNavHeader"
              >
                <FieldHeader isCombat={isCombat} />
              </motion.div>
            )}
            <div className={inheritMotionDiv} key="fieldInfo">
              <FieldStatusSection />
              <Equipment />
            </div>
            {tab === "backpack" && (
              <motion.div
                className={inheritMotionDiv}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "100%", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", duration: 0.45, bounce: 0 }}
                style={{ overflow: isSlotAnimating ? "visible" : "hidden" }}
                key="stash"
              >
                <Backpack />
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

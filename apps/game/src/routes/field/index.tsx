import { DndContext, DragOverlay } from "@dnd-kit/core";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useAtom, useAtomValue } from "jotai";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useEffect } from "react";
import styled from "styled-components";

import {
  activeDragIdAtom,
  isNavigatingAtom,
  shortestPathAtom,
  targetNodeIdAtom,
} from "@/atoms/raidAtom";
import { cornerBracketsMixin, InheritMotionDiv, Page } from "@/components/Commons";
import { FieldBackground } from "@/components/FieldBackground";
import { FieldHeader } from "@/components/FieldHeader";
import FieldStatusSection from "@/components/FieldStatusSection";
import Backpack from "@/components/itemSlot/Backpack";
import Equipment from "@/components/itemSlot/Equipment";
import NavigationRecovery from "@/components/NavigationRecovery";
import { useEnemyPositions } from "@/utils/hooks/useEnemyPositions";
import { useFieldCombat } from "@/utils/hooks/useFieldCombat";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";
import { useInventoryDrag } from "@/utils/hooks/useInventoryDrag";

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
    <Page>
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
              <InheritMotionDiv
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "100%", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", duration: 0.45, bounce: 0 }}
                style={{ overflow: "hidden" }}
                key="fieldNavHeader"
              >
                <FieldHeader isCombat={isCombat} />
              </InheritMotionDiv>
            )}
            <InheritMotionDiv
              layout={isCombat ? undefined : true}
              key="fieldInfo"
            >
              <FieldStatusSection />
              <Equipment />
            </InheritMotionDiv>
            {tab === "backpack" && (
              <InheritMotionDiv
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "100%", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", duration: 0.45, bounce: 0 }}
                style={{ overflow: "hidden", zIndex: 1 }}
                key="stash"
                layout={isCombat ? undefined : true}
              >
                <Backpack />
              </InheritMotionDiv>
            )}
          </AnimatePresence>
          <DragOverlay dropAnimation={null}>
            {activeId && (
              <StyledSlotOverlay
                key={String(activeId)}
                layoutId={String(activeId)}
                $bracketTone="positive"
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 30,
                  mass: 0.8,
                }}
              >
                {activeItem?.name}
              </StyledSlotOverlay>
            )}
          </DragOverlay>
        </LayoutGroup>
      </DndContext>
    </Page>
  );
}

const StyledSlotOverlay = styled(motion.div)<{
  $bracketTone?: "default" | "positive" | "negative";
}>`
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  position: absolute;
  width: 82px;
  aspect-ratio: 1/1;
  padding: 8px;
  border: 1px solid rgba(133, 173, 255, 0.45);
  border-radius: 6px;
  color: #fafafa;
  font-size: 12px;
  font-weight: 600;
  touch-action: none;
  cursor: grabbing;
  background-color: rgba(16, 16, 19, 0.94);
  backdrop-filter: blur(8px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.45);
  z-index: 1000;
  ${cornerBracketsMixin}
`;

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
import { InheritMotionDiv, Page } from "@/components/Commons";
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

  // 마운트 시 이전 탐사 세션의 연출/이동 상태가 꼬여있다면 강제 리셋 (사망 후 복귀 시 안전장치)
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
                transition={{ type: "spring", duration: 0.5, bounce: 0 }}
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
                transition={{ type: "spring", duration: 0.5, bounce: 0 }}
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
              <SlotOverlay
                key={String(activeId)}
                layoutId={String(activeId)}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 30,
                  mass: 0.8,
                }}
              >
                {activeItem?.name}
              </SlotOverlay>
            )}
          </DragOverlay>
        </LayoutGroup>
      </DndContext>
    </Page>
  );
}

const SlotOverlay = styled(motion.div)`
  display: flex;
  position: absolute;
  width: 90px;
  aspect-ratio: 1/1;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  color: #ecf0f1;
  touch-action: none;
  cursor: grabbing;
  background-color: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(4px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
  z-index: 1000;
`;

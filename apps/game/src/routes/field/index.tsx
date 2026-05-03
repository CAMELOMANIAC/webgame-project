import { DndContext, DragOverlay } from "@dnd-kit/core";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useAtomValue } from "jotai";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useMemo } from "react";
import styled from "styled-components";

import { currentTimeAtom, flattenedTimelineAtom } from "@/atoms/globalAtom";
import { InheritMotionDiv, Page } from "@/components/Commons";
import { FieldBackground } from "@/components/FieldBackground";
import { FieldHeader } from "@/components/FieldHeader";
import FieldStatusSection from "@/components/FieldStatusSection";
import Backpack from "@/components/itemSlot/Backpack";
import Equipment from "@/components/itemSlot/Equipment";
import { useEnemyPositions } from "@/utils/hooks/useEnemyPositions";
import { useFieldCombat } from "@/utils/hooks/useFieldCombat";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";
import { useInventoryDrag } from "@/utils/hooks/useInventoryDrag";

export const Route = createFileRoute("/field/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { tab } = useSearch({ from: "/field/" });
  const { data: characterData } = useGetCharacter();

  const currentTime = useAtomValue(currentTimeAtom);
  const timeline = useAtomValue(flattenedTimelineAtom);

  const { isCombat, setIsCombat, handleEnemyClick, battleLog } = useFieldCombat(characterData);
  const { activeId, handleDragStart, handleDragEnd } = useInventoryDrag(characterData);
  const enemyPositions = useEnemyPositions(battleLog, characterData?.raw.user.nickname);

  const activeAttacks = useMemo(() => {
    return timeline.filter((e) => e.type === "ATTACK" && e.timestamp === currentTime);
  }, [timeline, currentTime]);

  const activeItem = characterData?.inventory.find((item) => item.id === activeId);

  return (
    <Page>
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
            <InheritMotionDiv layout key="fieldInfo">
              <FieldStatusSection setIsCombat={setIsCombat} />
              <button onClick={() => handleEnemyClick()} style={{ color: "white" }}>
                test
              </button>
              <Equipment />
            </InheritMotionDiv>
            {tab === "backpack" && (
              <InheritMotionDiv
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "100%", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", duration: 0.5, bounce: 0 }}
                style={{ overflow: "hidden" }}
                key="stash"
                layout
              >
                <Backpack />
                <DragOverlay dropAnimation={null}>
                  <AnimatePresence>
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
                  </AnimatePresence>
                </DragOverlay>
              </InheritMotionDiv>
            )}
          </AnimatePresence>
        </LayoutGroup>
        <FieldBackground
          isCombat={isCombat}
          battleLog={battleLog}
          enemyPositions={enemyPositions}
          activeAttacks={activeAttacks}
          characterNickname={characterData?.raw.user.nickname}
        />
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

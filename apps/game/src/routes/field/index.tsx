import { DndContext, DragOverlay } from "@dnd-kit/core";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import type { BattleEvent } from "@webgame/types";
import { useAtom, useAtomValue } from "jotai";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useEffect, useMemo } from "react";
import styled from "styled-components";

import { currentTimeAtom, displayEventsAtom } from "@/atoms/globalAtom";
import { currentNodeIdAtom, isNavigatingAtom } from "@/atoms/raidAtom";
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

import mapData from "../../assets/map_graph.json";

export const Route = createFileRoute("/field/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { tab } = useSearch({ from: "/field/" });
  const { data: characterData } = useGetCharacter();

  const currentTime = useAtomValue(currentTimeAtom);
  const displayEvents = useAtomValue(displayEventsAtom);

  const { isCombat, setIsCombat, handleEnemyClick, battleLog } = useFieldCombat(characterData);
  const { activeId, handleDragStart, handleDragEnd } = useInventoryDrag(characterData);
  const enemyPositions = useEnemyPositions(battleLog, characterData?.raw.user.nickname);

  const [currentNodeId] = useAtom(currentNodeIdAtom);
  const [isNavigating] = useAtom(isNavigatingAtom);

  // 1. 노드 이동 완료 시 인카운터(전투) 자동 시작
  useEffect(() => {
    if (isNavigating) return;
    if (isCombat) return;
    if (!characterData?.raw.id) return;

    // 도착한 노드가 건물에 연결된 노드인지 검사
    const buildings = (mapData.buildings || []) as Array<{ roadNodeId: number }>;
    const isAtBuilding = buildings.some((b) => b.roadNodeId === currentNodeId);

    if (isAtBuilding) {
      console.log(`[Raid] Arrived at building node #${currentNodeId}. Triggering battle!`);
      handleEnemyClick();
    }
  }, [isNavigating, currentNodeId, isCombat, characterData, handleEnemyClick]);

  const activeAttacks = useMemo(() => {
    return displayEvents.filter((e: BattleEvent) => e.type === "ATTACK");
  }, [displayEvents]);

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
      </DndContext>
      <FieldBackground
        isCombat={isCombat}
        battleLog={battleLog}
        enemyPositions={enemyPositions}
        activeAttacks={activeAttacks}
        currentTime={currentTime}
        characterNickname={characterData?.raw.user.nickname}
      />
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

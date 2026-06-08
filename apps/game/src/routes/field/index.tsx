import { DndContext, DragOverlay } from "@dnd-kit/core";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import type { BattleEvent } from "@webgame/types";
import { useAtom, useAtomValue } from "jotai";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useEffect, useMemo, useRef } from "react";
import styled from "styled-components";

import { currentTimeAtom, displayEventsAtom } from "@/atoms/globalAtom";
import { activeDragIdAtom, currentNodeIdAtom, isInventoryDirtyAtom, isNavigatingAtom } from "@/atoms/raidAtom";
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
import { useSyncItemsMutation } from "@/utils/hooks/useSyncItemsMutation";

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

  const currentTime = useAtomValue(currentTimeAtom);
  const displayEvents = useAtomValue(displayEventsAtom);

  const { isCombat, setIsCombat, handleArriveNode, battleLog, isArrivePending } = useFieldCombat(characterData);
  const { handleDragStart, handleDragEnd } = useInventoryDrag(characterData);
  const activeId = useAtomValue(activeDragIdAtom);
  const enemyPositions = useEnemyPositions(battleLog, characterData?.raw.user.nickname);

  const [currentNodeId] = useAtom(currentNodeIdAtom);
  const [isNavigating] = useAtom(isNavigatingAtom);
  const [isInventoryDirty, setIsInventoryDirty] = useAtom(isInventoryDirtyAtom);
  const syncMutation = useSyncItemsMutation();

  // 중복 요청 및 무한 루프 방지를 위한 마지막 보고 노드 기록 Ref
  const lastReportedNodeRef = useRef<number | null>(null);

  // 1. 노드 이동 완료 시 서버에 도착 알림 및 인카운터 트리거 판정 요청
  useEffect(() => {
    if (isNavigating) {
      // 주행 중일 때 기록 초기화 (도착 시 1회 발송 보장)
      lastReportedNodeRef.current = null;
      return;
    }
    if (isCombat) return;
    if (!characterData?.raw.id) return;
    if (lastReportedNodeRef.current === currentNodeId) return;

    console.log(`[Raid] Arrived at node #${currentNodeId}. Querying server encounter...`);
    lastReportedNodeRef.current = currentNodeId;
    handleArriveNode(currentNodeId);
  }, [isNavigating, currentNodeId, isCombat, characterData, handleArriveNode]);

  // 1.1. 네비게이션 시작 시 변경된 인벤토리가 있다면 백그라운드 동기화 요청
  useEffect(() => {
    if (isNavigating && isInventoryDirty && characterData?.raw.id) {
      console.log("[Raid] Navigation started. Syncing dirty inventory with server in background...");
      setIsInventoryDirty(false); // 플래그 초기화
      syncMutation.mutate({
        characterId: characterData.raw.id,
        data: characterData,
      });
    }
  }, [isNavigating, isInventoryDirty, characterData, syncMutation, setIsInventoryDirty]);

  const activeAttacks = useMemo(() => {
    return displayEvents.filter((e: BattleEvent) => e.type === "ATTACK");
  }, [displayEvents]);

  const activeItem = characterData?.equipment.find((item) => item.id === activeId)
    || characterData?.inventory.find((item) => item.id === activeId);

  return (
    <Page>
      <FieldBackground
        isCombat={isCombat}
        battleLog={battleLog}
        enemyPositions={enemyPositions}
        activeAttacks={activeAttacks}
        currentTime={currentTime}
        characterNickname={characterData?.raw.user.nickname}
        isArrivePending={isArrivePending}
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
                style={{ overflow: "hidden", zIndex: 1 }}
                key="stash"
                layout
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

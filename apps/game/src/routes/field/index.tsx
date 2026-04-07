import { DndContext, type DragEndEvent, DragOverlay, type DragStartEvent, type UniqueIdentifier } from "@dnd-kit/core";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import type { BattleLog } from "@webgame/types";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useEffect, useState } from "react";
import styled from "styled-components";

import CombatLog from "@/components/CombatLog";
import { InheritMotionDiv, Page } from "@/components/Commons";
import EnemyUnit from "@/components/EnemyUnit";
import FieldNavTargetSection from "@/components/FieldNavTargetSection";
import FieldStatusSection from "@/components/FieldStatusSection";
import Backpack from "@/components/itemSlot/Backpack";
import Equipment from "@/components/itemSlot/Equipment";
import type { CharacterData } from "@/utils/hooks/useGetCharacter";

import compass from "../../assets/compass.svg";
import { useBattlePlayer } from "../../utils/hooks/useBattlePlayer";
import { useGetCharacter } from "../../utils/hooks/useGetCharacter";
import { useStartMonsterBattle } from "../../utils/hooks/useStartMonsterBattle";

export const Route = createFileRoute("/field/")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { tab } = useSearch({ from: "/field/" });
  const [isCombat, setIsCombat] = useState<boolean>(false);

  const { data: characterData } = useGetCharacter();

  // 전투 관련 로직
  const [battleLog, setBattleLog] = useState<BattleLog | null>(null);
  const startMonsterBattle = useStartMonsterBattle();
  const { start: startPlayback } = useBattlePlayer(battleLog);

  const handleEnemyClick = () => {
    if (!characterData?.raw.id) return;
    startMonsterBattle.mutate(
      { characterId: characterData.raw.id, level: 1 },
      {
        onSuccess: (log) => {
          setBattleLog(log);
          setIsCombat(true);
        },
      },
    );
  };

  useEffect(() => {
    if (battleLog && isCombat) startPlayback();
  }, [battleLog, isCombat, startPlayback]);

  useEffect(() => {
    if (isCombat) {
      //전투 시작시 field로 이동
      navigate({ to: "/field" });
    }
  }, [isCombat, navigate]);

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  // 드래그 시작 시 ID 저장
  const handleDragStart = (event: DragStartEvent) => {
    if (event.active.id.toString().includes("empty")) {
      setActiveId(null);
      return;
    }
    setActiveId(event.active.id);
  };

  // 드래그 종료 시 로직 (아이템 스왑 포함)
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !characterData) return;

    const activeIdStr = active.id.toString();
    const overIdStr = over.id.toString();

    if (activeIdStr === overIdStr) return;

    // 인벤토리 아이템 스왑 로직
    queryClient.setQueryData(["character", characterData.raw.userId], (old: CharacterData | undefined) => {
      if (!old) return old;

      const newInventory = [...old.inventory];
      const newRawInventory = [...old.raw.inventory];

      const activeIndex = newInventory.findIndex((item) => item.id === activeIdStr);
      const overIndex = newInventory.findIndex((item) => item.id === overIdStr);

      if (activeIndex === -1 || overIndex === -1) return old;

      // Swap items
      [newInventory[activeIndex], newInventory[overIndex]] = [newInventory[overIndex], newInventory[activeIndex]];
      [newRawInventory[activeIndex], newRawInventory[overIndex]] = [
        newRawInventory[overIndex],
        newRawInventory[activeIndex],
      ];

      // Update slotIndex for server sync later
      newRawInventory[activeIndex] = { ...newRawInventory[activeIndex], slotIndex: activeIndex };
      newRawInventory[overIndex] = { ...newRawInventory[overIndex], slotIndex: overIndex };

      return {
        ...old,
        inventory: newInventory,
        raw: {
          ...old.raw,
          inventory: newRawInventory,
        },
      };
    });
  };

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
                key="fieldNavTargetSection"
              >
                <AnimatePresence initial={false}>
                  {isCombat ? (
                    <InheritMotionDiv
                      initial={{ x: "100%", opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: "-100%", opacity: 0 }}
                      transition={{ type: "spring", duration: 0.5, bounce: 0 }}
                      style={{ overflow: "hidden", position: "absolute" }}
                      key="combatInfo"
                    >
                      <TopLayout>
                        <CombatLog />
                      </TopLayout>
                    </InheritMotionDiv>
                  ) : (
                    <InheritMotionDiv
                      initial={{ x: "-100%", opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: "100%", opacity: 0 }}
                      transition={{ type: "spring", duration: 0.5, bounce: 0 }}
                      style={{ overflow: "hidden", position: "absolute" }}
                      key="fieldNavTargetSection"
                    >
                      <TopLayout>
                        <FieldNavTargetSection />
                      </TopLayout>
                    </InheritMotionDiv>
                  )}
                </AnimatePresence>
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
        <BackgroundContainer>
          <CompassImage src={compass} />
          <div onClick={handleEnemyClick} style={{ cursor: "pointer" }}>
            <EnemyUnit name="TEST-01" left={"45vw"} top="55vh" />
          </div>
        </BackgroundContainer>
      </DndContext>
    </Page>
  );
}

const TopLayout = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  flex: 1;
  width: 100%;
  gap: 16px;
  padding: 24px 24px 0;
`;

const CompassImage = styled.img`
  width: 48px;
  height: 48px;
  object-fit: contain;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
`;

const BackgroundContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  overflow: hidden;
`;

const SlotOverlay = styled(motion.div)`
  display: flex;
  position: relative;
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
  pointer-events: none;
`;

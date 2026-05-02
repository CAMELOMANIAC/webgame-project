import { DndContext, type DragEndEvent, DragOverlay, type DragStartEvent, type UniqueIdentifier } from "@dnd-kit/core";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";

import { battleLogAtom, currentTimeAtom, flattenedTimelineAtom } from "@/atoms/globalAtom";
import CombatLog from "@/components/CombatLog";
import { InheritMotionDiv, Page } from "@/components/Commons";
import EnemyUnit from "@/components/EnemyUnit";
import FieldNavTargetSection from "@/components/FieldNavTargetSection";
import FieldStatusSection from "@/components/FieldStatusSection";
import Backpack from "@/components/itemSlot/Backpack";
import Equipment from "@/components/itemSlot/Equipment";
import RetreadButton from "@/components/RetreadButton";
import type { CharacterData } from "@/utils/hooks/useGetCharacter";

import compass from "../../assets/compass.svg";
import { useBattleData } from "../../utils/hooks/useBattleData";
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
  const startMonsterBattle = useStartMonsterBattle();
  const { setBattleLog } = useBattleData();

  const setTime = useSetAtom(currentTimeAtom);
  const [battleLog] = useAtom(battleLogAtom);
  const currentTime = useAtomValue(currentTimeAtom);
  const timeline = useAtomValue(flattenedTimelineAtom);

  const activeAttacks = useMemo(() => {
    return timeline.filter((e) => e.type === "ATTACK" && e.timestamp === currentTime);
  }, [timeline, currentTime]);

  // 전투 타이머 로직
  useEffect(() => {
    if (!isCombat || !battleLog) return;
    const timer = setInterval(() => {
      setTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isCombat, battleLog, setTime]);

  const handleEnemyClick = () => {
    if (isCombat || !characterData?.raw.id) return;
    startMonsterBattle.mutate(
      { characterId: characterData.raw.id, level: 1 },
      {
        onSuccess: (log) => {
          setBattleLog(log);
          setTime(0); // 시간 초기화
          setIsCombat(true);
        },
      },
    );
  };

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

  // 드래그 종료 시 로직 (아이템 스왑 및 교환 포함)
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !characterData) return;

    const activeIdStr = active.id.toString();
    const overIdStr = over.id.toString();

    if (activeIdStr === overIdStr) return;

    queryClient.setQueryData(["character", characterData.raw.userId], (old: CharacterData | undefined) => {
      if (!old) return old;

      const newEquipment = [...old.equipment];
      const newInventory = [...old.inventory];
      const newRawInventory = [...old.raw.inventory];

      const activeEquipIdx = newEquipment.findIndex((i) => i.id === activeIdStr);
      const overEquipIdx = newEquipment.findIndex((i) => i.id === overIdStr);
      const activeInvIdx = newInventory.findIndex((i) => i.id === activeIdStr);
      const overInvIdx = newInventory.findIndex((i) => i.id === overIdStr);

      // 1. Equipment 내 정렬
      if (activeEquipIdx !== -1 && overEquipIdx !== -1) {
        [newEquipment[activeEquipIdx], newEquipment[overEquipIdx]] = [
          newEquipment[overEquipIdx],
          newEquipment[activeEquipIdx],
        ];
        return { ...old, equipment: newEquipment };
      }

      // 2. Inventory 내 정렬
      if (activeInvIdx !== -1 && overInvIdx !== -1) {
        [newInventory[activeInvIdx], newInventory[overInvIdx]] = [newInventory[overInvIdx], newInventory[activeInvIdx]];
        [newRawInventory[activeInvIdx], newRawInventory[overInvIdx]] = [
          newRawInventory[overInvIdx],
          newRawInventory[activeInvIdx],
        ];
        return { ...old, inventory: newInventory, raw: { ...old.raw, inventory: newRawInventory } };
      }

      // 3. Inventory -> Equipment
      if (activeInvIdx !== -1 && overEquipIdx !== -1) {
        const itemToEquip = newInventory[activeInvIdx];
        const itemToUnequip = newEquipment[overEquipIdx];

        newEquipment[overEquipIdx] = itemToEquip;
        newInventory[activeInvIdx] = itemToUnequip;
        // RawInventory 동기화 (간략화)
        return { ...old, equipment: newEquipment, inventory: newInventory };
      }

      // 4. Equipment -> Inventory
      if (activeEquipIdx !== -1 && overInvIdx !== -1) {
        const itemToUnequip = newEquipment[activeEquipIdx];
        const itemToEquip = newInventory[overInvIdx];

        newEquipment[activeEquipIdx] = itemToEquip;
        newInventory[overInvIdx] = itemToUnequip;
        return { ...old, equipment: newEquipment, inventory: newInventory };
      }

      return old;
    });
  };

  const activeItem = characterData?.inventory.find((item) => item.id === activeId);

  const enemyPositions = useMemo(() => {
    if (!battleLog) return new Map();
    const map = new Map();
    const centerX = 50; 
    const centerY = 50;
    const maxRadius = 40; 
    const rotationOffset = Math.random() * 2 * Math.PI; // 랜덤 회전 오프셋 추가

    battleLog.initialState.players
      .filter(
        (p) =>
          p.teamId !==
          battleLog.initialState.players.find((player) => player.id === characterData?.raw.user.nickname)?.teamId
      )
      .forEach((enemy, index, arr) => {
        const angle = (index / arr.length) * 2 * Math.PI + rotationOffset;
        const radius = 20 + Math.random() * (maxRadius - 20);
        map.set(enemy.id, {
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
        });
      });
    return map;
  }, [battleLog, characterData?.raw.user.nickname]);

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
                        <RetreadButton gauge={0} />
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
        <BackgroundContainer>
          <CompassImage src={compass} />
          {isCombat &&
            battleLog?.initialState.players
              .filter(
                (p) =>
                  p.teamId !==
                  battleLog.initialState.players.find((player) => player.id === characterData?.raw.user.nickname)?.teamId
              )
              .map((enemy) => {
                const pos = enemyPositions.get(enemy.id);
                if (!pos) return null;
                const isAttacking = activeAttacks.some((a) => a.type === "ATTACK" && a.actorId === enemy.id);
                return (
                  <motion.div
                    key={`enemy-${enemy.id}`}
                    initial={false}
                    animate={{
                      x: isAttacking ? (50 - pos.x) * 1.5 : 0,
                      y: isAttacking ? (50 - pos.y) * 1.5 : 0,
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    style={{ position: "absolute", left: `${pos.x}%`, top: `${pos.y}%`, zIndex: 10 }}
                  >
                    <EnemyUnit name={enemy.name} left="0" top="0" />
                  </motion.div>
                );
              })}
          <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: -1 }}>
            {activeAttacks.map((attack) => {
              if (attack.type !== "ATTACK") return null;
              const actorPos =
                attack.actorId === characterData?.raw.user.nickname
                  ? { x: 50, y: 50 }
                  : enemyPositions.get(attack.actorId);
              const targetPos =
                attack.targetId === characterData?.raw.user.nickname
                  ? { x: 50, y: 50 }
                  : enemyPositions.get(attack.targetId);

              if (!actorPos || !targetPos) return null;

              return (
                <motion.line
                  key={attack.id}
                  x1={`${actorPos.x}%`}
                  y1={`${actorPos.y}%`}
                  x2={`${targetPos.x}%`}
                  y2={`${targetPos.y}%`}
                  stroke="#ff716c"
                  strokeWidth="2"
                  initial={{ pathLength: 0, opacity: 1 }}
                  animate={{ pathLength: 1, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                />
              );
            })}
          </svg>
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
  //pointer-events: none;
`;

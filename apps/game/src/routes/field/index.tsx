import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import type { BattleLog } from "@webgame/types";
import { AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import styled from "styled-components";

import CombatLog from "@/components/CombatLog";
import { InheritMotionDiv, Page } from "@/components/Commons";
import EnemyUnit from "@/components/EnemyUnit";
import FieldNavTargetSection from "@/components/FieldNavTargetSection";
import FieldStatusSection from "@/components/FieldStatusSection";
import Backpack from "@/components/itemSlot/Backpack";
import Equipment from "@/components/itemSlot/Equipment";

import compass from "../../assets/compass.svg";
import { useBattlePlayer } from "../../utils/hooks/useBattlePlayer";
import { useGetCharacter } from "../../utils/hooks/useGetCharacter";
import { useStartMonsterBattle } from "../../utils/hooks/useStartMonsterBattle";

export const Route = createFileRoute("/field/")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
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
    console.log(characterData);
  }, [characterData]);

  useEffect(() => {
    if (battleLog && isCombat) startPlayback();
  }, [battleLog, isCombat, startPlayback]);

  useEffect(() => {
    if (isCombat) {
      //전투 시작시 field로 이동
      navigate({ to: "/field" });
    }
  }, [isCombat, navigate]);

  return (
    <Page>
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
          </InheritMotionDiv>
        )}
      </AnimatePresence>
      <BackgroundContainer>
        <CompassImage src={compass} />
        <div onClick={handleEnemyClick} style={{ cursor: "pointer" }}>
          <EnemyUnit name="TEST-01" left={"45vw"} top="55vh" />
        </div>
      </BackgroundContainer>
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

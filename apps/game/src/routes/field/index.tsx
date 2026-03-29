import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import type { Item } from "@webgame/types";
import { AnimatePresence } from "motion/react";
import { dagger, greatsword, healingWeapon, staff } from "node_modules/@webgame/types/src/weapon";
import { useEffect, useState } from "react";
import { RiWeightLine } from "react-icons/ri";
import { SlEnergy } from "react-icons/sl";
import styled from "styled-components";

import CombatInfo from "@/components/CombatInfo";
import { FieldWidget, InheritMotionDiv, Page } from "@/components/Commons";
import FieldCharacterInfo from "@/components/FieldCharacterInfo";
import FieldNavTargetSection from "@/components/FieldNavTargetSection";
import Equipment from "@/components/itemSlot/Equipment";
import Stash from "@/components/itemSlot/Stash";

import compass from "../../assets/compass.svg";

export const Route = createFileRoute("/field/")({
  component: RouteComponent,
});

const emptyItem: Item = {
  id: "",
  name: "",
  weight: 0,
  value: 0,
};

const emptyItemsArray = Array(32).fill(emptyItem);

function RouteComponent() {
  const navigate = useNavigate();
  const { tab } = useSearch({ from: "/field/" });
  const [isCombat, setIsCombat] = useState<boolean>(false);

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
                    <CombatInfo />
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
          <StatusSection>
            <Row>
              <FieldCharacterInfo />
            </Row>
            <Column>
              <FieldWidget>
                <Row>
                  <Column $gap="0px" onClick={() => setIsCombat((prev) => !prev)}>
                    <WidgetLabel>ENERGY</WidgetLabel>
                    <CapacityText>10/12</CapacityText>
                  </Column>
                  <Column $flexGrow={0}>
                    <EnergyIcon />
                  </Column>
                </Row>
              </FieldWidget>
              <FieldWidget>
                <Row>
                  <Column $gap="0px">
                    <WidgetLabel>WEIGHT</WidgetLabel>
                    <CapacityText>45/60 kg</CapacityText>
                  </Column>
                  <Column $flexGrow={0}>
                    <WeightIcon />
                  </Column>
                </Row>
              </FieldWidget>
            </Column>
          </StatusSection>
          <Equipment initialItems={[healingWeapon, dagger, greatsword, staff, emptyItem, emptyItem]} />
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
            <Stash initialItems={emptyItemsArray} />
          </InheritMotionDiv>
        )}
      </AnimatePresence>
      <BackgroundContainer>
        <CompassImage src={compass} />
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

const StatusSection = styled.section`
  display: flex;
  flex-direction: row;
  width: 100%;
  gap: 16px;
  padding: 24px 24px 0;
`;

const Row = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
  flex: 1;
  width: 100%;
  gap: 8px;
`;

type ColumnProps = {
  $flexGrow?: number;
  $gap?: string;
};
const Column = styled.div<ColumnProps>`
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex: ${(props) => props.$flexGrow ?? 1};
  width: 100%;
  gap: ${(props) => props.$gap ?? "8px"};
`;

const WidgetLabel = styled.p`
  font-size: 8px;
  font-weight: 300;
  color: #adaaaa;
`;

const EnergyIcon = styled(SlEnergy)`
  color: #ff7162;
`;

const WeightIcon = styled(RiWeightLine)`
  color: #b8ffb9;
`;

const CapacityText = styled.p`
  font-size: 12px;
  font-weight: 600;
  color: white;
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

import { createFileRoute, useSearch } from "@tanstack/react-router";
import type { Item } from "@webgame/types";
import { AnimatePresence } from "motion/react";
import { dagger, greatsword, healingWeapon, staff } from "node_modules/@webgame/types/src/weapon";
import { RiWeightLine } from "react-icons/ri";
import { SlEnergy } from "react-icons/sl";
import styled from "styled-components";

import { FieldWidget, InheritMotionDiv, Page } from "@/components/Commons";
import FieldCharacterInfo from "@/components/FieldCharacterInfo";
import FieldNavTargetSection from "@/components/FieldNavTargetSection";
import Equipment from "@/components/itemSlot/Equipment";
import Stash from "@/components/itemSlot/Stash";

export const Route = createFileRoute("/field/")({
  component: RouteComponent,
});

const emptyItem: Item = {
  id: "",
  name: "",
  weight: 0,
  value: 0,
};

const emptyItemsArray = Array(20).fill(emptyItem);

function RouteComponent() {
  const { tab } = useSearch({ from: "/field/" });
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
            <TopLayout>
              <FieldNavTargetSection></FieldNavTargetSection>
            </TopLayout>
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
                  <Column $gap="0px">
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

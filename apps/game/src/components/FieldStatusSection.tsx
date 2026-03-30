import { RiWeightLine } from "react-icons/ri";
import { SlEnergy } from "react-icons/sl";
import styled from "styled-components";

import { FieldWidget } from "@/components/Commons";
import FieldCharacterInfo from "@/components/FieldCharacterInfo";

interface FieldStatusSectionProps {
  setIsCombat: React.Dispatch<React.SetStateAction<boolean>>;
}

const FieldStatusSection = ({ setIsCombat }: FieldStatusSectionProps) => {
  return (
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
  );
};

export default FieldStatusSection;

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

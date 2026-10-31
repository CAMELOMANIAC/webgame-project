import { useAtomValue } from "jotai";
import { RiWeightLine } from "react-icons/ri";
import { SlEnergy } from "react-icons/sl";
import styled from "styled-components";

import { battleLogAtom, processedEventsAtom } from "@/atoms/globalAtom";
import { FieldWidget } from "@/components/Commons";
import FieldCharacterInfo from "@/components/FieldCharacterInfo";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";

const FieldStatusSection = () => {
  const { data } = useGetCharacter();
  const log = useAtomValue(battleLogAtom);
  const events = useAtomValue(processedEventsAtom);
  const player = log?.initialState.players[0];
  let stamina = player?.stamina ?? data?.raw.stamina;
  for (const event of events)
    if (event.type === "STAMINA_CHANGE" && event.playerId === player?.id)
      stamina = event.currentStamina;
  const weight = data
    ? data.raw.equipment.reduce(
        (sum, item) => sum + (item.weaponMaster?.weight ?? 0),
        0,
      ) +
      data.raw.inventory.reduce(
        (sum, item) => sum + (item.weaponMaster?.weight ?? 0) * item.quantity,
        0,
      )
    : undefined;
  return (
    <StatusSection>
      <Row>
        <FieldCharacterInfo />
      </Row>
      <Column>
        <FieldWidget>
          <Row>
            <Column $gap="0px">
              <WidgetLabel>ENERGY</WidgetLabel>
              <CapacityText>
                {stamina ?? "—"}/
                {player?.maxStamina ?? data?.raw.maxStamina ?? "—"}
              </CapacityText>
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
              <CapacityText>
                {player?.weight ?? weight ?? "—"}/
                {player?.maxWeight ?? data?.raw.maxWeight ?? "—"} kg
              </CapacityText>
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

import { useAtomValue } from "jotai";
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
    <StyledStatusSection>
      <StyledPrimaryCol>
        <FieldCharacterInfo />
      </StyledPrimaryCol>
      <StyledSideCol>
        <StyledCompactWidget $bracketTone="default">
          <StyledCellHeader>
            <StyledWidgetLabel>ENERGY // 기력</StyledWidgetLabel>
            <StyledMetricDot $tone="positive" />
          </StyledCellHeader>
          <StyledCapacityText>
            {stamina ?? "—"} /{" "}
            {player?.maxStamina ?? data?.raw.maxStamina ?? "—"}
          </StyledCapacityText>
        </StyledCompactWidget>
        <StyledCompactWidget $bracketTone="default">
          <StyledCellHeader>
            <StyledWidgetLabel>WEIGHT // 중량</StyledWidgetLabel>
            <StyledMetricDot $tone="neutral" />
          </StyledCellHeader>
          <StyledCapacityText>
            {player?.weight ?? weight ?? "—"} /{" "}
            {player?.maxWeight ?? data?.raw.maxWeight ?? "—"} kg
          </StyledCapacityText>
        </StyledCompactWidget>
      </StyledSideCol>
    </StyledStatusSection>
  );
};

export default FieldStatusSection;

const StyledStatusSection = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  width: 100%;
  gap: 8px;
  padding: 12px 16px 0;
`;

const StyledPrimaryCol = styled.div`
  display: flex;
  min-width: 0;
`;

const StyledSideCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
`;

const StyledCompactWidget = styled(FieldWidget)`
  padding: 10px 12px;
  gap: 4px;
`;

const StyledCellHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
`;

const StyledWidgetLabel = styled.p`
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  color: #71717a;
`;

const StyledMetricDot = styled.span<{ $tone: "positive" | "neutral" }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: ${(props) =>
    props.$tone === "positive" ? "#85adff" : "#71717a"};
`;

const StyledCapacityText = styled.p`
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  color: #fafafa;
  font-variant-numeric: tabular-nums;
`;

import { useAtomValue } from "jotai";
import { useMemo } from "react";
import styled from "styled-components";

import { battleLogAtom, processedEventsAtom } from "@/atoms/globalAtom";
import { FieldWidget } from "@/components/Commons";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";

const SEGMENT_COUNT = 10;

const FieldCharacterInfo = () => {
  const battleLog = useAtomValue(battleLogAtom);
  const processedEvents = useAtomValue(processedEventsAtom);
  const { data: characterData } = useGetCharacter();

  const stats = useMemo(() => {
    if (battleLog) {
      const player = battleLog.initialState.players[0];
      let hp = player.hp;
      let stamina = player.stamina;

      for (const event of processedEvents) {
        if (
          (event.type === "DAMAGE" || event.type === "HEAL") &&
          event.targetId === player.id
        ) {
          hp = event.remainingHp;
        }
        if (event.type === "STAMINA_CHANGE" && event.playerId === player.id) {
          stamina = event.currentStamina;
        }
      }
      return {
        hp,
        stamina,
        maxHp: player.maxHp,
        maxStamina: player.maxStamina,
        name: player.name,
      };
    }

    if (characterData) {
      return {
        hp: characterData.raw.hp,
        stamina: characterData.raw.stamina,
        maxHp: characterData.raw.maxHp,
        maxStamina: characterData.raw.maxStamina,
        name: characterData.raw.displayName,
      };
    }

    return null;
  }, [battleLog, processedEvents, characterData]);

  if (!stats) return null;

  const hpRatio = stats.maxHp > 0 ? Math.max(0, stats.hp / stats.maxHp) : 0;
  const staminaRatio =
    stats.maxStamina > 0 ? Math.max(0, stats.stamina / stats.maxStamina) : 0;
  const filledHpSegments = Math.ceil(hpRatio * SEGMENT_COUNT);
  const filledStaminaSegments = Math.ceil(staminaRatio * SEGMENT_COUNT);
  const isCritical = !!battleLog || hpRatio <= 0.3;

  return (
    <StyledContainer $bracketTone={isCritical ? "negative" : "positive"}>
      <StyledHeaderRow>
        <StyledName>{stats.name}</StyledName>
        <StyledStatusTag $combat={!!battleLog} $defeated={stats.hp <= 0}>
          {battleLog
            ? stats.hp <= 0
              ? "DEFEATED"
              : "IN COMBAT"
            : "STANDBY"}
        </StyledStatusTag>
      </StyledHeaderRow>

      <StyledGaugeSection>
        <StyledLabelRow>
          <StyledMetricLabel>VIT // HP</StyledMetricLabel>
          <StyledMetricValue $critical={hpRatio <= 0.3}>
            {stats.hp}/{stats.maxHp}
          </StyledMetricValue>
        </StyledLabelRow>
        <StyledSegmentTrack>
          {Array.from({ length: SEGMENT_COUNT }).map((_, idx) => (
            <StyledSegmentCell
              key={`hp-${idx}`}
              $active={idx < filledHpSegments}
              $tone={hpRatio <= 0.3 || battleLog ? "negative" : "positive"}
            />
          ))}
        </StyledSegmentTrack>
      </StyledGaugeSection>

      <StyledGaugeSection>
        <StyledLabelRow>
          <StyledMetricLabel>STM // 기력</StyledMetricLabel>
          <StyledMetricValue>
            {stats.stamina}/{stats.maxStamina}
          </StyledMetricValue>
        </StyledLabelRow>
        <StyledSegmentTrack>
          {Array.from({ length: SEGMENT_COUNT }).map((_, idx) => (
            <StyledSegmentCell
              key={`stm-${idx}`}
              $active={idx < filledStaminaSegments}
              $tone="positive"
            />
          ))}
        </StyledSegmentTrack>
      </StyledGaugeSection>
    </StyledContainer>
  );
};

export default FieldCharacterInfo;

const StyledContainer = styled(FieldWidget)`
  flex: 1;
  flex-direction: column;
  justify-content: space-between;
  gap: 8px;
  padding: 12px;
`;

const StyledHeaderRow = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
`;

const StyledName = styled.p`
  font-size: 13px;
  font-weight: 700;
  color: #fafafa;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledStatusTag = styled.span<{ $combat: boolean; $defeated: boolean }>`
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  padding: 2px 5px;
  border-radius: 4px;
  color: ${(props) =>
    props.$combat || props.$defeated ? "#ff7162" : "#85adff"};
  background: ${(props) =>
    props.$combat || props.$defeated
      ? "rgba(255, 113, 98, 0.14)"
      : "rgba(133, 173, 255, 0.12)"};
`;

const StyledGaugeSection = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 4px;
`;

const StyledLabelRow = styled.div`
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const StyledMetricLabel = styled.p`
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  color: #71717a;
`;

const StyledMetricValue = styled.p<{ $critical?: boolean }>`
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  color: ${(props) => (props.$critical ? "#ff7162" : "#fafafa")};
  font-variant-numeric: tabular-nums;
`;

const StyledSegmentTrack = styled.div`
  display: grid;
  grid-template-columns: repeat(${SEGMENT_COUNT}, 1fr);
  gap: 2px;
  width: 100%;
`;

const StyledSegmentCell = styled.span<{
  $active: boolean;
  $tone: "positive" | "negative";
}>`
  height: 6px;
  border-radius: 1px;
  background-color: ${(props) =>
    !props.$active
      ? "#27272a"
      : props.$tone === "negative"
        ? "#ff7162"
        : "#85adff"};
  transition: background-color 0.2s ease;
`;

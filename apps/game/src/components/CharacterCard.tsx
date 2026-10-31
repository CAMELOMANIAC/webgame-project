import { motion } from "motion/react";
import styled from "styled-components";

import { cornerBracketsMixin } from "@/components/Commons";
import type { CharacterResponse } from "@/utils/hooks/useGetCharacter";

interface CharacterCardProps {
  character: CharacterResponse | undefined;
  onRaidAction: () => void;
  disabled?: boolean;
  pendingResult?: boolean;
}

export function CharacterCard({
  character,
  onRaidAction,
  disabled,
  pendingResult,
}: CharacterCardProps) {
  const isRaiding = !!character?.isRaiding;
  const hpRatio =
    character && character.maxHp > 0 ? character.hp / character.maxHp : 1;
  const isCriticalHp = hpRatio <= 0.3;

  return (
    <StyledCardContainer $bracketTone={isRaiding ? "negative" : "positive"}>
      <StyledHeaderRow>
        <div>
          <StyledTelemetryCode>
            OPERATOR // #{character?.id.slice(0, 8) ?? "--------"}
          </StyledTelemetryCode>
          <StyledNickname>{character?.displayName || "미확인 개체"}</StyledNickname>
        </div>
        <StyledStatusBadge $raiding={isRaiding}>
          <StyledStatusDot $raiding={isRaiding} />
          {isRaiding ? "탐사 진행 중" : "출격 대기"}
        </StyledStatusBadge>
      </StyledHeaderRow>

      {/* 1px 밀착 데이터 그리드 (Exposed Hairline Telemetry Grid) */}
      <StyledTelemetryGrid>
        <StyledGridCell>
          <StyledCellHeader>
            <StyledStatLabel>VIT // 체력</StyledStatLabel>
            <StyledMetricDot $tone={isCriticalHp ? "negative" : "positive"} />
          </StyledCellHeader>
          <StyledStatValue $critical={isCriticalHp}>
            {character?.hp ?? "—"} / {character?.maxHp ?? "—"}
          </StyledStatValue>
        </StyledGridCell>

        <StyledGridCell>
          <StyledCellHeader>
            <StyledStatLabel>STM // 기력</StyledStatLabel>
            <StyledMetricDot $tone="positive" />
          </StyledCellHeader>
          <StyledStatValue>
            {character?.stamina ?? "—"} / {character?.maxStamina ?? "—"}
          </StyledStatValue>
        </StyledGridCell>

        <StyledGridCell>
          <StyledCellHeader>
            <StyledStatLabel>LOAD // 중량</StyledStatLabel>
            <StyledMetricDot $tone="neutral" />
          </StyledCellHeader>
          <StyledStatValue>
            {character?.weight ?? 0} / {character?.maxWeight ?? 0} kg
          </StyledStatValue>
        </StyledGridCell>
      </StyledTelemetryGrid>

      {/* 탐사 시작/복귀 버튼 */}
      <StyledActionButton
        type="button"
        disabled={disabled}
        $raiding={isRaiding}
        onClick={onRaidAction}
        whileTap={{ scale: 0.99 }}
      >
        <span>
          {pendingResult
            ? "탐사 결과 확인"
            : isRaiding
              ? "진행 중인 탐사로 복귀"
              : "서포시 탐사 출격"}
        </span>
        <StyledButtonCode>
          {pendingResult ? "SYNC →" : isRaiding ? "ACTIVE →" : "DEPLOY → #00"}
        </StyledButtonCode>
      </StyledActionButton>
    </StyledCardContainer>
  );
}

const StyledCardContainer = styled.div<{
  $bracketTone?: "default" | "positive" | "negative";
}>`
  background: #101013;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  position: relative;
  ${cornerBracketsMixin}
`;

const StyledHeaderRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
`;

const StyledTelemetryCode = styled.span`
  display: block;
  font-family: var(--font-mono);
  font-size: 11px;
  color: #71717a;
  font-variant-numeric: tabular-nums;
  margin-bottom: 2px;
`;

const StyledNickname = styled.h2`
  font-size: 18px;
  font-weight: 700;
  color: #fafafa;
  margin: 0;
  letter-spacing: -0.02em;
`;

const StyledStatusBadge = styled.span<{ $raiding?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
  background: ${(props) =>
    props.$raiding ? "rgba(255, 113, 98, 0.14)" : "rgba(133, 173, 255, 0.12)"};
  color: ${(props) => (props.$raiding ? "#ff7162" : "#85adff")};
  border: 1px solid
    ${(props) =>
      props.$raiding ? "rgba(255, 113, 98, 0.3)" : "rgba(133, 173, 255, 0.28)"};
`;

const StyledStatusDot = styled.span<{ $raiding?: boolean }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${(props) => (props.$raiding ? "#ff7162" : "#85adff")};
`;

const StyledTelemetryGrid = styled.div`
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  background: #27272a;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  overflow: hidden;
`;

const StyledGridCell = styled.div`
  background: #0c0c0f;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const StyledCellHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
`;

const StyledStatLabel = styled.p`
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  color: #71717a;
  margin: 0;
`;

const StyledMetricDot = styled.span<{ $tone: "positive" | "negative" | "neutral" }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${(props) =>
    props.$tone === "negative"
      ? "#ff7162"
      : props.$tone === "positive"
        ? "#85adff"
        : "#71717a"};
`;

const StyledStatValue = styled.p<{ $critical?: boolean }>`
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  color: ${(props) => (props.$critical ? "#ff7162" : "#fafafa")};
  font-variant-numeric: tabular-nums;
  margin: 0;
`;

const StyledActionButton = styled(motion.button)<{ $raiding?: boolean }>`
  width: 100%;
  height: 44px;
  padding: 0 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  color: ${(props) => (props.$raiding ? "#fafafa" : "#09090b")};
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  border: 1px solid
    ${(props) =>
      props.$raiding ? "rgba(255, 113, 98, 0.45)" : "transparent"};
  background: ${(props) =>
    props.$raiding ? "rgba(255, 113, 98, 0.18)" : "#fafafa"};
  transition: background-color 0.15s ease;

  &:hover:not(:disabled) {
    background: ${(props) =>
      props.$raiding ? "rgba(255, 113, 98, 0.26)" : "#e4e4e7"};
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

const StyledButtonCode = styled.span`
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  opacity: 0.85;
`;

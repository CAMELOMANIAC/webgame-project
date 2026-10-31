import { useNavigate } from "@tanstack/react-router";
import { seopoRegion } from "@webgame/types";
import { useAtomValue, useSetAtom } from "jotai";
import styled from "styled-components";

import {
  pendingNavigationAtom,
  pendingNavigationKey,
} from "@/atoms/pendingNavigationAtom";
import {
  currentNodeIdAtom,
  isCombatAtom,
  isNavigatingAtom,
  playerCoordsAtom,
  raidNoticeAtom,
  requestedNodeIdAtom,
  targetNodeIdAtom,
} from "@/atoms/raidAtom";
import { FieldWidget } from "@/components/Commons";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";
import { useJournal } from "@/utils/hooks/useJournal";
import { useRaidRules } from "@/utils/hooks/useRaidRules";
import { useRaidSession } from "@/utils/hooks/useRaidSession";

import mapData from "../../../../packages/types/src/assets/map_graph.json";

const FieldNavTargetSection = () => {
  const navigate = useNavigate();
  const { data } = useGetCharacter();
  const { data: rules } = useRaidRules();
  const { extractRaid } = useRaidSession();
  const journal = useJournal();
  const nodeId = useAtomValue(currentNodeIdAtom);
  const targetNodeId = useAtomValue(targetNodeIdAtom);
  const isMoving = useAtomValue(isNavigatingAtom);
  const isCombat = useAtomValue(isCombatAtom);
  const pending = useAtomValue(pendingNavigationAtom);
  const setRequestedNode = useSetAtom(requestedNodeIdAtom);
  const setNode = useSetAtom(currentNodeIdAtom);
  const setCoords = useSetAtom(playerCoordsAtom);
  const setNotice = useSetAtom(raidNoticeAtom);
  const notice = useAtomValue(raidNoticeAtom);
  const character = data?.raw;
  const region = seopoRegion(
    nodeId,
    character?.activeRaid?.round ?? 0,
    mapData.nodes[nodeId] ?? { x: 0, y: 0 },
  );
  const hasPending =
    !!pending[pendingNavigationKey(character?.userId, character?.id)];
  const canAct =
    !!character?.isRaiding &&
    !isMoving &&
    !isCombat &&
    !hasPending &&
    !extractRaid.isPending;
  const atExtraction = rules?.extractionNodeIds.includes(nodeId) ?? false;
  const isStable = region.overlap === "STABLE";

  const leave = () => {
    if (!character || !canAct) return;
    extractRaid.mutate(character.id, {
      onSuccess: () => {
        setNotice("탈출에 성공했습니다. 가방의 물품을 창고로 옮겼습니다.");
        setNode(rules?.startNodeId ?? 0);
        setCoords(null);
        void navigate({ to: "/field/user" });
      },
    });
  };

  return (
    <StyledContainer $bracketTone={isStable ? "positive" : "negative"}>
      <StyledTopTelemetryBar>
        <StyledTelemetryLeft>
          <StyledStatusDot $positive={isStable} />
          <StyledSubTitle>서포시 탐사</StyledSubTitle>
          <StyledNodeCode>[NODE #{nodeId}]</StyledNodeCode>
        </StyledTelemetryLeft>
        <StyledOverlapBadge $positive={isStable}>
          중첩 {isStable ? "안정" : "불안정 · 통제 강화"}
        </StyledOverlapBadge>
      </StyledTopTelemetryBar>

      <StyledDestinationRow>
        <StyledDestinationText>
          {isMoving && targetNodeId !== null
            ? `목적지 #${targetNodeId}`
            : `${region.name} #${nodeId}`}
        </StyledDestinationText>
        <StyledStatusHint $positive={atExtraction}>
          {isMoving
            ? "목적지로 이동 중입니다"
            : atExtraction
              ? "탈출 가능한 구역입니다"
              : "지도에서 다음 목적지를 선택하세요"}
        </StyledStatusHint>
      </StyledDestinationRow>

      {notice && (
        <StyledNoticeBanner $tone="positive" role="status">
          {notice}
        </StyledNoticeBanner>
      )}

      {journal.data?.mission.status === "ACTIVE" && (
        <StyledSecondaryAction
          type="button"
          disabled={!canAct}
          onClick={() => setRequestedNode(journal.data!.mission.targetNodeId)}
        >
          <span>임무: 기록 중계 시설로 이동</span>
          <StyledActionCode>
            TARGET #{journal.data.mission.targetNodeId} →
          </StyledActionCode>
        </StyledSecondaryAction>
      )}

      {journal.data?.mission.status === "RECOVERED" &&
        !isMoving &&
        !isCombat &&
        !hasPending && (
          <StyledNoticeBanner $tone="positive" role="status">
            임무 기록을 확보했습니다. 살아서 탈출하세요.
          </StyledNoticeBanner>
        )}

      {/* 1px 밀착 텔레메트리 그리드 */}
      <StyledTelemetryGrid>
        <StyledTelemetryCell>
          <StyledCellLabel>ROUND // 진행 라운드</StyledCellLabel>
          <StyledCellValue>{character?.activeRaid?.round ?? 0}</StyledCellValue>
        </StyledTelemetryCell>
        <StyledTelemetryCell>
          <StyledCellLabel>EXTRACT // 탈출 구역</StyledCellLabel>
          <StyledCellValue>
            #{rules?.extractionNodeIds.join(", #") ?? "—"}
          </StyledCellValue>
        </StyledTelemetryCell>
      </StyledTelemetryGrid>

      {character?.isRaiding || isMoving || hasPending ? (
        atExtraction ? (
          <StyledPrimaryAction type="button" disabled={!canAct} onClick={leave}>
            <span>
              {extractRaid.isPending
                ? "탈출 처리 중…"
                : "탈출하고 거점으로 복귀"}
            </span>
            <StyledActionCode>EXTRACT →</StyledActionCode>
          </StyledPrimaryAction>
        ) : (
          <StyledPrimaryAction
            type="button"
            disabled={!canAct || !rules}
            onClick={() => setRequestedNode(rules?.extractionNodeIds[0] ?? 0)}
          >
            <span>탈출 지점으로 이동</span>
            <StyledActionCode>
              NODE #{rules?.extractionNodeIds[0] ?? 0} →
            </StyledActionCode>
          </StyledPrimaryAction>
        )
      ) : (
        character && (
          <StyledPrimaryAction
            type="button"
            onClick={() => void navigate({ to: "/field/user" })}
          >
            <span>거점으로 돌아가기</span>
            <StyledActionCode>BASE →</StyledActionCode>
          </StyledPrimaryAction>
        )
      )}

      {extractRaid.error && (
        <StyledNoticeBanner $tone="negative" role="alert">
          {extractRaid.error.message}
        </StyledNoticeBanner>
      )}
    </StyledContainer>
  );
};

export default FieldNavTargetSection;

const StyledContainer = styled(FieldWidget)`
  height: auto;
  width: 100%;
  flex-direction: column;
  justify-content: flex-start;
  align-items: stretch;
  padding: 14px;
  flex: 0;
  gap: 10px;
`;

const StyledTopTelemetryBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
`;

const StyledTelemetryLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const StyledStatusDot = styled.span<{ $positive: boolean }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${(props) => (props.$positive ? "#85adff" : "#ff7162")};
`;

const StyledSubTitle = styled.h3`
  font-size: 12px;
  font-weight: 600;
  color: #fafafa;
  margin: 0;
`;

const StyledNodeCode = styled.span`
  font-family: var(--font-mono);
  font-size: 11px;
  color: #a1a1aa;
  font-variant-numeric: tabular-nums;
`;

const StyledOverlapBadge = styled.span<{ $positive: boolean }>`
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  color: ${(props) => (props.$positive ? "#85adff" : "#ff7162")};
  background: ${(props) =>
    props.$positive ? "rgba(133, 173, 255, 0.12)" : "rgba(255, 113, 98, 0.14)"};
  border: 1px solid
    ${(props) =>
      props.$positive ? "rgba(133, 173, 255, 0.28)" : "rgba(255, 113, 98, 0.3)"};
`;

const StyledDestinationRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
`;

const StyledDestinationText = styled.strong`
  color: #fafafa;
  font-weight: 700;
  font-size: 17px;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
`;

const StyledStatusHint = styled.p<{ $positive?: boolean }>`
  color: ${(props) => (props.$positive ? "#85adff" : "#a1a1aa")};
  font-size: 12px;
  margin: 0;
`;

const StyledNoticeBanner = styled.p<{ $tone: "positive" | "negative" }>`
  padding: 8px 10px;
  border-radius: 4px;
  font-size: 12px;
  color: ${(props) => (props.$tone === "negative" ? "#ff7162" : "#85adff")};
  background: ${(props) =>
    props.$tone === "negative"
      ? "rgba(255, 113, 98, 0.14)"
      : "rgba(133, 173, 255, 0.12)"};
  border: 1px solid
    ${(props) =>
      props.$tone === "negative"
        ? "rgba(255, 113, 98, 0.3)"
        : "rgba(133, 173, 255, 0.28)"};
`;

const StyledTelemetryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  background: #27272a;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  overflow: hidden;
`;

const StyledTelemetryCell = styled.div`
  background: #0c0c0f;
  padding: 8px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const StyledCellLabel = styled.span`
  font-family: var(--font-mono);
  font-size: 11px;
  color: #71717a;
`;

const StyledCellValue = styled.span`
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  color: #fafafa;
  font-variant-numeric: tabular-nums;
`;

const StyledPrimaryAction = styled.button`
  width: 100%;
  padding: 10px 12px;
  border: 0;
  border-radius: 6px;
  background: #fafafa;
  color: #09090b;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: background-color 0.15s ease;

  &:hover:not(:disabled) {
    background: #e4e4e7;
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

const StyledSecondaryAction = styled.button`
  width: 100%;
  padding: 9px 12px;
  border-radius: 6px;
  border: 1px solid rgba(133, 173, 255, 0.35);
  background: rgba(133, 173, 255, 0.12);
  color: #85adff;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

const StyledActionCode = styled.span`
  font-family: var(--font-mono);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
`;

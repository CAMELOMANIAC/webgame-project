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
    <Container>
      <Row $flexGrow={0}>
        <Column $flexGrow={1}>
          <SubTitle>서포시 탐사</SubTitle>
          <DestinationText>
            {isMoving && targetNodeId !== null
              ? `목적지 #${targetNodeId}`
              : `${region.name} #${nodeId}`}
          </DestinationText>
          <HighlightText>
            {isMoving
              ? "목적지로 이동 중입니다"
              : atExtraction
                ? "탈출 가능한 구역입니다"
                : "지도에서 다음 목적지를 선택하세요"}
          </HighlightText>
          <HighlightText>
            중첩 {region.overlap === "STABLE" ? "안정" : "불안정 · 통제 강화"}
          </HighlightText>
        </Column>
      </Row>
      {notice && <HighlightText role="status">{notice}</HighlightText>}
      {journal.data?.mission.status === "ACTIVE" && (
        <StyledAction
          type="button"
          disabled={!canAct}
          onClick={() => setRequestedNode(journal.data!.mission.targetNodeId)}
        >
          임무: 기록 중계 시설로 이동
        </StyledAction>
      )}
      {journal.data?.mission.status === "RECOVERED" &&
        !isMoving &&
        !isCombat &&
        !hasPending && (
          <HighlightText role="status">
            임무 기록을 확보했습니다. 살아서 탈출하세요.
          </HighlightText>
        )}
      <Row $flexGrow={0} $gap="8px">
        <TimeContainer>
          <TimeText>{character?.activeRaid?.round ?? 0}</TimeText>
          <SubLabel>진행 라운드</SubLabel>
        </TimeContainer>
        <TimeContainer>
          <TimeText>{rules?.extractionNodeIds.join(", ") ?? "—"}</TimeText>
          <SubLabel>탈출 구역</SubLabel>
        </TimeContainer>
      </Row>
      {character?.isRaiding || isMoving || hasPending ? (
        atExtraction ? (
          <StyledAction type="button" disabled={!canAct} onClick={leave}>
            {extractRaid.isPending ? "탈출 처리 중…" : "탈출하고 거점으로 복귀"}
          </StyledAction>
        ) : (
          <StyledAction
            type="button"
            disabled={!canAct || !rules}
            onClick={() => setRequestedNode(rules?.extractionNodeIds[0] ?? 0)}
          >
            탈출 지점으로 이동
          </StyledAction>
        )
      ) : (
        character && (
          <StyledAction
            type="button"
            onClick={() => void navigate({ to: "/field/user" })}
          >
            거점으로 돌아가기
          </StyledAction>
        )
      )}
      {extractRaid.error && (
        <HighlightText role="alert">{extractRaid.error.message}</HighlightText>
      )}
    </Container>
  );
};

export default FieldNavTargetSection;

const Container = styled(FieldWidget)`
  height: auto;
  width: 100%;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  padding: 24px;
  flex: 0;
  gap: 16px;
`;

type flexGrowProps = {
  $flexGrow?: number;
  $gap?: string;
};
const Column = styled.div<flexGrowProps>`
  display: flex;
  flex-direction: column;
  flex-grow: ${(props) => props.$flexGrow ?? 1};
  gap: ${(props) => props.$gap ?? 0};
  width: auto;
`;

const Row = styled.div<flexGrowProps>`
  display: flex;
  flex-direction: row;
  flex-grow: ${(props) => props.$flexGrow ?? 1};
  gap: ${(props) => props.$gap ?? 0};
  width: 100%;
  height: auto;
`;

const SubTitle = styled.h3`
  font-size: 10px;
  font-weight: 300;
  color: #adaaaa;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0 0 5px;
`;

const HighlightText = styled.p`
  color: #85adff;
  font-weight: 300;
  font-size: 12px;
  padding-top: 5px;
`;

const TimeContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: #131212;
  width: 100%;
  height: auto;
  border-radius: 16px;
  padding: 12px;
`;

type timeTextProps = {
  $color?: string;
};
const TimeText = styled.p<timeTextProps>`
  color: ${(props) => props.$color ?? `white`};
  font-weight: 600;
  font-size: 18px;
  padding: 0 0 5px 0;
`;

const SubLabel = styled.label`
  color: #adaaaa;
  font-weight: 300;
  font-size: 9px;
`;

const DestinationText = styled.strong`
  color: white;
  font-weight: 800;
  font-size: 20px;
`;

const StyledAction = styled.button`
  width: 100%;
  padding: 12px;
  border: 0;
  border-radius: 12px;
  background: #b8ffb9;
  color: #101010;
  cursor: pointer;
  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

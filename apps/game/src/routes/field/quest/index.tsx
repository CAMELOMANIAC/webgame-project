import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtomValue } from "jotai";
import styled from "styled-components";

import { selectedUserIdAtom } from "@/atoms/authAtom";
import { pendingNavigationAtom } from "@/atoms/pendingNavigationAtom";
import { cornerBracketsMixin, Page } from "@/components/Commons";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";
import { useJournal, useMissionAction } from "@/utils/hooks/useJournal";

export const Route = createFileRoute("/field/quest/")({
  component: RouteComponent,
});

const labels = {
  OFFERED: "수락 대기",
  ACTIVE: "기록 회수 중",
  RECOVERED: "기록 확보 · 탈출 필요",
  READY: "보고 가능",
  COMPLETE: "보고 완료",
};

function RouteComponent() {
  const userId = useAtomValue(selectedUserIdAtom);
  const pending = useAtomValue(pendingNavigationAtom);
  const journal = useJournal();
  const character = useGetCharacter();
  const accept = useMissionAction("accept");
  const report = useMissionAction("report");
  const mission = journal.data?.mission;
  const resultPending = Object.values(pending).some(
    (entry) => entry.actorUserId === userId,
  );
  const locked =
    !!character.data?.raw.isRaiding ||
    resultPending ||
    accept.isPending ||
    report.isPending;
  const error = journal.error ?? accept.error ?? report.error;
  const isUrgent = mission?.status === "RECOVERED" || resultPending;

  return (
    <Page style={{ overflowY: "auto" }}>
      <StyledJournal>
        <StyledPageHeader>
          <StyledTelemetryTop>
            <span>HL-LAB // COMM-ARCHIVE</span>
            <span>한림 복귀 실험실 · 임무 통신</span>
          </StyledTelemetryTop>
          <h1>서포시 운영 기록</h1>
          <p>임무명·구역명·대사는 검증용 초안입니다.</p>
        </StyledPageHeader>

        {journal.isPending && <p>임무 통신을 불러오는 중입니다.</p>}
        {error && <StyledAlert role="alert">{error.message}</StyledAlert>}
        {journal.isError && (
          <StyledActionButton
            type="button"
            onClick={() => void journal.refetch()}
          >
            다시 불러오기
          </StyledActionButton>
        )}

        {mission && (
          <StyledMissionSection
            $bracketTone={
              isUrgent
                ? "negative"
                : mission.status === "COMPLETE"
                  ? "default"
                  : "positive"
            }
          >
            <StyledSectionTopRow>
              <StyledStatusBadge
                $tone={
                  isUrgent
                    ? "negative"
                    : mission.status === "COMPLETE"
                      ? "neutral"
                      : "positive"
                }
              >
                {resultPending ? "탐사 결과 확인 필요" : labels[mission.status]}
              </StyledStatusBadge>
              <StyledCodeTag>MISSION // #{mission.targetNodeId}</StyledCodeTag>
            </StyledSectionTopRow>

            <h2>{mission.title}</h2>
            <p>{mission.briefing}</p>

            <StyledMetaGrid>
              <StyledMetaCell>
                <span>TARGET // 목표 경로</span>
                <strong>
                  기록 중계 시설 #{mission.targetNodeId} → 탈출 지점 #0 → 거점
                  보고
                </strong>
              </StyledMetaCell>
              <StyledMetaCell>
                <span>REWARD // 보상</span>
                <strong>{mission.rewardDescription}</strong>
              </StyledMetaCell>
            </StyledMetaGrid>

            {mission.status === "OFFERED" && (
              <StyledActionButton
                type="button"
                disabled={locked}
                onClick={() => accept.mutate()}
              >
                <span>구호 물자 받고 임무 수락</span>
                <StyledButtonCode>ACCEPT →</StyledButtonCode>
              </StyledActionButton>
            )}
            {mission.status === "ACTIVE" && (
              <StyledNoticeText $tone="positive">
                지원 장비를 창고에서 꺼내 장착하세요. 출격 후 지도 상단의 임무
                이동을 이용할 수 있습니다.
              </StyledNoticeText>
            )}
            {mission.status === "RECOVERED" && !resultPending && (
              <StyledNoticeText $tone="negative">
                기록을 확보했습니다. 탐사 중 쓰러지면 다시 회수해야 합니다.
              </StyledNoticeText>
            )}
            {mission.status === "READY" && (
              <StyledActionButton
                type="button"
                disabled={locked}
                onClick={() => report.mutate()}
              >
                <span>회수 기록 보고 · 보상 받기</span>
                <StyledButtonCode>REPORT →</StyledButtonCode>
              </StyledActionButton>
            )}
            {mission.status === "COMPLETE" && (
              <StyledNoticeText $tone="positive" role="status">
                보고와 보상 지급이 완료됐습니다. 복귀 관측 기록을 열람할 수
                있습니다.
              </StyledNoticeText>
            )}

            <StyledNavLinks>
              <Link to="/field/user">거점에서 정비 →</Link>
              {character.data?.raw.isRaiding && (
                <Link to="/field">진행 중인 탐사로 돌아가기 →</Link>
              )}
              {resultPending && (
                <Link to="/field">미확인 전투 결과 재생 →</Link>
              )}
            </StyledNavLinks>
          </StyledMissionSection>
        )}

        <StyledPanel>
          <StyledSectionTopRow>
            <h2>확인한 담당자</h2>
            <StyledCodeTag>CONTACTS</StyledCodeTag>
          </StyledSectionTopRow>
          {journal.data?.contacts.map((contact) => (
            <StyledContactRow key={contact.id}>
              <span>
                {contact.name} · {contact.role}
              </span>
              {contact.entityId && (
                <StyledCodeTag>개체 {contact.entityId}</StyledCodeTag>
              )}
            </StyledContactRow>
          ))}
        </StyledPanel>

        <StyledPanel>
          <StyledSectionTopRow>
            <h2>회수·공개 기록</h2>
            <StyledCodeTag>ARCHIVE</StyledCodeTag>
          </StyledSectionTopRow>
          {journal.data?.records.length === 0 && (
            <p>공개된 기록이 없습니다.</p>
          )}
          {journal.data?.records.map((record) => (
            <StyledArticle key={record.id}>
              <h3>{record.title}</h3>
              <p>{record.content}</p>
            </StyledArticle>
          ))}
        </StyledPanel>
      </StyledJournal>
    </Page>
  );
}

const StyledJournal = styled.div`
  width: 100%;
  padding: 20px 16px 96px;
  color: #fafafa;
  display: flex;
  flex-direction: column;
  gap: 16px;

  h1 {
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.02em;
    margin: 4px 0 6px;
  }

  h2 {
    font-size: 16px;
    font-weight: 700;
    margin: 0;
    color: #fafafa;
  }

  h3 {
    font-size: 14px;
    font-weight: 600;
    margin: 0 0 6px;
    color: #fafafa;
  }

  p {
    line-height: 1.65;
    font-size: 13px;
    color: #a1a1aa;
  }
`;

const StyledPageHeader = styled.header`
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
`;

const StyledTelemetryTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: var(--font-mono);
  font-size: 11px;
  color: #71717a;
  margin-bottom: 4px;
`;

const StyledAlert = styled.p`
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid rgba(255, 113, 98, 0.3);
  background: rgba(255, 113, 98, 0.12);
  color: #ff7162 !important;
`;

const StyledPanel = styled.section`
  padding: 16px;
  background: #101013;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const StyledMissionSection = styled(StyledPanel)<{
  $bracketTone?: "default" | "positive" | "negative";
}>`
  border-radius: 8px;
  ${cornerBracketsMixin}
`;

const StyledSectionTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
`;

const StyledStatusBadge = styled.small<{
  $tone: "positive" | "negative" | "neutral";
}>`
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 4px;
  color: ${(props) =>
    props.$tone === "negative"
      ? "#ff7162"
      : props.$tone === "positive"
        ? "#85adff"
        : "#a1a1aa"};
  background: ${(props) =>
    props.$tone === "negative"
      ? "rgba(255, 113, 98, 0.14)"
      : props.$tone === "positive"
        ? "rgba(133, 173, 255, 0.12)"
        : "rgba(255, 255, 255, 0.06)"};
  border: 1px solid
    ${(props) =>
      props.$tone === "negative"
        ? "rgba(255, 113, 98, 0.3)"
        : props.$tone === "positive"
          ? "rgba(133, 173, 255, 0.28)"
          : "rgba(255, 255, 255, 0.12)"};
`;

const StyledCodeTag = styled.span`
  font-family: var(--font-mono);
  font-size: 11px;
  color: #71717a;
  font-variant-numeric: tabular-nums;
`;

const StyledMetaGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1px;
  background: #27272a;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  overflow: hidden;
`;

const StyledMetaCell = styled.div`
  background: #0c0c0f;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;

  span {
    font-family: var(--font-mono);
    font-size: 11px;
    color: #71717a;
  }

  strong {
    font-size: 12px;
    font-weight: 600;
    color: #fafafa;
    font-variant-numeric: tabular-nums;
  }
`;

const StyledNoticeText = styled.p<{ $tone: "positive" | "negative" }>`
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 12px !important;
  color: ${(props) =>
    props.$tone === "negative" ? "#ff7162" : "#85adff"} !important;
  background: ${(props) =>
    props.$tone === "negative"
      ? "rgba(255, 113, 98, 0.12)"
      : "rgba(133, 173, 255, 0.1)"};
  border: 1px solid
    ${(props) =>
      props.$tone === "negative"
        ? "rgba(255, 113, 98, 0.28)"
        : "rgba(133, 173, 255, 0.25)"};
`;

const StyledActionButton = styled.button`
  width: 100%;
  padding: 12px 14px;
  border-radius: 6px;
  border: 0;
  background: #fafafa;
  color: #09090b;
  font-size: 13px;
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

const StyledButtonCode = styled.span`
  font-family: var(--font-mono);
  font-size: 11px;
`;

const StyledNavLinks = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);

  a {
    color: #85adff;
    font-size: 12px;
    font-weight: 500;
  }
`;

const StyledContactRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: #d4d4d8;
`;

const StyledArticle = styled.article`
  padding: 12px;
  border-radius: 6px;
  background: #0c0c0f;
  border: 1px solid rgba(255, 255, 255, 0.06);
`;

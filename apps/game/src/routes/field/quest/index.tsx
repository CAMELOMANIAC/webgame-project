import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtomValue } from "jotai";
import styled from "styled-components";

import { selectedUserIdAtom } from "@/atoms/authAtom";
import { pendingNavigationAtom } from "@/atoms/pendingNavigationAtom";
import { Page } from "@/components/Commons";
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
  return (
    <Page style={{ overflowY: "auto" }}>
      <StyledJournal>
        <header>
          <small>한림 복귀 실험실 · 임무 통신</small>
          <h1>서포시 운영 기록</h1>
        </header>
        <p>임무명·구역명·대사는 검증용 초안입니다.</p>
        {journal.isPending && <p>임무 통신을 불러오는 중입니다.</p>}
        {error && <p role="alert">{error.message}</p>}
        {journal.isError && (
          <button type="button" onClick={() => void journal.refetch()}>
            다시 불러오기
          </button>
        )}
        {mission && (
          <section>
            <small>
              {resultPending ? "탐사 결과 확인 필요" : labels[mission.status]}
            </small>
            <h2>{mission.title}</h2>
            <p>{mission.briefing}</p>
            <p>
              목표: 기록 중계 시설 #{mission.targetNodeId} → 탈출 지점 #0 → 거점
              보고
            </p>
            <p>보상: {mission.rewardDescription}</p>
            {mission.status === "OFFERED" && (
              <button
                type="button"
                disabled={locked}
                onClick={() => accept.mutate()}
              >
                구호 물자 받고 임무 수락
              </button>
            )}
            {mission.status === "ACTIVE" && (
              <p>
                지원 장비를 창고에서 꺼내 장착하세요. 출격 후 지도 상단의 임무
                이동을 이용할 수 있습니다.
              </p>
            )}
            {mission.status === "RECOVERED" && !resultPending && (
              <p>기록을 확보했습니다. 탐사 중 쓰러지면 다시 회수해야 합니다.</p>
            )}
            {mission.status === "READY" && (
              <button
                type="button"
                disabled={locked}
                onClick={() => report.mutate()}
              >
                회수 기록 보고 · 보상 받기
              </button>
            )}
            {mission.status === "COMPLETE" && (
              <p role="status">
                보고와 보상 지급이 완료됐습니다. 복귀 관측 기록을 열람할 수
                있습니다.
              </p>
            )}
            <nav>
              <Link to="/field/user">거점에서 정비</Link>
              {character.data?.raw.isRaiding && (
                <Link to="/field">진행 중인 탐사로 돌아가기</Link>
              )}
              {resultPending && <Link to="/field">미확인 전투 결과 재생</Link>}
            </nav>
          </section>
        )}
        <section>
          <h2>확인한 담당자</h2>
          {journal.data?.contacts.map((contact) => (
            <p key={contact.id}>
              {contact.name} · {contact.role}
              {contact.entityId ? ` · 개체 ${contact.entityId}` : ""}
            </p>
          ))}
        </section>
        <section>
          <h2>회수·공개 기록</h2>
          {journal.data?.records.length === 0 && <p>공개된 기록이 없습니다.</p>}
          {journal.data?.records.map((record) => (
            <article key={record.id}>
              <h3>{record.title}</h3>
              <p>{record.content}</p>
            </article>
          ))}
        </section>
      </StyledJournal>
    </Page>
  );
}

const StyledJournal = styled.div`
  width: 100%;
  padding: 24px 24px 110px;
  color: #ecf0f1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  h1 {
    font-size: 26px;
    margin: 8px 0;
  }
  h2 {
    font-size: 18px;
  }
  h3 {
    font-size: 15px;
  }
  p {
    line-height: 1.75;
    font-size: 13px;
    color: #c0c7d2;
  }
  small {
    color: #85adff;
    font-size: 11px;
  }
  section {
    padding: 16px;
    background: #191c22;
    border: 1px solid #303743;
    border-radius: 16px;
  }
  button {
    padding: 12px 16px;
    border-radius: 12px;
    border: 0;
    background: #b8ffb9;
    color: #151515;
    font-weight: 600;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  nav {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 16px;
  }
  a {
    color: #85adff;
    font-size: 13px;
  }
`;

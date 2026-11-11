import { Link } from "@tanstack/react-router";
import { useAtomValue } from "jotai";

import { selectedUserIdAtom } from "@/atoms/authAtom";
import { pendingNavigationAtom } from "@/atoms/pendingNavigationAtom";
import { page } from "@/styles/theme.css";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";
import { useJournal, useMissionAction } from "@/utils/hooks/useJournal";

import * as styles from "./MissionJournal.css";

const labels = {
  OFFERED: "수락 대기",
  ACTIVE: "기록 회수 중",
  RECOVERED: "기록 확보 · 탈출 필요",
  READY: "보고 가능",
  COMPLETE: "보고 완료",
};

export function MissionJournal({ mode }: { mode: "raid" | "base" }) {
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
    <div className={page} style={{ overflowY: "auto" }}>
      <div className={styles.journal}>
        <header className={styles.pageHeader}>
          <div className={styles.telemetryTop}>
            <span>HL-LAB // COMM-ARCHIVE</span>
            <span>한림 복귀 실험실 · 임무 통신</span>
          </div>
          <h1>서포시 운영 기록</h1>
          <p>임무명·구역명·대사는 검증용 초안입니다.</p>
        </header>

        {journal.isPending && <p>임무 통신을 불러오는 중입니다.</p>}
        {error && (
          <p className={styles.alert} role="alert">
            {error.message}
          </p>
        )}
        {journal.isError && (
          <button
            type="button"
            className={styles.actionButton}
            onClick={() => void journal.refetch()}
          >
            다시 불러오기
          </button>
        )}

        {mission && (
          <section
            className={styles.missionSection({
              bracketTone: isUrgent
                ? "negative"
                : mission.status === "COMPLETE"
                  ? "default"
                  : "positive",
            })}
          >
            <div className={styles.sectionTopRow}>
              <small
                className={styles.statusBadge({
                  tone: isUrgent
                    ? "negative"
                    : mission.status === "COMPLETE"
                      ? "neutral"
                      : "positive",
                })}
              >
                {resultPending ? "탐사 결과 확인 필요" : labels[mission.status]}
              </small>
              <span className={styles.codeTag}>
                MISSION // #{mission.targetNodeId}
              </span>
            </div>

            <h2>{mission.title}</h2>
            <p>{mission.briefing}</p>

            <div className={styles.metaGrid}>
              <div className={styles.metaCell}>
                <span>TARGET // 목표 경로</span>
                <strong>
                  기록 중계 시설 #{mission.targetNodeId} → 탈출 지점 #0 → 거점
                  보고
                </strong>
              </div>
              <div className={styles.metaCell}>
                <span>REWARD // 보상</span>
                <strong>{mission.rewardDescription}</strong>
              </div>
            </div>

            {mode === "base" && mission.status === "OFFERED" && (
              <button
                type="button"
                className={styles.actionButton}
                disabled={locked}
                onClick={() => accept.mutate()}
              >
                <span>구호 물자 받고 임무 수락</span>
                <span className={styles.buttonCode}>ACCEPT →</span>
              </button>
            )}
            {mission.status === "ACTIVE" && (
              <p className={styles.noticeText({ tone: "positive" })}>
                {mode === "base"
                  ? "지원 장비를 창고에서 꺼내 장착하세요. 배치 후 지도에서 임무 목표로 이동할 수 있습니다."
                  : "전술지도에서 임무 목표로 이동해 기록을 확보하세요."}
              </p>
            )}
            {mission.status === "RECOVERED" && !resultPending && (
              <p className={styles.noticeText({ tone: "negative" })}>
                기록을 확보했습니다. 탐사 중 쓰러지면 다시 회수해야 합니다.
              </p>
            )}
            {mode === "base" && mission.status === "READY" && (
              <button
                type="button"
                className={styles.actionButton}
                disabled={locked}
                onClick={() => report.mutate()}
              >
                <span>회수 기록 보고 · 보상 받기</span>
                <span className={styles.buttonCode}>REPORT →</span>
              </button>
            )}
            {mission.status === "COMPLETE" && (
              <p
                className={styles.noticeText({ tone: "positive" })}
                role="status"
              >
                보고와 보상 지급이 완료됐습니다. 복귀 관측 기록을 열람할 수
                있습니다.
              </p>
            )}

            <nav className={styles.navLinks}>
              {mode === "base" ? (
                <Link to="/base/stash">창고에서 정비 →</Link>
              ) : (
                <Link to="/field/user">거점 미리보기 →</Link>
              )}
              {character.data?.raw.isRaiding && (
                <Link to="/field">진행 중인 탐사로 돌아가기 →</Link>
              )}
              {resultPending && (
                <Link to="/field">미확인 전투 결과 재생 →</Link>
              )}
            </nav>
          </section>
        )}

        <section className={styles.panel}>
          <div className={styles.sectionTopRow}>
            <h2>확인한 담당자</h2>
            <span className={styles.codeTag}>CONTACTS</span>
          </div>
          {journal.data?.contacts.map((contact) => (
            <div className={styles.contactRow} key={contact.id}>
              <span>
                {contact.name} · {contact.role}
              </span>
              {contact.entityId && (
                <span className={styles.codeTag}>개체 {contact.entityId}</span>
              )}
            </div>
          ))}
        </section>

        <section className={styles.panel}>
          <div className={styles.sectionTopRow}>
            <h2>회수·공개 기록</h2>
            <span className={styles.codeTag}>ARCHIVE</span>
          </div>
          {journal.data?.records.length === 0 && <p>공개된 기록이 없습니다.</p>}
          {journal.data?.records.map((record) => (
            <article className={styles.article} key={record.id}>
              <h3>{record.title}</h3>
              <p>{record.content}</p>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}

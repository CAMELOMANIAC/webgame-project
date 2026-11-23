import { Link } from "@tanstack/react-router";
import type { JournalMissionItem } from "@webgame/types";
import { useAtom, useAtomValue } from "jotai";

import { selectedUserIdAtom } from "@/atoms/authAtom";
import { pendingNavigationAtom } from "@/atoms/pendingNavigationAtom";
import { selectedQuestIdAtom } from "@/atoms/toastAtom";
import { page } from "@/styles/theme.css";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";
import { useJournal } from "@/utils/hooks/useJournal";

import * as styles from "./MissionJournal.css";
import { QuestChat } from "./questChat/QuestChat";

const labels = {
  OFFERED: "수락 대기",
  ACTIVE: "기록 회수 중",
  RECOVERED: "기록 확보 · 탈출 필요",
  READY: "보고 가능",
  COMPLETE: "보고 완료",
  LOCKED: "종료",
};

function statusTone(status: JournalMissionItem["status"]) {
  if (status === "RECOVERED") return "negative" as const;
  if (status === "COMPLETE" || status === "LOCKED") return "neutral" as const;
  return "positive" as const;
}

export function MissionJournal({ mode }: { mode: "raid" | "base" }) {
  const userId = useAtomValue(selectedUserIdAtom);
  const pending = useAtomValue(pendingNavigationAtom);
  const journal = useJournal();
  const character = useGetCharacter();
  const missions = journal.data?.missions ?? [];
  const storyTier = journal.data?.storyTier ?? 0;
  const [selectedId, setSelectedId] = useAtom(selectedQuestIdAtom);
  const mission =
    missions.find((item) => item.id === selectedId) ?? journal.data?.mission;
  const resultPending = Object.values(pending).some(
    (entry) => entry.actorUserId === userId,
  );
  const isUrgent = mission?.status === "RECOVERED" || resultPending;

  return (
    <div className={page} style={{ overflowY: "auto" }}>
      <div className={styles.journal}>
        <header className={styles.pageHeader}>
          <div className={styles.telemetryTop}>
            <span>SHELTER // COMM-ARCHIVE</span>
            <span>CLEARANCE TIER {storyTier} / 6</span>
          </div>
          <h1>도시 운영 기록</h1>
          <p>거점 담당자 3인의 의뢰와 회수된 관측 기록을 확인합니다.</p>
        </header>

        {journal.isPending && <p>임무 통신을 불러오는 중입니다.</p>}
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
          <section className={styles.missionSection}>
            <div className={styles.sectionTopRow}>
              <small
                className={styles.statusBadge({
                  tone: isUrgent ? "negative" : statusTone(mission.status),
                })}
              >
                {resultPending ? "탐사 결과 확인 필요" : labels[mission.status]}
              </small>
              <span className={styles.codeTag}>TIER {mission.tier}</span>
            </div>

            <div className={styles.issuerRow}>
              <strong>{mission.issuerName}</strong>
              <span className={styles.codeTag}>{mission.issuerRole}</span>
            </div>

            <h2>{mission.title}</h2>

            <QuestChat key={`${userId}:${mission.id}`} questId={mission.id} />

            <div className={styles.metaGrid}>
              <div className={styles.metaCell}>
                <span>목표 경로</span>
                <strong>
                  {mission.targetLabel} → 중앙 탈출 지점 → 거점 보고
                </strong>
              </div>
              <div className={styles.metaCell}>
                <span>수락 지급품</span>
                <strong>{mission.supplyDescription}</strong>
              </div>
              <div className={styles.metaCell}>
                <span>보고 보상</span>
                <strong>{mission.rewardDescription}</strong>
              </div>
            </div>

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

        {missions.length > 1 && (
          <section className={styles.panel}>
            <div className={styles.sectionTopRow}>
              <h2>임무 수행 이력</h2>
              <span className={styles.codeTag}>
                CHAIN {missions.filter((m) => m.status === "COMPLETE").length} / {missions.length}
              </span>
            </div>
            <div className={styles.chainList}>
              {missions.map((item) => (
                <button
                  type="button"
                  className={styles.chainRowButton}
                  key={item.id}
                  aria-pressed={item.id === mission?.id}
                  onClick={() => setSelectedId(item.id)}
                >
                  <div className={styles.contactMeta}>
                    <span className={styles.chainTitle}>
                      {item.tier}차 · {item.title}
                    </span>
                    <span className={styles.chainSub}>
                      {item.issuerName} · {item.targetLabel} #{item.targetNodeId}
                    </span>
                  </div>
                  <span className={styles.chainBadges}>
                    {item.unread > 0 && (
                      <span className={styles.unreadDot} aria-label="새 연락" />
                    )}
                    <small className={styles.statusBadge({ tone: statusTone(item.status) })}>
                      {labels[item.status]}
                    </small>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className={styles.panel}>
          <div className={styles.sectionTopRow}>
            <h2>확인한 담당자</h2>
          </div>
          {journal.data?.contacts.map((contact) => (
            <div className={styles.contactRow} key={contact.id}>
              <div className={styles.contactMeta}>
                <span>
                  {contact.name} · {contact.role}
                </span>
                {contact.affiliation && (
                  <span className={styles.contactSub}>
                    {contact.affiliation}
                  </span>
                )}
              </div>
              {contact.entityId && (
                <span className={styles.codeTag}>개체 {contact.entityId}</span>
              )}
            </div>
          ))}
        </section>

        <section className={styles.panel}>
          <div className={styles.sectionTopRow}>
            <h2>회수·공개 기록</h2>
          </div>
          {journal.data?.records.length === 0 && <p>공개된 기록이 없습니다.</p>}
          {journal.data?.records.map((record) => (
            <article className={styles.article} key={record.id}>
              <div className={styles.articleHeader}>
                <h3>{record.title}</h3>
                {record.tier !== undefined && (
                  <span className={styles.codeTag}>TIER {record.tier}</span>
                )}
              </div>
              <p>{record.content}</p>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}

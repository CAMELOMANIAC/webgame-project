import { Link } from "@tanstack/react-router";
import { CENTRAL_EXTRACTION_NODE_ID } from "@webgame/types";
import { useAtomValue } from "jotai";
import { useEffect, useState } from "react";

import { selectedUserIdAtom } from "@/atoms/authAtom";
import { pendingNavigationAtom } from "@/atoms/pendingNavigationAtom";
import { ErrorToast } from "@/components/common/ErrorToast";
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
  const missions = journal.data?.missions ?? (mission ? [mission] : []);
  const storyTier = journal.data?.storyTier ?? 0;
  const resultPending = Object.values(pending).some(
    (entry) => entry.actorUserId === userId,
  );
  const locked =
    !!character.data?.raw.isRaiding ||
    resultPending ||
    accept.isPending ||
    report.isPending;
  const rawError = journal.error ?? accept.error ?? report.error;
  const [toastDismissed, setToastDismissed] = useState(false);

  useEffect(() => {
    if (rawError) {
      setToastDismissed(false);
    }
  }, [rawError]);

  const handleDismissToast = () => {
    setToastDismissed(true);
    accept.reset();
    report.reset();
  };

  const toastMessage = !toastDismissed && rawError ? rawError.message : null;
  const isUrgent = mission?.status === "RECOVERED" || resultPending;

  return (
    <div className={page} style={{ overflowY: "auto" }}>
      <ErrorToast message={toastMessage} onDismiss={handleDismissToast} />
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
                TIER {mission.tier} // NODE #{mission.targetNodeId}
              </span>
            </div>

            <div className={styles.issuerRow}>
              <strong>{mission.issuerName}</strong>
              <span className={styles.codeTag}>{mission.issuerRole}</span>
            </div>

            <h2>{mission.title}</h2>
            <p>{mission.briefing}</p>

            <div className={styles.metaGrid}>
              <div className={styles.metaCell}>
                <span>TARGET // 목표 경로</span>
                <strong>
                  {mission.targetLabel} #{mission.targetNodeId} → 중앙 탈출 지점 #
                  {CENTRAL_EXTRACTION_NODE_ID} → 거점 보고
                </strong>
              </div>
              <div className={styles.metaCell}>
                <span>SUPPLY // 수락 지급품</span>
                <strong>{mission.supplyDescription}</strong>
              </div>
              <div className={styles.metaCell}>
                <span>REWARD // 보고 보상</span>
                <strong>{mission.rewardDescription}</strong>
              </div>
            </div>

            {mode === "base" && mission.status === "OFFERED" && (
              <button
                type="button"
                className={styles.actionButton}
                disabled={locked}
                onClick={() => accept.mutate(mission.id)}
              >
                지급품 수령 및 임무 수락
              </button>
            )}
            {mode === "base" && mission.status === "READY" && (
              <button
                type="button"
                className={styles.actionButton}
                disabled={locked}
                onClick={() => report.mutate(mission.id)}
              >
                회수 기록 보고 · 보상 받기
              </button>
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

        {missions.length > 1 && (
          <section className={styles.panel}>
            <div className={styles.sectionTopRow}>
              <h2>임무 수행 이력</h2>
              <span className={styles.codeTag}>
                CHAIN {missions.filter((m) => m.status === "COMPLETE").length} / 3
              </span>
            </div>
            <div className={styles.chainList}>
              {missions.map((item) => (
                <div className={styles.chainRow} key={item.id}>
                  <div className={styles.contactMeta}>
                    <span className={styles.chainTitle}>
                      {item.tier}차 · {item.title}
                    </span>
                    <span className={styles.chainSub}>
                      {item.issuerName} · {item.targetLabel} #{item.targetNodeId}
                    </span>
                  </div>
                  <small
                    className={styles.statusBadge({
                      tone:
                        item.status === "COMPLETE"
                          ? "neutral"
                          : item.status === "RECOVERED"
                            ? "negative"
                            : "positive",
                    })}
                  >
                    {labels[item.status]}
                  </small>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className={styles.panel}>
          <div className={styles.sectionTopRow}>
            <h2>확인한 담당자</h2>
            <span className={styles.codeTag}>CONTACTS</span>
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
            <span className={styles.codeTag}>ARCHIVE</span>
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

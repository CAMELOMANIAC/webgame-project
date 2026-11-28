import { Link } from "@tanstack/react-router";
import type { JournalMissionItem, JournalView } from "@webgame/types";
import { useAtom, useAtomValue } from "jotai";
import { useEffect, useMemo, useState } from "react";

import { selectedUserIdAtom } from "@/atoms/authAtom";
import { pendingNavigationAtom } from "@/atoms/pendingNavigationAtom";
import { selectedQuestIdAtom } from "@/atoms/toastAtom";
import { page } from "@/styles/theme.css";
import { useJournal } from "@/utils/hooks/useJournal";

import * as styles from "./MissionJournal.css";
import { QuestChat } from "./questChat/QuestChat";

const STATUS_LABELS: Record<JournalMissionItem["status"], string> = {
  OFFERED: "수락 대기",
  ACTIVE: "회수 중",
  RECOVERED: "탈출 필요",
  READY: "보고 가능",
  COMPLETE: "보고 완료",
  LOCKED: "종료",
};

const STATUS_PRIORITY: Record<JournalMissionItem["status"], number> = {
  OFFERED: 1,
  RECOVERED: 2,
  READY: 3,
  ACTIVE: 4,
  COMPLETE: 5,
  LOCKED: 6,
};

function isActiveStatus(status: JournalMissionItem["status"]) {
  return status !== "COMPLETE" && status !== "LOCKED";
}

function statusTone(status: JournalMissionItem["status"]) {
  if (status === "RECOVERED") return "negative" as const;
  if (status === "COMPLETE" || status === "LOCKED") return "neutral" as const;
  return "positive" as const;
}

interface NpcThreadSummary {
  contactId: string;
  name: string;
  role: string;
  missions: JournalMissionItem[];
  primaryMission: JournalMissionItem | null;
  unread: number;
  preview: string;
  isIdle: boolean;
}

function buildNpcThreads(
  contacts: JournalView["contacts"],
  missions: JournalMissionItem[],
): NpcThreadSummary[] {
  const byContact = new Map<string, JournalMissionItem[]>();
  for (const mission of missions) {
    const list = byContact.get(mission.issuerContactId) ?? [];
    list.push(mission);
    byContact.set(mission.issuerContactId, list);
  }

  const knownIds = new Set<string>();
  const baseContacts: { id: string; name: string; role: string }[] = [];

  for (const contact of contacts) {
    // 비발주 인물(entityId가 있는 후반부 관측 대상)은 발주한 임무가 있을 때만 대화 목록에 포함
    if (contact.entityId && !byContact.has(contact.id)) continue;
    knownIds.add(contact.id);
    baseContacts.push({ id: contact.id, name: contact.name, role: contact.role });
  }

  for (const mission of missions) {
    if (knownIds.has(mission.issuerContactId)) continue;
    knownIds.add(mission.issuerContactId);
    baseContacts.push({
      id: mission.issuerContactId,
      name: mission.issuerName,
      role: mission.issuerRole,
    });
  }

  const threads = baseContacts.map((contact): NpcThreadSummary => {
    const npcMissions = byContact.get(contact.id) ?? [];
    const unread = npcMissions.reduce((sum, item) => sum + item.unread, 0);
    const activeMissions = npcMissions.filter((item) => isActiveStatus(item.status));
    const primaryMission =
      [...activeMissions].sort((a, b) => {
        if ((b.unread > 0) !== (a.unread > 0)) return b.unread > 0 ? 1 : -1;
        return STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
      })[0] ??
      npcMissions[npcMissions.length - 1] ??
      null;

    const isIdle = !primaryMission || !isActiveStatus(primaryMission.status);
    const preview = !primaryMission
      ? "연락 없음"
      : isIdle
        ? "진행 중인 의뢰 없음"
        : primaryMission.lastMessagePreview || primaryMission.title;

    return {
      contactId: contact.id,
      name: contact.name,
      role: contact.role,
      missions: npcMissions,
      primaryMission,
      unread,
      preview,
      isIdle,
    };
  });

  return threads.sort((a, b) => {
    if ((b.unread > 0) !== (a.unread > 0)) return b.unread > 0 ? 1 : -1;
    const prioA = a.primaryMission ? STATUS_PRIORITY[a.primaryMission.status] : 99;
    const prioB = b.primaryMission ? STATUS_PRIORITY[b.primaryMission.status] : 99;
    return prioA - prioB;
  });
}

export function MissionJournal() {
  const userId = useAtomValue(selectedUserIdAtom);
  const pending = useAtomValue(pendingNavigationAtom);
  const journal = useJournal();
  const [selectedQuestId, setSelectedQuestId] = useAtom(selectedQuestIdAtom);

  const [listTab, setListTab] = useState<"chats" | "records">("chats");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [goalExpanded, setGoalExpanded] = useState(false);

  const missions = useMemo(() => journal.data?.missions ?? [], [journal.data?.missions]);
  const contacts = useMemo(() => journal.data?.contacts ?? [], [journal.data?.contacts]);
  const records = useMemo(() => journal.data?.records ?? [], [journal.data?.records]);

  const npcThreads = useMemo(
    () => buildNpcThreads(contacts, missions),
    [contacts, missions],
  );

  // 토스트 등 외부에서 특정 questId를 지정해 진입하면 해당 NPC 채팅방으로 바로 연다.
  useEffect(() => {
    if (!selectedQuestId) return;
    const matched = missions.find((item) => item.id === selectedQuestId);
    if (matched) setSelectedContactId(matched.issuerContactId);
  }, [missions, selectedQuestId]);

  // 화면을 벗어날 때 선택 퀘스트 초기화(다음 탭 진입 시 목록부터 시작)
  useEffect(() => {
    return () => setSelectedQuestId(null);
  }, [setSelectedQuestId]);

  const resultPending = Object.values(pending).some(
    (entry) => entry.actorUserId === userId,
  );

  const selectedNpc = selectedContactId
    ? npcThreads.find((thread) => thread.contactId === selectedContactId) ?? null
    : null;

  const activeMission = selectedNpc
    ? (selectedNpc.missions.find((item) => item.id === selectedQuestId) ??
      selectedNpc.primaryMission)
    : null;

  const unreadContactCount = npcThreads.filter((thread) => thread.unread > 0).length;

  const handleOpenNpc = (thread: NpcThreadSummary) => {
    setSelectedContactId(thread.contactId);
    setSelectedQuestId(thread.primaryMission?.id ?? null);
    setGoalExpanded(false);
  };

  const handleBackToList = () => {
    setSelectedContactId(null);
    setSelectedQuestId(null);
    setGoalExpanded(false);
  };

  return (
    <div className={page} style={{ overflow: "hidden" }}>
      <div className={styles.shell}>
        {resultPending && (
          <Link to="/field" className={styles.pendingBanner}>
            <span>미확인 전투 결과가 있습니다</span>
            <span>확인 →</span>
          </Link>
        )}

        {!selectedNpc ? (
          <>
            <header className={styles.topBar}>
              <div className={styles.titleGroup}>
                <h1 className={styles.pageTitle}>통신</h1>
                {unreadContactCount > 0 && (
                  <span className={styles.unreadCountBadge} aria-label="새 연락 수">
                    {unreadContactCount}
                  </span>
                )}
              </div>

              <div className={styles.tabGroup} role="tablist" aria-label="통신 보기 전환">
                <button
                  type="button"
                  role="tab"
                  aria-selected={listTab === "chats"}
                  className={styles.tabButton({ active: listTab === "chats" })}
                  onClick={() => setListTab("chats")}
                >
                  대화
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={listTab === "records"}
                  className={styles.tabButton({ active: listTab === "records" })}
                  onClick={() => setListTab("records")}
                >
                  기록
                </button>
              </div>
            </header>

            <div className={styles.scrollBody}>
              {journal.isPending && (
                <p className={styles.emptyState}>통신 기록을 불러오는 중입니다.</p>
              )}

              {journal.isError && (
                <div className={styles.emptyState}>
                  <button
                    type="button"
                    className={styles.retryButton}
                    onClick={() => void journal.refetch()}
                  >
                    다시 불러오기
                  </button>
                </div>
              )}

              {!journal.isPending && !journal.isError && listTab === "chats" && (
                <div className={styles.npcList}>
                  {npcThreads.map((thread) => {
                    const showBadge =
                      thread.primaryMission && isActiveStatus(thread.primaryMission.status);
                    return (
                      <button
                        key={thread.contactId}
                        type="button"
                        className={styles.npcRow({ unread: thread.unread > 0 })}
                        onClick={() => handleOpenNpc(thread)}
                      >
                        <div className={styles.npcRowTop}>
                          <div className={styles.npcIdentity}>
                            <span className={styles.npcName({ idle: thread.isIdle })}>
                              {thread.name}
                            </span>
                            <span className={styles.npcRole}>{thread.role}</span>
                          </div>
                          <div className={styles.npcRowBadges}>
                            {thread.unread > 0 && (
                              <span className={styles.unreadDot} aria-label="새 연락" />
                            )}
                            {showBadge && thread.primaryMission && (
                              <small
                                className={styles.statusBadge({
                                  tone: statusTone(thread.primaryMission.status),
                                })}
                              >
                                {STATUS_LABELS[thread.primaryMission.status]}
                              </small>
                            )}
                          </div>
                        </div>
                        <p
                          className={styles.npcPreview({
                            emphasis:
                              thread.unread > 0
                                ? "unread"
                                : thread.isIdle
                                  ? "idle"
                                  : "normal",
                          })}
                        >
                          {thread.preview}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}

              {!journal.isPending && !journal.isError && listTab === "records" && (
                <div className={styles.recordsContainer}>
                  {records.length === 0 ? (
                    <p className={styles.emptyState}>공개된 기록이 없습니다.</p>
                  ) : (
                    records.map((record) => (
                      <article key={record.id} className={styles.recordCard}>
                        <div className={styles.recordHeader}>
                          <h2 className={styles.recordTitle}>{record.title}</h2>
                          {record.tier !== undefined && (
                            <span className={styles.codeTag}>TIER {record.tier}</span>
                          )}
                        </div>
                        <p className={styles.recordBody}>{record.content}</p>
                      </article>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <header className={styles.topBar}>
              <div className={styles.chatHeaderLeft}>
                <button
                  type="button"
                  className={styles.backButton}
                  aria-label="대화 목록으로 돌아가기"
                  onClick={handleBackToList}
                >
                  ←
                </button>
                <div className={styles.chatHeaderMeta}>
                  <span className={styles.npcName({ idle: false })}>
                    {selectedNpc.name}
                  </span>
                  <span className={styles.npcRole}>{selectedNpc.role}</span>
                </div>
              </div>
              {activeMission && (
                <small
                  className={styles.statusBadge({
                    tone: statusTone(activeMission.status),
                  })}
                >
                  {STATUS_LABELS[activeMission.status]}
                </small>
              )}
            </header>

            {selectedNpc.missions.length > 1 && (
              <div className={styles.questSwitcher} role="tablist" aria-label="의뢰 이력 선택">
                {selectedNpc.missions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={item.id === activeMission?.id}
                    className={styles.questChip({ active: item.id === activeMission?.id })}
                    onClick={() => {
                      setSelectedQuestId(item.id);
                      setGoalExpanded(false);
                    }}
                  >
                    <span>
                      {item.tier}차 · {item.title}
                    </span>
                    {item.unread > 0 && (
                      <span className={styles.unreadDot} aria-label="새 연락" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {activeMission && isActiveStatus(activeMission.status) && (
              <div className={styles.goalStrip}>
                <button
                  type="button"
                  className={styles.goalToggle}
                  aria-expanded={goalExpanded}
                  onClick={() => setGoalExpanded((prev) => !prev)}
                >
                  <span className={styles.goalSummary}>
                    목표 ·{" "}
                    <span className={styles.goalSummaryStrong}>
                      {activeMission.targetLabel} (#{activeMission.targetNodeId})
                    </span>
                  </span>
                  <span className={styles.goalChevron}>
                    {goalExpanded ? "접기 ▲" : "상세 ▼"}
                  </span>
                </button>
                {goalExpanded && (
                  <div className={styles.goalDetails}>
                    <div className={styles.goalDetailRow}>
                      <span className={styles.goalDetailLabel}>지급품</span>
                      <span className={styles.goalDetailValue}>
                        {activeMission.supplyDescription}
                      </span>
                    </div>
                    <div className={styles.goalDetailRow}>
                      <span className={styles.goalDetailLabel}>보상</span>
                      <span className={styles.goalDetailValue}>
                        {activeMission.rewardDescription}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeMission ? (
              <QuestChat key={`${userId}:${activeMission.id}`} questId={activeMission.id} />
            ) : (
              <div className={styles.scrollBody}>
                <p className={styles.emptyState}>아직 도착한 연락이 없습니다.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

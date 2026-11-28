import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import type { JournalMissionItem } from "@webgame/types";
import { useAtom, useAtomValue } from "jotai";
import { useEffect, useMemo, useState } from "react";

import { selectedUserIdAtom } from "@/atoms/authAtom";
import { pendingNavigationAtom } from "@/atoms/pendingNavigationAtom";
import { selectedQuestIdAtom } from "@/atoms/toastAtom";
import * as baseStyles from "@/components/lobby/BaseScreen.css";
import { page } from "@/styles/theme.css";
import { useJournal } from "@/utils/hooks/useJournal";

import * as styles from "./MissionJournal.css";
import {
  buildNpcThreads,
  isActiveStatus,
  type NpcThreadSummary,
  resolveMissionContactId,
  STATUS_LABELS,
  STATUS_PRIORITY,
} from "./missionThreads";

export function MissionJournal() {
  const userId = useAtomValue(selectedUserIdAtom);
  const pending = useAtomValue(pendingNavigationAtom);
  const journal = useJournal();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [selectedQuestId, setSelectedQuestId] = useAtom(selectedQuestIdAtom);

  const [listTab, setListTab] = useState<"chats" | "active">("chats");

  const missions = useMemo(() => journal.data?.missions ?? [], [journal.data?.missions]);
  const contacts = useMemo(() => journal.data?.contacts ?? [], [journal.data?.contacts]);

  const npcThreads = useMemo(
    () => buildNpcThreads(contacts, missions),
    [contacts, missions],
  );

  const activeMissions = useMemo(
    () =>
      missions
        .filter((item) => isActiveStatus(item.status))
        .sort((a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status]),
    [missions],
  );

  const inField = pathname.startsWith("/field");

  // 토스트 등 외부에서 특정 questId를 지정해 목록으로 진입한 경우 해당 채팅 페이지로 바로 이동한다.
  useEffect(() => {
    if (!selectedQuestId) return;
    const matched = missions.find((item) => item.id === selectedQuestId);
    if (!matched) return;
    const contactId = resolveMissionContactId(matched, contacts);
    setSelectedQuestId(null);
    void navigate({
      to: inField ? "/field/quest/$contactId" : "/base/quest/$contactId",
      params: { contactId },
      search: { questId: matched.id },
      replace: true,
    });
  }, [contacts, inField, missions, navigate, selectedQuestId, setSelectedQuestId]);

  const resultPending = Object.values(pending).some(
    (entry) => entry.actorUserId === userId,
  );

  const unreadContactCount = npcThreads.filter((thread) => thread.unread > 0).length;

  const handleOpenNpc = (thread: NpcThreadSummary) => {
    setSelectedQuestId(null);
    void navigate({
      to: inField ? "/field/quest/$contactId" : "/base/quest/$contactId",
      params: { contactId: thread.contactId },
      search: thread.primaryMission ? { questId: thread.primaryMission.id } : {},
    });
  };

  const handleOpenMission = (mission: JournalMissionItem) => {
    const contactId = resolveMissionContactId(mission, contacts);
    setSelectedQuestId(null);
    void navigate({
      to: inField ? "/field/quest/$contactId" : "/base/quest/$contactId",
      params: { contactId },
      search: { questId: mission.id },
    });
  };

  return (
    <div className={`${page} ${baseStyles.scrollPage}`}>
      <div className={styles.journalContainer}>
        <header className={baseStyles.headerArea}>
          <div className={styles.headerTopRow}>
            <span className={baseStyles.subTitle}>SHELTER // COMM-ARCHIVE</span>
          </div>
          <div className={styles.headerTitleRow}>
            <h1 className={baseStyles.mainTitle}>임무 통신</h1>
            {unreadContactCount > 0 && (
              <span className={styles.unreadCountBadge} aria-label="새 연락 수">
                NEW {unreadContactCount}
              </span>
            )}
          </div>
          <p className={baseStyles.leadText}>
            거점 담당자와의 통신 및 진행 중인 임무 요약을 확인합니다.
          </p>
        </header>

        {resultPending && (
          <Link to="/field" className={styles.pendingBanner}>
            <span>미확인 전투 결과가 있습니다</span>
            <span className={styles.pendingBannerAction}>확인 →</span>
          </Link>
        )}

        <div className={styles.toolbar}>
          <div className={styles.tabGroup} role="tablist" aria-label="통신 보기 전환">
            <span
              className={styles.toggleThumb({
                position: listTab === "active" ? "right" : "left",
              })}
              aria-hidden="true"
            />
            <button
              type="button"
              role="tab"
              aria-selected={listTab === "chats"}
              className={styles.modeTab({ active: listTab === "chats" })}
              onClick={() => setListTab("chats")}
            >
              통신 채널
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={listTab === "active"}
              className={styles.modeTab({ active: listTab === "active" })}
              onClick={() => {
                setListTab("active");
                setSelectedQuestId(null);
              }}
            >
              진행 중 ({activeMissions.length})
            </button>
          </div>
        </div>

        {journal.isPending && (
          <div className={styles.panelBox}>
            <p className={styles.emptyState}>통신 기록을 불러오는 중입니다.</p>
          </div>
        )}

        {journal.isError && (
          <div className={styles.panelBox}>
            <div className={styles.emptyState}>
              <button
                type="button"
                className={styles.retryButton}
                onClick={() => void journal.refetch()}
              >
                다시 불러오기
              </button>
            </div>
          </div>
        )}

        {!journal.isPending && !journal.isError && listTab === "chats" && (
          <div className={styles.npcCardList} aria-label="담당자 목록">
            {npcThreads.map((thread) => (
              <button
                key={thread.contactId}
                type="button"
                className={styles.npcCard({
                  unread: thread.unread > 0,
                })}
                onClick={() => handleOpenNpc(thread)}
              >
                {thread.portraitSrc && (
                  <div className={styles.npcPortraitWrap} aria-hidden="true">
                    <img
                      src={thread.portraitSrc}
                      alt=""
                      className={styles.npcPortraitImage}
                    />
                  </div>
                )}
                <div
                  className={styles.npcCardBody({
                    withPortrait: Boolean(thread.portraitSrc),
                  })}
                >
                  <div className={styles.npcRowTop}>
                    <div className={styles.npcIdentity}>
                      <span className={styles.npcName({ idle: thread.isIdle })}>
                        {thread.name}
                      </span>
                    </div>
                    {thread.unread > 0 && (
                      <div className={styles.npcRowBadges}>
                        <span className={styles.unreadDot} aria-label="새 연락" />
                      </div>
                    )}
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
                </div>
              </button>
            ))}
          </div>
        )}

        {!journal.isPending && !journal.isError && listTab === "active" && (
          <div className={styles.recordsGrid} aria-label="진행 중인 임무 목록">
            {activeMissions.length === 0 ? (
              <div className={styles.panelBox}>
                <p className={styles.emptyState}>진행 중인 임무가 없습니다.</p>
              </div>
            ) : (
              activeMissions.map((mission) => (
                <button
                  key={mission.id}
                  type="button"
                  className={styles.recordCard}
                  onClick={() => handleOpenMission(mission)}
                >
                  <div className={styles.recordHeader}>
                    <h2 className={styles.recordTitle}>{mission.title}</h2>
                    <span className={styles.codeTag}>
                      {STATUS_LABELS[mission.status]}
                    </span>
                  </div>
                  <p className={styles.recordBody}>
                    {mission.briefing ||
                      mission.lastMessagePreview ||
                      `${mission.targetLabel} (#${mission.targetNodeId})`}
                  </p>
                  <div className={styles.missionMetaList}>
                    <span>
                      TARGET //{" "}
                      <span className={styles.missionMetaStrong}>
                        {mission.targetLabel} (#{mission.targetNodeId})
                      </span>
                    </span>
                    <span>
                      담당{" "}
                      <span className={styles.missionMetaStrong}>
                        {mission.issuerName}
                      </span>
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

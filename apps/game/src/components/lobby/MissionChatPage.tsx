import { useNavigate } from "@tanstack/react-router";
import { useAtomValue } from "jotai";
import { useMemo } from "react";

import { selectedUserIdAtom } from "@/atoms/authAtom";
import { page } from "@/styles/theme.css";
import { useJournal } from "@/utils/hooks/useJournal";

import * as styles from "./MissionJournal.css";
import { buildNpcThreads } from "./missionThreads";
import { QuestChat } from "./questChat/QuestChat";

interface MissionChatPageProps {
  contactId: string;
  questId?: string;
  backTo: "/base/quest" | "/field/quest";
}

export function MissionChatPage({ contactId, questId, backTo }: MissionChatPageProps) {
  const userId = useAtomValue(selectedUserIdAtom);
  const journal = useJournal();
  const navigate = useNavigate();

  const missions = useMemo(() => journal.data?.missions ?? [], [journal.data?.missions]);
  const contacts = useMemo(() => journal.data?.contacts ?? [], [journal.data?.contacts]);

  const npcThreads = useMemo(
    () => buildNpcThreads(contacts, missions),
    [contacts, missions],
  );

  const thread = npcThreads.find((item) => item.contactId === contactId) ?? null;

  const activeMission = thread
    ? ((questId ? thread.missions.find((item) => item.id === questId) : undefined) ??
      thread.primaryMission)
    : null;

  const handleBack = () => {
    void navigate({ to: backTo });
  };

  return (
    <div className={`${page} ${styles.chatPageRoot}`}>
      <div className={styles.chatPageContainer}>
        <header className={styles.chatHeader}>
          <div className={styles.chatHeaderLeft}>
            <button
              type="button"
              className={styles.backButton}
              aria-label="대화 목록으로 돌아가기"
              onClick={handleBack}
            >
              <span className={styles.backArrow}>←</span>
            </button>
            {thread?.portraitSrc && (
              <div className={styles.chatHeaderPortraitWrap}>
                <img
                  src={thread.portraitSrc}
                  alt={thread.name}
                  className={styles.chatHeaderPortraitImage}
                />
              </div>
            )}
            <div>
              <h1 className={styles.chatHeaderTitle}>
                {thread ? thread.name : "임무 통신"}
              </h1>
            </div>
          </div>
        </header>

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

        {!journal.isPending && !journal.isError && (
          <section className={styles.chatPane} aria-label="임무 대화">
            {thread ? (
              activeMission ? (
                <QuestChat
                  key={`${userId}:${activeMission.id}`}
                  questId={activeMission.id}
                />
              ) : (
                <div className={styles.chatEmptyWrap}>
                  <p className={styles.emptyState}>아직 도착한 연락이 없습니다.</p>
                </div>
              )
            ) : (
              <div className={styles.chatEmptyWrap}>
                <p className={styles.emptyState}>선택된 통신 채널이 없습니다.</p>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

import { useLocation, useNavigate } from "@tanstack/react-router";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";

import { selectedUserIdAtom } from "@/atoms/authAtom";
import { pendingNavigationAtom } from "@/atoms/pendingNavigationAtom";
import { isCombatAtom, isNavigatingAtom } from "@/atoms/raidAtom";
import { selectedQuestIdAtom } from "@/atoms/toastAtom";
import { resolveMissionContactId } from "@/components/lobby/missionThreads";
import { useJournal } from "@/utils/hooks/useJournal";
import { useToast } from "@/utils/hooks/useToast";

const STORAGE_KEY = "webgame.notifiedQuestMessages";

type Notified = Record<string, Record<string, number>>;

function readNotified(): Notified {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "{}") as Notified;
  } catch {
    return {};
  }
}

function writeNotified(value: Notified) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // 저장소를 쓸 수 없으면 이번 화면에서만 중복을 막는다.
  }
}

/**
 * 담당자에게서 새 연락이 오면 화면 위쪽에 메시지형 토스트를 띄운다.
 * 이동·전투 재생 중에는 미뤘다가 끝난 뒤 띄우고, 같은 연락은 한 번만 띄운다.
 */
export function QuestMessageNotifier({ inRaid }: { inRaid: boolean }) {
  const userId = useAtomValue(selectedUserIdAtom);
  const isCombat = useAtomValue(isCombatAtom);
  const isNavigating = useAtomValue(isNavigatingAtom);
  const pendingNavigation = useAtomValue(pendingNavigationAtom);
  const setSelectedQuest = useSetAtom(selectedQuestIdAtom);
  const journal = useJournal();
  const toast = useToast();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const normalizedPath = pathname.replace(/\/$/, "");
  const onQuestPage =
    normalizedPath === "/field/quest" ||
    normalizedPath.startsWith("/field/quest/") ||
    normalizedPath === "/base/quest" ||
    normalizedPath.startsWith("/base/quest/");
  const messages = journal.data?.unreadMessages;
  const missions = journal.data?.missions;
  const contacts = journal.data?.contacts;
  const hasPendingNavigation = Object.values(pendingNavigation).some(
    (entry) => entry.actorUserId === userId,
  );
  const busy = isCombat || isNavigating || hasPendingNavigation;

  useEffect(() => {
    if (!userId || !messages || busy) return;
    const notified = readNotified();
    const mine = { ...(notified[userId] ?? {}) };
    let changed = false;
    for (const message of messages) {
      if ((mine[message.questId] ?? 0) >= message.seq) continue;
      mine[message.questId] = message.seq;
      changed = true;
      if (onQuestPage) continue;
      toast.message({
        key: `quest-message:${message.questId}`,
        speakerName: message.speakerName,
        preview: message.preview,
        onOpen: () => {
          const matched = missions?.find((item) => item.id === message.questId);
          if (matched && contacts) {
            const contactId = resolveMissionContactId(matched, contacts);
            void navigate({
              to: inRaid ? "/field/quest/$contactId" : "/base/quest/$contactId",
              params: { contactId },
              search: { questId: message.questId },
            });
            return;
          }
          setSelectedQuest(message.questId);
          void navigate({ to: inRaid ? "/field/quest" : "/base/quest" });
        },
      });
    }
    if (changed) writeNotified({ ...notified, [userId]: mine });
  }, [busy, contacts, inRaid, messages, missions, navigate, onQuestPage, setSelectedQuest, toast, userId]);

  return null;
}

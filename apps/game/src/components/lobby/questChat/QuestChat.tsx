import type { DialogueEntry, DialoguePace } from "@webgame/types";
import { useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  useAdvanceQuestDialogue,
  useMarkQuestDialogueRead,
  useQuestDialogue,
} from "@/utils/hooks/useQuestDialogue";

import * as styles from "./QuestChat.css";

const MS_PER_CHAR: Record<DialoguePace, number> = {
  INSTANT: 0,
  FAST: 15,
  NORMAL: 35,
  SLOW: 70,
};

/** 입력 중 표시 시간. 글자 수에 비례하되 상·하한을 둔다. */
function typingDuration(entry: Pick<DialogueEntry, "pace" | "text">) {
  const perChar = MS_PER_CHAR[entry.pace];
  if (perChar === 0) return 0;
  return Math.min(2500, Math.max(300, entry.text.length * perChar));
}

function revealsInstantly(entry: DialogueEntry) {
  return entry.speaker.kind !== "NPC" || entry.pace === "INSTANT";
}

export function QuestChat({ questId }: { questId: string }) {
  const dialogue = useQuestDialogue(questId);
  const advance = useAdvanceQuestDialogue(questId);
  const markRead = useMarkQuestDialogueRead(questId);
  const reduceMotion = useReducedMotion();
  const data = dialogue.data;
  const transcript = useMemo(() => data?.transcript ?? [], [data]);

  // 처음 열었을 때 이미 읽은 줄은 바로 보이고, 그 뒤에 도착한 줄만 연출한다.
  const seenSeqRef = useRef<number | null>(null);
  if (seenSeqRef.current === null && data) seenSeqRef.current = data.readSeq;
  const [shown, setShown] = useState(0);
  const [typing, setTyping] = useState(false);
  const threadRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (shown >= transcript.length) return;
    const seen = seenSeqRef.current ?? 0;
    let next = shown;
    while (
      next < transcript.length &&
      (reduceMotion || transcript[next]!.seq <= seen || revealsInstantly(transcript[next]!))
    )
      next += 1;
    if (next !== shown) {
      setShown(next);
      return;
    }
    const entry = transcript[shown]!;
    setTyping(true);
    const timer = window.setTimeout(() => {
      setTyping(false);
      setShown(shown + 1);
    }, entry.pauseBeforeMs + typingDuration(entry));
    return () => window.clearTimeout(timer);
  }, [shown, transcript, reduceMotion]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [shown, typing]);

  const allShown = data !== undefined && shown >= transcript.length;
  const { mutate: markReadMutate } = markRead;
  useEffect(() => {
    if (allShown && data && data.readSeq < data.seq) markReadMutate(data.seq);
  }, [allShown, data, markReadMutate]);

  if (dialogue.isPending) return <p className={styles.statusLine}>임무 통신을 불러오는 중입니다.</p>;
  if (!data) return null;

  const pending = data.pending;
  const choices = pending.kind === "CHOICE" || pending.kind === "BASE_ONLY" ? pending.choices : [];

  return (
    <div>
      <div className={styles.thread} ref={threadRef} aria-live="polite">
        {transcript.slice(0, shown).map((entry, index) => (
          <ChatEntry key={`${entry.seq}-${index}`} entry={entry} />
        ))}
        {typing && (
          <div className={styles.typing} aria-hidden>
            <span className={styles.typingDot} />
            <span className={styles.typingDot} />
            <span className={styles.typingDot} />
          </div>
        )}
      </div>
      {allShown && choices.length > 0 && (
        <div className={styles.choiceList}>
          {choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              className={styles.choiceButton}
              disabled={!choice.enabled || advance.isPending}
              onClick={() => advance.mutate({ choiceId: choice.id, expectedSeq: data.seq })}
            >
              <span>{choice.label}</span>
              {choice.conditionLabel && (
                <span className={styles.choiceCondition}>조건: {choice.conditionLabel}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ChatEntry({ entry }: { entry: DialogueEntry }) {
  if (entry.speaker.kind === "SYSTEM")
    return (
      <div className={styles.entry({ side: "system" })}>
        <p className={styles.systemLine}>{entry.text}</p>
      </div>
    );
  if (entry.speaker.kind === "PLAYER")
    return (
      <div className={styles.entry({ side: "player" })}>
        <p className={styles.bubble({ side: "player" })}>{entry.text}</p>
      </div>
    );
  return (
    <div className={styles.entry({ side: "npc" })}>
      <div className={styles.speakerRow}>
        <span className={styles.speakerName}>{entry.speaker.name}</span>
        <span className={styles.speakerRole}>{entry.speaker.role}</span>
      </div>
      <p className={styles.bubble({ side: "npc" })}>{entry.text}</p>
    </div>
  );
}

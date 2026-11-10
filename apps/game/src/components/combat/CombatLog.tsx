import { useAtomValue } from "jotai";
import { AnimatePresence, motion } from "motion/react";

import { battleLogAtom, processedEventsAtom } from "@/atoms/globalAtom";

import * as styles from "./CombatLog.css";

const CombatLog = () => {
  const processedEvents = useAtomValue(processedEventsAtom);
  const battle = useAtomValue(battleLogAtom);

  const logHistory = processedEvents.filter((e) => "actorId" in e).slice(-10);

  return (
    <div className={styles.combatWidget}>
      <div className={styles.headerRow}>
        <div className={styles.titleGroup}>
          <span className={styles.hostileDot} />
          <h3 className={styles.subTitle}>
            {battle?.encounter?.kind === "GHOST" ? "고스트 조우" : "교전 기록"}
          </h3>
        </div>
        <span className={styles.statusBadge}>HOSTILE · 전투 재생 중</span>
      </div>

      {battle?.encounter && (
        <p className={styles.encounter}>
          <strong className={styles.encounterName}>
            {battle.encounter.name}
          </strong>
          {battle.encounter.kind === "NPC" && (
            <span className={styles.encounterMeta}>
              {battle.encounter.faction} · {battle.encounter.role} ·{" "}
              {battle.encounter.reason}
            </span>
          )}
          {battle.encounter.kind === "GHOST" && (
            <span className={styles.encounterMeta}>
              개체{" "}
              {battle.encounter.sourceCharacterId?.slice(0, 8) ?? "기록"} ·{" "}
              {battle.encounter.recordedRound}라운드 기록 ·{" "}
              {battle.encounter.recordedAt
                ? new Date(battle.encounter.recordedAt).toLocaleString("ko-KR")
                : ""}
            </span>
          )}
        </p>
      )}

      <ul className={styles.actionLogList}>
        <AnimatePresence initial={false} mode="popLayout">
          {[...logHistory].reverse().map((event) => (
            <motion.li
              key={`${event.id}-${event.timestamp}`}
              className={styles.actionLogItem}
              layout
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
            >
              <p className={styles.actionLogType}>{event.type}</p>
              <p className={styles.actionLogActor}>
                {"actorId" in event
                  ? (battle?.initialState.players.find(
                      (player) => player.id === event.actorId,
                    )?.name ?? event.actorId)
                  : "SYSTEM"}
              </p>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
};

export default CombatLog;

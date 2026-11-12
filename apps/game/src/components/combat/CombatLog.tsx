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
        <h3 className={styles.subTitle}>
          {battle?.encounter?.kind === "GHOST" ? "고스트 조우" : "교전 기록"}
        </h3>
      </div>

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
              <div className={styles.actionLogPortrait} aria-hidden="true" />
              <div className={styles.actionLogText}>
                <p className={styles.actionLogType}>{event.type}</p>
                <p className={styles.actionLogActor}>
                  {"actorId" in event
                    ? (battle?.initialState.players.find(
                        (player) => player.id === event.actorId,
                      )?.name ?? event.actorId)
                    : "SYSTEM"}
                </p>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
};

export default CombatLog;

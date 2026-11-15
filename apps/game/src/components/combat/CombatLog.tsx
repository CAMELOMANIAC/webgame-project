import { useAtomValue } from "jotai";
import { AnimatePresence, motion } from "motion/react";

import { battleLogAtom, processedEventsAtom } from "@/atoms/globalAtom";

import * as styles from "./CombatLog.css";

const CombatLog = () => {
  const processedEvents = useAtomValue(processedEventsAtom);
  const battle = useAtomValue(battleLogAtom);

  const logHistory = processedEvents
    .filter((e) => "actorId" in e || e.type === "SHIELD")
    .slice(-10);

  return (
    <div className={styles.combatWidget}>
      <div className={styles.headerRow}>
        <h3 className={styles.subTitle}>전투 로그</h3>
      </div>

      <ul className={styles.actionLogList}>
        <AnimatePresence initial={false} mode="popLayout">
          {[...logHistory].reverse().map((event) => {
            const participantId =
              "actorId" in event
                ? event.actorId
                : event.type === "SHIELD"
                  ? event.targetId
                  : null;
            const actorName = participantId
              ? (battle?.initialState.players.find(
                  (player) => player.id === participantId,
                )?.name ?? participantId)
              : "SYSTEM";

            return (
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
                  <p className={styles.actionLogType}>
                    {event.type === "SYNERGY"
                      ? `SYNERGY [${event.sourceSlotIndex + 1}→${event.targetSlotIndices.map((idx) => idx + 1).join(",")}]`
                      : event.type === "SHIELD"
                        ? `SHIELD +${event.amount}`
                        : event.type}
                  </p>
                  <p className={styles.actionLogActor}>{actorName}</p>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </div>
  );
};

export default CombatLog;

import { useAtomValue } from "jotai";
import { AnimatePresence, motion } from "motion/react";

import { battleLogAtom, processedEventsAtom } from "@/atoms/globalAtom";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";

import * as styles from "./CombatLog.css";

const CombatLog = () => {
  const processedEvents = useAtomValue(processedEventsAtom);
  const battle = useAtomValue(battleLogAtom);
  const { data: characterData } = useGetCharacter();
  const characterId = characterData?.raw.id;
  const selfPlayer = battle?.initialState.players.find(
    (player) => player.id === characterId,
  );

  const logHistory = processedEvents
    .filter(
      (e) => e.type === "ATTACK" || e.type === "SHIELD" || e.type === "HEAL",
    )
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
                : event.type === "SHIELD" || event.type === "HEAL"
                  ? event.targetId
                  : null;
            const actorPlayer = participantId
              ? battle?.initialState.players.find(
                  (player) => player.id === participantId,
                )
              : undefined;
            const actorName = actorPlayer?.name ?? participantId ?? "SYSTEM";
            const role: "self" | "ally" | "enemy" =
              actorPlayer && actorPlayer.id === characterId
                ? "self"
                : actorPlayer &&
                    selfPlayer &&
                    actorPlayer.teamId === selfPlayer.teamId
                  ? "ally"
                  : "enemy";
            const mirrored = role !== "enemy";

            return (
              <motion.li
                key={`${event.id}-${event.timestamp}`}
                className={styles.actionLogItem({ role })}
                layout
                initial={{ opacity: 0, x: mirrored ? 12 : -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: mirrored ? -12 : 12 }}
              >
                <div
                  className={styles.actionLogPortrait({ mirrored })}
                  aria-hidden="true"
                />
                <div className={styles.actionLogText({ mirrored })}>
                  <p className={styles.actionLogType}>
                    {event.type === "SHIELD"
                      ? `SHIELD +${event.amount}`
                      : event.type === "HEAL"
                        ? `HEAL +${event.amount}`
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

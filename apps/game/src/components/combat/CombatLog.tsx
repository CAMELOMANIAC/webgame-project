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

  const logEntries = processedEvents
    .flatMap((event, index) => {
      if (
        event.type !== "ATTACK" &&
        event.type !== "SHIELD" &&
        event.type !== "HEAL"
      ) {
        return [];
      }

      let damageAmount: number | null = null;
      if (event.type === "ATTACK") {
        for (let i = index + 1; i < processedEvents.length; i++) {
          const next = processedEvents[i]!;
          if (next.timestamp !== event.timestamp) break;
          if (next.type === "ATTACK") break;
          if (next.type === "DAMAGE" && next.targetId === event.targetId) {
            damageAmount = next.amount;
            break;
          }
        }
      }

      return [{ event, damageAmount }];
    })
    .slice(-10);

  return (
    <div className={styles.combatWidget}>
      <div className={styles.headerRow}>
        <h3 className={styles.subTitle}>전투 로그</h3>
      </div>

      <ul className={styles.actionLogList}>
        <AnimatePresence initial={false} mode="popLayout">
          {[...logEntries].reverse().map(({ event, damageAmount }) => {
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

            const title =
              event.type === "ATTACK"
                ? (actorPlayer?.weapons?.[event.weaponIndex]?.name ?? "공격")
                : event.type === "SHIELD"
                  ? "보호막"
                  : "회복";

            const amountText =
              event.type === "ATTACK"
                ? damageAmount !== null
                  ? `-${damageAmount}`
                  : ""
                : `+${event.amount}`;

            const amountTone: "damage" | "heal" | "shield" | "neutral" =
              event.type === "ATTACK"
                ? damageAmount !== null && damageAmount > 0
                  ? "damage"
                  : "neutral"
                : event.type === "HEAL"
                  ? "heal"
                  : "shield";

            return (
              <motion.li
                key={`${event.id}-${event.timestamp}`}
                className={styles.actionLogItem({ role })}
                layout
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
              >
                <div
                  className={styles.actionLogPortrait}
                  aria-hidden="true"
                />
                <div className={styles.actionLogText}>
                  <div className={styles.actionLogHeader}>
                    <span className={styles.actionLogTitle}>{title}</span>
                    {amountText && (
                      <span
                        className={styles.actionLogAmount({ tone: amountTone })}
                      >
                        {amountText}
                      </span>
                    )}
                  </div>
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

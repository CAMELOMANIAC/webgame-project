import { AnimatePresence, motion } from "motion/react";

import * as styles from "./RetreatButton.css";

export const RETREAT_STATUS = {
  DETECTED: "교전시작",
  PREPARING: "경로확보 중",
  READY: "퇴각 가능",
  EXPIRED: "시간 만료",
} as const;

export type RetreatStatusKey = keyof typeof RETREAT_STATUS;
export type RetreatStatus = (typeof RETREAT_STATUS)[RetreatStatusKey];

export interface RetreatButtonProps {
  gauge: number;
  expired?: boolean;
  countdown?: { endsAt: number; durationMs: number };
  onRetreat?: () => void;
}

export const RetreatButton = ({
  gauge,
  expired,
  countdown,
  onRetreat,
}: RetreatButtonProps) => {
  const statusKey: RetreatStatusKey = expired
    ? "EXPIRED"
    : countdown || (gauge >= 100 && onRetreat)
      ? "READY"
      : gauge > 0
        ? "PREPARING"
        : "DETECTED";

  const retreatStatus = RETREAT_STATUS[statusKey];
  const isReady = statusKey === "READY";
  const remainingMs = countdown
    ? Math.max(0, countdown.endsAt - performance.now())
    : 0;

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={styles.button({ status: statusKey })}
        onClick={isReady ? onRetreat : undefined}
        disabled={!isReady || !onRetreat}
      >
        <div className={styles.contentHost}>
          <AnimatePresence initial={false}>
            <motion.div
              key={retreatStatus}
              initial={{ y: "-120%", opacity: 0 }}
              animate={{ y: "0%", opacity: 1 }}
              exit={{ y: "120%", opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className={styles.contentRow}
            >
              <span className={styles.statusDot({ status: statusKey })} />
              <span>{retreatStatus}</span>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className={styles.track({ ready: isReady })}>
          {statusKey === "PREPARING" && (
            <motion.div
              className={styles.gaugeBar({ status: statusKey })}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(0, gauge))}%` }}
              transition={{ type: "tween", ease: "linear" }}
            />
          )}
          {isReady && countdown && (
            <motion.div
              key={countdown.endsAt}
              className={styles.gaugeBar({ status: statusKey })}
              initial={{
                width: `${Math.min(100, (100 * remainingMs) / countdown.durationMs)}%`,
              }}
              animate={{ width: "0%" }}
              transition={{
                type: "tween",
                ease: "linear",
                duration: remainingMs / 1_000,
              }}
            />
          )}
          <div className={styles.segmentMask({ ready: isReady })} />
        </div>
      </button>
    </div>
  );
};

export default RetreatButton;
export { RetreatButton as RetreadButton };

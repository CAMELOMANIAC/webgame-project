import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

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
  pending?: boolean;
  onRetreat?: () => void;
  onContinue?: () => void;
}

export const RetreatButton = ({
  gauge,
  expired,
  countdown,
  pending = false,
  onRetreat,
  onContinue,
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

  const countdownBarRef = useRef<HTMLDivElement | null>(null);
  const [isDepleted, setIsDepleted] = useState(false);

  useEffect(() => {
    if (!isReady || !countdown) {
      setIsDepleted(false);
      return;
    }

    let frameId = 0;

    const updateBar = () => {
      const remaining = Math.max(0, countdown.endsAt - performance.now());
      const progress =
        countdown.durationMs > 0 ? Math.min(1, remaining / countdown.durationMs) : 0;

      if (remaining <= 0) {
        setIsDepleted(true);
        return;
      }

      setIsDepleted(false);
      if (countdownBarRef.current) {
        countdownBarRef.current.style.transform = `scaleX(${progress})`;
      }
      frameId = requestAnimationFrame(updateBar);
    };

    updateBar();

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [isReady, countdown]);

  const isAwaitingServer = isReady && (pending || isDepleted);

  useEffect(() => {
    if (isAwaitingServer && countdownBarRef.current) {
      countdownBarRef.current.style.transform = "scaleX(1)";
    }
  }, [isAwaitingServer]);

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={styles.button({ status: statusKey })}
        onClick={isReady && !pending ? onRetreat : undefined}
        disabled={!isReady || !onRetreat || pending}
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
              <span
                className={styles.statusDot({
                  status: statusKey,
                  blinking: isAwaitingServer,
                })}
              />
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
            <div
              ref={countdownBarRef}
              className={styles.gaugeBar({
                status: statusKey,
                blinking: isAwaitingServer,
              })}
            />
          )}
          <div className={styles.segmentMask({ ready: isReady })} />
        </div>
      </button>
      {isReady && onContinue && (
        <button
          type="button"
          className={styles.continueButton}
          onClick={!pending ? onContinue : undefined}
          disabled={pending}
        >
          계속 싸우기
        </button>
      )}
    </div>
  );
};

export default RetreatButton;
export { RetreatButton as RetreadButton };

import { AnimatePresence, motion } from "motion/react";
import { FaRunning } from "react-icons/fa";
import { ImWarning } from "react-icons/im";
import { MdRadar } from "react-icons/md";

import * as styles from "./RetreatButton.css";

export const RETREAT_STATUS = {
  DETECTED: "조우 : 적 개체 감지",
  PREPARING: "경로 확보 : 퇴각 준비 중",
  READY: "준비 : 퇴각 가능",
  EXPIRED: "퇴각 불가 : 시간 만료",
} as const;

export type RetreatStatus =
  (typeof RETREAT_STATUS)[keyof typeof RETREAT_STATUS];

export interface RetreatButtonProps {
  gauge: number;
  expired?: boolean;
  countdown?: { endsAt: number; durationMs: number };
  onRetreat?: () => void;
}

export const RetreatButton = ({ gauge, expired, countdown, onRetreat }: RetreatButtonProps) => {
  const getStatus = (): RetreatStatus => {
    if (expired) return RETREAT_STATUS.EXPIRED;
    if (countdown || (gauge >= 100 && onRetreat)) return RETREAT_STATUS.READY;
    if (gauge > 0) return RETREAT_STATUS.PREPARING;
    return RETREAT_STATUS.DETECTED;
  };

  const retreatStatus = getStatus();
  const remainingMs = countdown ? Math.max(0, countdown.endsAt - performance.now()) : 0;

  const themeVariant =
    retreatStatus === RETREAT_STATUS.READY
      ? "READY"
      : retreatStatus === RETREAT_STATUS.PREPARING
        ? "PENDING"
        : "DANGER";

  return (
    <div className={styles.container}>
      <motion.button
        type="button"
        layout
        transition={{ type: "spring", duration: 0.5, bounce: 0 }}
        className={styles.buttonModal({ theme: themeVariant })}
        onClick={retreatStatus === RETREAT_STATUS.READY ? onRetreat : undefined}
        disabled={retreatStatus !== RETREAT_STATUS.READY || !onRetreat}
      >
        {retreatStatus === RETREAT_STATUS.PREPARING && (
          <motion.div
            className={styles.gaugeBar}
            initial={{ width: 0 }}
            animate={{ width: `${gauge}%` }}
            transition={{ type: "tween", ease: "linear" }}
          />
        )}
        {retreatStatus === RETREAT_STATUS.READY && countdown && (
          <motion.div
            key={countdown.endsAt}
            className={styles.gaugeBar}
            initial={{ width: `${Math.min(100, 100 * remainingMs / countdown.durationMs)}%` }}
            animate={{ width: "0%" }}
            transition={{ type: "tween", ease: "linear", duration: remainingMs / 1_000 }}
          />
        )}
        <AnimatePresence mode="popLayout">
          <motion.div
            key={retreatStatus}
            initial={{ y: "-100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={styles.content}
          >
            {retreatStatus === RETREAT_STATUS.READY && <FaRunning />}
            {(retreatStatus === RETREAT_STATUS.DETECTED ||
              retreatStatus === RETREAT_STATUS.EXPIRED) && <ImWarning />}
            {retreatStatus === RETREAT_STATUS.PREPARING && <MdRadar />}
            <span>{retreatStatus}</span>
          </motion.div>
        </AnimatePresence>
      </motion.button>
    </div>
  );
};

export default RetreatButton;
export { RetreatButton as RetreadButton };

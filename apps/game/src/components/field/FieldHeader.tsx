import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import CombatLog from "@/components/combat/CombatLog";
import FieldNavTargetSection from "@/components/field/FieldNavTargetSection";
import { inheritMotionDiv } from "@/styles/theme.css";

import * as styles from "./FieldHeader.css";

interface FieldHeaderProps {
  isCombat: boolean;
}

export function FieldHeader({ isCombat }: FieldHeaderProps) {
  const reduceMotion = useReducedMotion();
  const exit = { y: reduceMotion ? 0 : 12, opacity: 0 };
  const transition = {
    type: "spring" as const,
    duration: reduceMotion ? 0 : 0.45,
    bounce: 0,
  };
  return (
    <AnimatePresence initial={false}>
      {isCombat ? (
        <motion.div
          className={inheritMotionDiv}
          initial={{ x: reduceMotion ? 0 : "100%", opacity: 0 }}
          animate={{ x: 0, y: 0, opacity: 1 }}
          exit={exit}
          transition={transition}
          style={{ overflow: "hidden", position: "absolute" }}
          key="combatInfo"
        >
          <div className={styles.topLayout}>
            <CombatLog />
          </div>
        </motion.div>
      ) : (
        <motion.div
          className={inheritMotionDiv}
          initial={{ x: reduceMotion ? 0 : "-100%", opacity: 0 }}
          animate={{ x: 0, y: 0, opacity: 1 }}
          exit={exit}
          transition={transition}
          style={{ overflow: "hidden", position: "absolute" }}
          key="fieldNavTargetSection"
        >
          <div className={styles.topLayout}>
            <FieldNavTargetSection />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

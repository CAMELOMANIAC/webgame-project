import { AnimatePresence, motion } from "motion/react";

import CombatLog from "@/components/combat/CombatLog";
import FieldNavTargetSection from "@/components/field/FieldNavTargetSection";
import { inheritMotionDiv } from "@/styles/theme.css";

import * as styles from "./FieldHeader.css";

interface FieldHeaderProps {
  isCombat: boolean;
}

export function FieldHeader({ isCombat }: FieldHeaderProps) {
  return (
    <AnimatePresence initial={false}>
      {isCombat ? (
        <motion.div
          className={inheritMotionDiv}
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "-100%", opacity: 0 }}
          transition={{ type: "spring", duration: 0.45, bounce: 0 }}
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
          initial={{ x: "-100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", duration: 0.45, bounce: 0 }}
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

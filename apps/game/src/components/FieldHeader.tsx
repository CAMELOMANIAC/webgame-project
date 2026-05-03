import { AnimatePresence, motion } from "motion/react";
import styled from "styled-components";
import CombatLog from "@/components/CombatLog";
import { InheritMotionDiv } from "@/components/Commons";
import FieldNavTargetSection from "@/components/FieldNavTargetSection";
import RetreadButton from "@/components/RetreadButton";

interface FieldHeaderProps {
  isCombat: boolean;
}

export function FieldHeader({ isCombat }: FieldHeaderProps) {
  return (
    <AnimatePresence initial={false}>
      {isCombat ? (
        <InheritMotionDiv
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "-100%", opacity: 0 }}
          transition={{ type: "spring", duration: 0.5, bounce: 0 }}
          style={{ overflow: "hidden", position: "absolute" }}
          key="combatInfo"
        >
          <TopLayout>
            <CombatLog />
            <RetreadButton gauge={0} />
          </TopLayout>
        </InheritMotionDiv>
      ) : (
        <InheritMotionDiv
          initial={{ x: "-100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", duration: 0.5, bounce: 0 }}
          style={{ overflow: "hidden", position: "absolute" }}
          key="fieldNavTargetSection"
        >
          <TopLayout>
            <FieldNavTargetSection />
          </TopLayout>
        </InheritMotionDiv>
      )}
    </AnimatePresence>
  );
}

const TopLayout = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  flex: 1;
  width: 100%;
  gap: 16px;
  padding: 24px 24px 0;
`;

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { FaRunning } from "react-icons/fa";
import { ImWarning } from "react-icons/im";
import styled from "styled-components";

const RETREAT_STATUS = {
  DETECTED: "HOSTILE DETECTED",
  PREPARING: "PREPARING RETREAT",
  READY: "RETREAT READY",
  EXPIRED: "RETREAT EXPIRED",
  ENGAGED: "HOSTILE ENGAGED",
} as const;

type RetreatStatus = (typeof RETREAT_STATUS)[keyof typeof RETREAT_STATUS];

const RetreadButton = () => {
  const [retreatStatus, setRetreatStatus] = useState<RetreatStatus>(RETREAT_STATUS.DETECTED);
  return (
    <Container>
      <ButtonModal
        layout
        transition={{ type: "spring", duration: 0.5, bounce: 0 }}
        $isReady={retreatStatus === RETREAT_STATUS.READY}
        onClick={() =>
          setRetreatStatus((prev) => (prev === RETREAT_STATUS.READY ? RETREAT_STATUS.DETECTED : RETREAT_STATUS.READY))
        }
      >
        <AnimatePresence mode="popLayout">
          <motion.div
            key={retreatStatus}
            initial={{ y: "-100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            {retreatStatus === RETREAT_STATUS.READY ? <FaRunning /> : <ImWarning />}
            <span>WARNING : {retreatStatus}</span>
          </motion.div>
        </AnimatePresence>
      </ButtonModal>
    </Container>
  );
};

export default RetreadButton;

const Container = styled.div`
  position: relative;
  display: flex;
  width: 100%;
  height: auto;
  justify-content: center;
`;

type ButtonModalProps = {
  $isReady: boolean;
};

const ButtonModal = styled(motion.button)<ButtonModalProps>`
  position: relative;
  display: flex;
  width: auto;
  height: auto;
  background-color: ${(props) => (props.$isReady ? "rgba(133, 173, 255, 0.2)" : "rgba(255, 113, 108, 0.2)")};
  border: 1px solid ${(props) => (props.$isReady ? "rgba(133, 173, 255, 0.5)" : "rgba(255, 113, 108, 0.5)")};
  border-radius: 9999px;
  color: ${(props) => (props.$isReady ? "rgb(133, 173, 255)" : "rgb(255, 113, 108)")};
  padding: 6px 16px;
  font-weight: 800;
  letter-spacing: 1px;
  font-size: 12px;
  overflow: hidden;
  backdrop-filter: blur(6px);
`;

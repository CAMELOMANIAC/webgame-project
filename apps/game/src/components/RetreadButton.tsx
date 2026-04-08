import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { FaRunning } from "react-icons/fa";
import { ImWarning } from "react-icons/im";
import { MdRadar } from "react-icons/md";
import { RiErrorWarningLine } from "react-icons/ri";
import styled from "styled-components";

const RETREAT_STATUS = {
  DETECTED: "CONTACT : HOSTILE DETECTED",
  PREPARING: "SECURING : PREPARING RETREAT",
  READY: "SIGNAL : RETREAT READY",
  EXPIRED: "ABORTED : RETREAT EXPIRED",
  ENGAGED: "CAUTION : HOSTILE ENGAGED",
} as const;

type RetreatStatus = (typeof RETREAT_STATUS)[keyof typeof RETREAT_STATUS];

const RetreadButton = () => {
  const [retreatStatus, setRetreatStatus] = useState<RetreatStatus>(RETREAT_STATUS.DETECTED);
  const [percent, setPercent] = useState(0);

  return (
    <Container>
      <ButtonModal layout transition={{ type: "spring", duration: 0.5, bounce: 0 }} $retreatStatus={retreatStatus}>
        <AnimatePresence>
          {retreatStatus === RETREAT_STATUS.PREPARING && (
            <GaugeBar
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              exit={{ opacity: 0 }}
              transition={{ type: "tween", ease: "linear" }}
            />
          )}
        </AnimatePresence>
        <AnimatePresence mode="popLayout">
          <motion.div
            key={retreatStatus}
            initial={{ y: "-100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ display: "flex", alignItems: "center", gap: "8px", zIndex: 1 }}
          >
            {retreatStatus === RETREAT_STATUS.READY && <FaRunning />}
            {retreatStatus === RETREAT_STATUS.DETECTED || (retreatStatus === RETREAT_STATUS.ENGAGED && <ImWarning />)}
            {retreatStatus === RETREAT_STATUS.PREPARING && <MdRadar />}
            {retreatStatus === RETREAT_STATUS.EXPIRED && <RiErrorWarningLine />}
            <span>{retreatStatus}</span>
          </motion.div>
        </AnimatePresence>
      </ButtonModal>
      <div style={{ position: "fixed", color: "white", top: "200px" }}>
        <button
          onClick={() => {
            setRetreatStatus(RETREAT_STATUS.READY);
            setPercent(0);
          }}
        >
          positive
        </button>
        <button
          onClick={() => {
            setRetreatStatus(RETREAT_STATUS.ENGAGED);
            setPercent(0);
          }}
        >
          negative
        </button>
        <button
          onClick={() => {
            setRetreatStatus(RETREAT_STATUS.PREPARING);
            setPercent((prev) => prev + 10);
          }}
        >
          pending
        </button>
      </div>
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
  $retreatStatus: RetreatStatus;
};
const COLORS = {
  READY: { bg: "rgba(133, 173, 255, 0.2)", border: "rgba(133, 173, 255, 0.5)", text: "rgb(133, 173, 255)" },
  DANGER: { bg: "rgba(255, 113, 108, 0.2)", border: "rgba(255, 113, 108, 0.5)", text: "rgb(255, 113, 108)" },
  PENDING: { bg: "rgba(150, 150, 150, 0.2)", border: "rgba(150, 150, 150, 0.5)", text: "rgb(200, 200, 200)" },
};
const ButtonModal = styled(motion.button)<ButtonModalProps>`
  position: relative;
  display: flex;
  width: auto;
  height: auto;
  border-radius: 9999px;
  padding: 6px 16px;
  font-weight: 800;
  letter-spacing: 1px;
  font-size: 12px;
  overflow: hidden;
  backdrop-filter: blur(6px);
  border-width: 1px;
  border-style: solid;
  ${({ $retreatStatus }) => {
    let theme;
    if ($retreatStatus === RETREAT_STATUS.READY) {
      theme = COLORS.READY;
    } else if ($retreatStatus === RETREAT_STATUS.PREPARING) {
      theme = COLORS.PENDING;
    } else {
      theme = COLORS.DANGER;
    }
    return `
      background-color: ${theme.bg};
      border-color: ${theme.border};
      color: ${theme.text};
    `;
  }}
`;

const GaugeBar = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.15); // 반투명한 흰색/회색 게이지
  z-index: 0; // 글자 뒤로 보내기
`;

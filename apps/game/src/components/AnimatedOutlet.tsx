import { Outlet, useMatches, } from "@tanstack/react-router";
import type { SetStateAction } from "jotai";
import { motion,useIsPresent } from "motion/react";
import { type Dispatch, forwardRef, useRef } from "react";
import type { CSSProperties } from "styled-components";

type AnimatedOutletProps = {
  moveDirection?: "left" | "right";
  setIsAnimating: Dispatch<SetStateAction<boolean>>;
  isAnimating: boolean;
};
const AnimatedOutlet = forwardRef<HTMLDivElement, AnimatedOutletProps>(({ setIsAnimating }, ref) => {
  const matches = useMatches() // 현재 활성화된 모든 라우트 매치들
  const isPresent = useIsPresent() // Framer Motion의 존재 여부 확인

  // 1. 현재의 매치 상태를 저장할 Ref
  const renderedMatches = useRef(matches)

  // 2. 화면에 머물러 있는 동안(Present)에만 최신 매치로 업데이트
  if (isPresent) {
    renderedMatches.current = matches
  }
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: "20%" }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: "20%" }}
      onAnimationStart={() => setIsAnimating(true)}
      onAnimationComplete={() => setIsAnimating(false)}
      style={inheritMotionDivStyle}
    >
      <Outlet />
    </motion.div>
  )
  }
)

const inheritMotionDivStyle: CSSProperties = {
  display: "inherit",
  flex: "inherit",
  flexDirection: "inherit",
  alignItems: "inherit",
  justifyContent: "inherit",
  position: "inherit",
  width: "inherit",
  height: "inherit",
};

export default AnimatedOutlet;

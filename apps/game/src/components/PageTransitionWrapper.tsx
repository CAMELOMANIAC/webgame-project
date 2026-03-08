import { useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";

type Props = {
  children: React.ReactNode;
  moveDirection?: "left" | "right";
};

const PageTransitionWrapper = ({ children, moveDirection = "right" }: Readonly<Props>) => {
  const { location } = useRouterState();

  // 💡 애니메이션 로직을 여기로 이동
  const xOffset = 20 * (moveDirection === "right" ? -1 : 1) + "%";
  const exitX = 20 * (moveDirection === "right" ? 1 : -1) + "%";
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, x: xOffset }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: exitX }}
        transition={{ duration: 0.5 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default PageTransitionWrapper;

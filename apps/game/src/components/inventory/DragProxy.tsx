import { type HTMLMotionProps, motion } from "motion/react";
import styled from "styled-components";

type DragProxyProps = {
  dragPosition: { x: number; y: number };
  selectedSlot: number | null;
} & HTMLMotionProps<"div">;

const DragProxy = ({ dragPosition, selectedSlot }: Readonly<DragProxyProps>) => {
  return (
    <DragProxyContainer
      layoutId={`slot-${selectedSlot}`}
      layout="size"
      transition={{
        x: { duration: 0 },
        y: { duration: 0 },
        layout: { duration: 0.2 },
      }}
      animate={{ x: dragPosition.x, y: dragPosition.y }}
    >
      {selectedSlot}
    </DragProxyContainer>
  );
};

export default DragProxy;

const DragProxyContainer = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;

  width: 5rem;
  height: 5rem;
  border: 1px solid red;

  pointer-events: none;
  user-select: none;
`;

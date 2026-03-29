import { motion } from "motion/react";
import styled from "styled-components";

export const Page = styled.div`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  align-items: flex-start;
  justify-content: flex-start;
  position: relative;

  width: 100%;
  height: 100%;
`;

export const FieldWidget = styled.div`
  display: flex;
  position: relative;
  width: 100%;
  height: 100%;
  background-color: rgba(27, 27, 27);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  /* align-items: center; */
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  color: white;
`;

export const InheritMotionDiv = styled(motion.div)`
  /* width: inherit;
  height: inherit; */
  /* display: inherit;
  flex-direction: inherit;
  align-items: inherit;
  justify-content: inherit;
  position: inherit; */
  width: 100%;
`;

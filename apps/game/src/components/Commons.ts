import { motion } from "motion/react";
import styled, { css } from "styled-components";

export type TacticalTone = "default" | "positive" | "negative";

const getBracketColor = (tone: TacticalTone = "default") => {
  if (tone === "positive") return "#85adff";
  if (tone === "negative") return "#ff7162";
  return "#fafafa";
};

export const cornerBracketsMixin = css<{ $bracketTone?: TacticalTone }>`
  position: relative;

  &::before,
  &::after {
    content: "";
    position: absolute;
    width: 6px;
    height: 6px;
    pointer-events: none;
    z-index: 2;
  }

  &::before {
    top: -1px;
    left: -1px;
    border-top: 1.5px solid ${(props) => getBracketColor(props.$bracketTone)};
    border-left: 1.5px solid ${(props) => getBracketColor(props.$bracketTone)};
  }

  &::after {
    right: -1px;
    bottom: -1px;
    border-right: 1.5px solid ${(props) => getBracketColor(props.$bracketTone)};
    border-bottom: 1.5px solid ${(props) => getBracketColor(props.$bracketTone)};
  }
`;

export const Page = styled.div`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  align-items: flex-start;
  justify-content: flex-start;
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #09090b;
`;

export const FieldWidget = styled.div<{ $bracketTone?: TacticalTone }>`
  display: flex;
  position: relative;
  width: 100%;
  height: 100%;
  background-color: rgba(16, 16, 19, 0.9);
  box-sizing: border-box;
  flex-direction: column;
  justify-content: center;
  padding: 14px 16px;
  border: 1px solid
    ${(props) =>
      props.$bracketTone === "negative"
        ? "rgba(255, 113, 98, 0.32)"
        : props.$bracketTone === "positive"
          ? "rgba(133, 173, 255, 0.32)"
          : "rgba(255, 255, 255, 0.12)"};
  backdrop-filter: blur(12px);
  border-radius: 6px;
  color: #fafafa;
  ${cornerBracketsMixin}
`;

export const InheritMotionDiv = styled(motion.div)`
  width: 100%;
`;

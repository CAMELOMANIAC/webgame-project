import { keyframes, style } from "@vanilla-extract/css";

import { cornerBrackets, vars } from "@/styles/theme.css";

const toastEnter = keyframes({
  from: {
    opacity: 0,
    transform: "translate(-50%, -8px)",
  },
  to: {
    opacity: 1,
    transform: "translate(-50%, 0)",
  },
});

export const region = style({
  position: "fixed",
  inset: 0,
  pointerEvents: "none",
  zIndex: 1100,
});

export const srOnly = style({
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
  border: 0,
});

export const toastPopover = style({
  position: "fixed",
  top: "16px",
  left: "50%",
  bottom: "auto",
  right: "auto",
  transform: "translateX(-50%)",
  width: "min(420px, calc(100vw - 32px))",
  margin: 0,
  padding: 0,
  border: "none",
  background: "transparent",
  color: "inherit",
  overflow: "visible",
  pointerEvents: "auto",
  animation: `${toastEnter} 0.18s ease-out`,
  transition: "opacity 0.16s ease, transform 0.16s ease, display 0.16s ease, overlay 0.16s ease",
  transitionBehavior: "allow-discrete",
  selectors: {
    "&:not(:popover-open):not([data-open='true'])": {
      display: "none",
      opacity: 0,
    },
    "&:popover-open": {
      display: "block",
      opacity: 1,
    },
    "&[data-open='true']": {
      display: "block",
      opacity: 1,
    },
  },
  "@media": {
    "(prefers-reduced-motion: reduce)": {
      animation: "none",
      transition: "none",
    },
  },
});

export const toastCard = style([
  cornerBrackets({ tone: "negative" }),
  {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    padding: "10px 12px",
    borderRadius: vars.radius.control,
    border: `1px solid ${vars.border.negative}`,
    backgroundColor: "rgba(16, 16, 19, 0.94)",
    backdropFilter: "blur(12px)",
    boxShadow: "0 12px 28px rgba(0, 0, 0, 0.48)",
  },
]);

export const messageText = style({
  margin: 0,
  flex: 1,
  minWidth: 0,
  fontSize: "12px",
  fontWeight: 500,
  lineHeight: 1.45,
  color: vars.color.negative,
  wordBreak: "keep-all",
  overflowWrap: "anywhere",
});

export const closeButton = style({
  flexShrink: 0,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "24px",
  height: "24px",
  padding: 0,
  borderRadius: "4px",
  border: `1px solid ${vars.border.subtle}`,
  backgroundColor: "transparent",
  color: vars.text.secondary,
  fontFamily: vars.font.mono,
  fontSize: "11px",
  lineHeight: 1,
  cursor: "pointer",
  transition: "color 0.15s ease, border-color 0.15s ease, background-color 0.15s ease",
  selectors: {
    "&:hover": {
      color: vars.text.primary,
      borderColor: vars.border.strong,
      backgroundColor: vars.surface.high,
    },
    "&:focus-visible": {
      outline: "2px solid rgba(250, 250, 250, 0.72)",
      outlineOffset: "2px",
    },
  },
});

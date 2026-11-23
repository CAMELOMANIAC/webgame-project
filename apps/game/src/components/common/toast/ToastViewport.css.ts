import { keyframes, style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

import { vars } from "@/styles/theme.css";

const enter = keyframes({
  from: { opacity: 0, transform: "translateY(-8px)" },
  to: { opacity: 1, transform: "translateY(0)" },
});

export const viewport = style({
  position: "fixed",
  top: "16px",
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 1100,
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  width: "min(420px, calc(100vw - 32px))",
  pointerEvents: "none",
});

export const card = style({
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "10px 12px",
  borderRadius: vars.radius.control,
  border: `1px solid ${vars.border.strong}`,
  backgroundColor: vars.surface.high,
  boxShadow: "0 12px 28px rgba(0, 0, 0, 0.48)",
  pointerEvents: "auto",
  animation: `${enter} 0.18s ease-out`,
  "@media": {
    "(prefers-reduced-motion: reduce)": {
      animation: "none",
    },
  },
});

const toneColor = {
  positive: vars.color.positive,
  negative: vars.color.negative,
  neutral: vars.text.muted,
} as const;

export const dot = recipe({
  base: {
    flexShrink: 0,
    width: "6px",
    height: "6px",
    borderRadius: "50%",
  },
  variants: {
    tone: {
      positive: { backgroundColor: toneColor.positive },
      negative: { backgroundColor: toneColor.negative },
      neutral: { backgroundColor: toneColor.neutral },
    },
  },
});

export const message = recipe({
  base: {
    margin: 0,
    flex: 1,
    minWidth: 0,
    fontSize: "12px",
    fontWeight: 500,
    lineHeight: 1.45,
    wordBreak: "keep-all",
    overflowWrap: "anywhere",
  },
  variants: {
    tone: {
      positive: { color: vars.text.primary },
      negative: { color: vars.color.negative },
      neutral: { color: vars.text.secondary },
    },
  },
});

const focusRing = {
  outline: `2px solid ${vars.text.primary}`,
  outlineOffset: "2px",
} as const;

export const messageButton = style({
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: "2px",
  padding: "2px 4px",
  margin: "-2px -4px",
  border: "1px solid transparent",
  borderRadius: vars.radius.badge,
  background: "transparent",
  textAlign: "left",
  cursor: "pointer",
  selectors: {
    "&:hover": { borderColor: vars.text.primary },
    "&:focus-visible": focusRing,
  },
});

export const speaker = style({
  fontSize: "12px",
  fontWeight: 600,
  color: vars.text.primary,
});

export const preview = style({
  width: "100%",
  fontSize: "12px",
  lineHeight: 1.45,
  color: vars.text.secondary,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const actionButton = style({
  flexShrink: 0,
  padding: "4px 8px",
  borderRadius: vars.radius.badge,
  border: `1px solid ${vars.border.strong}`,
  backgroundColor: "transparent",
  color: vars.text.primary,
  fontSize: "12px",
  cursor: "pointer",
  selectors: {
    "&:hover": { borderColor: vars.text.primary },
    "&:focus-visible": focusRing,
  },
});

export const closeButton = style({
  flexShrink: 0,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "24px",
  height: "24px",
  padding: 0,
  borderRadius: vars.radius.badge,
  border: `1px solid ${vars.border.subtle}`,
  backgroundColor: "transparent",
  color: vars.text.secondary,
  fontFamily: vars.font.mono,
  fontSize: "11px",
  lineHeight: 1,
  cursor: "pointer",
  selectors: {
    "&:hover": { color: vars.text.primary, borderColor: vars.text.primary },
    "&:focus-visible": focusRing,
  },
});

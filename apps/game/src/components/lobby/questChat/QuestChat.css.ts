import { keyframes, style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

import { cornerBrackets, vars } from "@/styles/theme.css";

const appear = keyframes({
  from: { opacity: 0, transform: "translateY(4px)" },
  to: { opacity: 1, transform: "translateY(0)" },
});

const blink = keyframes({
  "0%, 80%, 100%": { opacity: 0.25 },
  "40%": { opacity: 1 },
});

export const thread = style({
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  maxHeight: "min(56vh, 520px)",
  minHeight: "120px",
  overflowY: "auto",
  padding: "4px 2px",
});

export const entry = recipe({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    maxWidth: "86%",
    animation: `${appear} 0.16s ease-out`,
    "@media": {
      "(prefers-reduced-motion: reduce)": { animation: "none" },
    },
  },
  variants: {
    side: {
      npc: { alignSelf: "flex-start" },
      player: { alignSelf: "flex-end", alignItems: "flex-end" },
      system: { alignSelf: "center", maxWidth: "100%" },
    },
  },
});

export const speakerRow = style({
  display: "flex",
  alignItems: "baseline",
  gap: "6px",
});

export const speakerName = style({
  fontSize: "12px",
  fontWeight: 600,
  color: vars.text.primary,
});

export const speakerRole = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  color: vars.text.muted,
});

export const bubble = recipe({
  base: {
    margin: 0,
    padding: "8px 10px",
    borderRadius: vars.radius.card,
    fontSize: "13px",
    lineHeight: 1.65,
    wordBreak: "keep-all",
    overflowWrap: "anywhere",
  },
  variants: {
    side: {
      npc: {
        color: vars.text.secondary,
        background: vars.surface.low,
        border: `1px solid ${vars.border.subtle}`,
      },
      player: {
        color: vars.text.primary,
        background: vars.surface.high,
        border: `1px solid ${vars.border.strong}`,
      },
    },
  },
});

export const systemLine = style({
  margin: 0,
  fontFamily: vars.font.mono,
  fontSize: "11px",
  color: vars.text.muted,
  fontVariantNumeric: "tabular-nums",
  textAlign: "center",
});

export const typing = style({
  alignSelf: "flex-start",
  display: "inline-flex",
  gap: "4px",
  padding: "10px 12px",
  borderRadius: vars.radius.card,
  background: vars.surface.low,
  border: `1px solid ${vars.border.subtle}`,
});

export const typingDot = style({
  width: "5px",
  height: "5px",
  borderRadius: "50%",
  backgroundColor: vars.text.secondary,
  animation: `${blink} 1.2s infinite ease-in-out`,
  selectors: {
    "&:nth-child(2)": { animationDelay: "0.15s" },
    "&:nth-child(3)": { animationDelay: "0.3s" },
  },
});

export const choiceList = style({
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  paddingTop: "12px",
  borderTop: `1px solid ${vars.border.subtle}`,
});

export const choiceButton = style([
  cornerBrackets({ tone: "default" }),
  {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "2px",
    width: "100%",
    padding: "10px 12px",
    borderRadius: vars.radius.control,
    border: `1px solid ${vars.border.strong}`,
    background: vars.surface.high,
    color: vars.text.primary,
    fontSize: "13px",
    fontWeight: 500,
    textAlign: "left",
    cursor: "pointer",
    selectors: {
      "&:hover:not(:disabled)": { borderColor: vars.text.primary },
      "&:focus-visible": {
        outline: `2px solid ${vars.text.primary}`,
        outlineOffset: "2px",
      },
      // 조건 미충족 선택지는 딤드: 브래킷·호버 반응 없이 흐리게 표시한다.
      "&:disabled": {
        cursor: "not-allowed",
        color: vars.text.disabled,
        borderColor: vars.border.subtle,
        background: vars.surface.low,
      },
      "&:disabled::before, &:disabled::after": { display: "none" },
    },
  },
]);

export const choiceCondition = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  color: vars.text.muted,
});

export const statusLine = style({
  margin: 0,
  fontFamily: vars.font.mono,
  fontSize: "11px",
  color: vars.text.muted,
});

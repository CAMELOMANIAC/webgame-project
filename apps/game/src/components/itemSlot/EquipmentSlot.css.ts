import { style } from "@vanilla-extract/css";

import { vars } from "@/styles/theme.css";

export const cooldownOverlay = style({
  position: "absolute",
  inset: 0,
  borderRadius: "5px",
  background:
    "conic-gradient(rgba(9, 9, 11, 0.84) calc(var(--cooldown-percent, 0) * 360deg), rgba(9, 9, 11, 0.35) 0deg)",
  pointerEvents: "none",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 2,
});

export const cooldownText = style({
  fontFamily: vars.font.mono,
  color: vars.text.primary,
  fontSize: "13px",
  fontWeight: 700,
  fontVariantNumeric: "tabular-nums",
});

export const castBar = style({
  position: "absolute",
  bottom: "3px",
  left: "5px",
  right: "5px",
  height: "3px",
  backgroundColor: vars.border.grid,
  borderRadius: "1px",
  overflow: "hidden",
  zIndex: 3,
});

export const castProgress = style({
  height: "100%",
  backgroundColor: vars.color.positive,
});

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

export const tooltipLabel = style({
  display: "none",
  position: "absolute",
  bottom: "108%",
  left: "50%",
  transform: "translateX(-50%)",
  backgroundColor: vars.surface.mid,
  border: `1px solid ${vars.border.strong}`,
  borderRadius: vars.radius.control,
  padding: "6px 10px",
  fontSize: "11px",
  whiteSpace: "nowrap",
  pointerEvents: "none",
  zIndex: 100,
  color: vars.text.primary,
  boxShadow: "0 8px 16px rgba(0, 0, 0, 0.45)",
  selectors: {
    "*:hover > &": {
      display: "flex",
      flexDirection: "column",
      gap: "2px",
    },
  },
});

export const tooltipStats = style({
  display: "flex",
  gap: "8px",
  fontFamily: vars.font.mono,
  color: vars.text.secondary,
  fontSize: "11px",
  fontVariantNumeric: "tabular-nums",
  marginTop: "2px",
});

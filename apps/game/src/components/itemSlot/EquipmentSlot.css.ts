import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

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

export const castBadge = style({
  position: "absolute",
  top: "3px",
  right: "3px",
  zIndex: 4,
  padding: "1px 3px",
  borderRadius: vars.radius.badge,
  backgroundColor: "rgba(9, 9, 11, 0.9)",
  border: `1px solid ${vars.color.positive}`,
  fontFamily: vars.font.mono,
  fontSize: "8px",
  fontWeight: 700,
  lineHeight: 1.1,
  color: vars.color.positive,
  fontVariantNumeric: "tabular-nums",
  pointerEvents: "none",
});

export const synergyRing = recipe({
  base: {
    position: "absolute",
    inset: 0,
    borderRadius: vars.radius.control,
    pointerEvents: "none",
    zIndex: 4,
  },
  variants: {
    role: {
      source: {
        border: `1px solid ${vars.border.strong}`,
        backgroundColor: "rgba(250, 250, 250, 0.05)",
      },
      target: {
        border: `1px solid ${vars.text.primary}`,
        backgroundColor: "rgba(250, 250, 250, 0.1)",
      },
    },
  },
});

export const synergyFloat = style({
  position: "absolute",
  left: "50%",
  top: "-6px",
  transform: "translateX(-50%)",
  zIndex: 10,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "2px",
  pointerEvents: "none",
  whiteSpace: "nowrap",
});

export const synergyPill = style({
  padding: "1px 5px",
  borderRadius: vars.radius.badge,
  backgroundColor: "rgba(9, 9, 11, 0.94)",
  border: `1px solid ${vars.border.strong}`,
  fontFamily: vars.font.mono,
  fontSize: "9px",
  fontWeight: 700,
  lineHeight: 1.2,
  color: vars.color.positive,
  fontVariantNumeric: "tabular-nums",
  boxShadow: "0 2px 6px rgba(0, 0, 0, 0.7)",
});

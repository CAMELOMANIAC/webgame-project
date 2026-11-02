import { style } from "@vanilla-extract/css";

import { vars } from "@/styles/theme.css";

export const container = style({
  width: "100%",
  height: "100%",
  display: "flex",
  flex: 1,
  flexDirection: "column",
  position: "relative",
  selectors: {
    "&::before": {
      content: '""',
      position: "absolute",
      inset: 0,
      backgroundColor: "rgba(12, 12, 15, 0.92)",
      borderTop: "1px solid rgba(255, 255, 255, 0.08)",
      backdropFilter: "blur(12px)",
      pointerEvents: "none",
      zIndex: 0,
    },
  },
});

export const header = style({
  position: "relative",
  zIndex: 2,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 16px 10px",
  backgroundColor: "rgba(12, 12, 15, 0.96)",
  borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
});

export const title = style({
  fontSize: "13px",
  fontWeight: 600,
  color: vars.text.primary,
  margin: 0,
});

export const subCode = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  color: vars.text.muted,
  fontVariantNumeric: "tabular-nums",
});

export const statusBox = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  padding: "24px",
  color: vars.text.secondary,
  fontSize: "12px",
});

export const messageContainer = style({
  color: vars.color.negative,
  fontSize: "12px",
});

export const gridContainer = style({
  position: "relative",
  width: "100%",
  height: "100%",
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "8px",
  padding: "12px 16px 16px",
  overflowY: "auto",
});

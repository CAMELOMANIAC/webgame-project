import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

import { vars } from "@/styles/theme.css";

export const wrapper = style({
  width: "100%",
  maxWidth: "460px",
  margin: "auto",
  padding: "24px 16px",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
});

export const panel = style({
  padding: "20px",
  background: vars.surface.mid,
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: vars.radius.panel,
  display: "flex",
  flexDirection: "column",
  gap: "14px",
});

export const eyebrow = style({
  margin: 0,
  color: vars.text.muted,
  fontFamily: vars.font.mono,
  fontSize: "11px",
  letterSpacing: "0.06em",
});

export const title = recipe({
  base: {
    margin: 0,
    fontSize: "24px",
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: "-0.02em",
  },
  variants: {
    tone: {
      positive: { color: vars.color.positive },
      negative: { color: vars.color.negative },
    },
  },
});

export const description = style({
  margin: 0,
  color: vars.text.secondary,
  fontSize: "13px",
  lineHeight: 1.5,
});

export const summaryGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "1px",
  backgroundColor: vars.border.grid,
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: vars.radius.control,
  overflow: "hidden",
});

export const summaryCell = style({
  backgroundColor: vars.surface.low,
  padding: "10px 12px",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
});

export const cellLabel = style({
  fontSize: "11px",
  color: vars.text.muted,
});

export const cellValue = style({
  fontFamily: vars.font.mono,
  fontSize: "13px",
  fontWeight: 600,
  color: vars.text.primary,
  fontVariantNumeric: "tabular-nums",
});

export const returnButton = style({
  width: "100%",
  minHeight: "44px",
  padding: "10px 14px",
  border: 0,
  borderRadius: vars.radius.control,
  background: vars.color.ctaBg,
  color: vars.color.ctaFg,
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: 700,
  selectors: {
    "&:hover": { background: vars.color.ctaHover },
    "&:focus-visible": {
      outline: `2px solid ${vars.color.positive}`,
      outlineOffset: "3px",
    },
  },
});

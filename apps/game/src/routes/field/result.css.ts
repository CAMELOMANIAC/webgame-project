import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

import { vars } from "@/styles/theme.css";

export const wrapper = style({
  width: "100%",
  maxWidth: "520px",
  margin: "auto",
  padding: "24px 16px 32px",
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

export const headerBlock = style({
  display: "flex",
  flexDirection: "column",
  gap: "6px",
});

export const eyebrow = style({
  margin: 0,
  color: vars.text.muted,
  fontFamily: vars.font.mono,
  fontSize: "11px",
  letterSpacing: "0.08em",
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

export const cellValue = recipe({
  base: {
    fontFamily: vars.font.mono,
    fontSize: "13px",
    fontWeight: 600,
    color: vars.text.primary,
    fontVariantNumeric: "tabular-nums",
  },
  variants: {
    tone: {
      default: { color: vars.text.primary },
      positive: { color: vars.color.positive },
      negative: { color: vars.color.negative },
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

export const missionBanner = style({
  padding: "10px 12px",
  backgroundColor: vars.surface.low,
  border: `1px solid ${vars.border.positive}`,
  borderRadius: vars.radius.control,
  color: vars.color.positive,
  fontSize: "12px",
  fontWeight: 600,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
});

export const sectionBox = style({
  display: "flex",
  flexDirection: "column",
  gap: "1px",
  backgroundColor: vars.border.grid,
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: vars.radius.control,
  overflow: "hidden",
});

export const sectionHeader = style({
  backgroundColor: vars.surface.high,
  padding: "8px 12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
});

export const sectionTitle = style({
  fontSize: "11px",
  fontWeight: 600,
  color: vars.text.secondary,
  letterSpacing: "0.02em",
});

export const sectionMeta = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  color: vars.text.muted,
  fontVariantNumeric: "tabular-nums",
});

export const itemRow = style({
  backgroundColor: vars.surface.low,
  padding: "8px 12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
});

export const itemMain = style({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  minWidth: 0,
});

export const itemThumb = style({
  width: "26px",
  height: "26px",
  borderRadius: vars.radius.badge,
  border: "1px solid rgba(255, 255, 255, 0.1)",
  backgroundColor: vars.surface.mid,
  objectFit: "contain",
  padding: "2px",
  flexShrink: 0,
});

export const itemName = style({
  fontSize: "12px",
  fontWeight: 500,
  color: vars.text.primary,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const itemQty = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  color: vars.text.muted,
  fontVariantNumeric: "tabular-nums",
  flexShrink: 0,
});

export const itemValue = recipe({
  base: {
    fontFamily: vars.font.mono,
    fontSize: "12px",
    fontWeight: 600,
    fontVariantNumeric: "tabular-nums",
    flexShrink: 0,
  },
  variants: {
    tone: {
      positive: { color: vars.color.positive },
      negative: { color: vars.color.negative },
    },
  },
});

export const combatRow = style({
  backgroundColor: vars.surface.low,
  padding: "8px 12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
});

export const combatMain = style({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  minWidth: 0,
});

export const combatTime = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  color: vars.text.muted,
  fontVariantNumeric: "tabular-nums",
  flexShrink: 0,
});

export const combatName = style({
  fontSize: "12px",
  fontWeight: 500,
  color: vars.text.primary,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const combatSub = style({
  fontSize: "11px",
  color: vars.text.muted,
  flexShrink: 0,
});

export const outcomeTag = recipe({
  base: {
    fontFamily: vars.font.mono,
    fontSize: "11px",
    fontWeight: 600,
    flexShrink: 0,
  },
  variants: {
    outcome: {
      WIN: { color: vars.color.positive },
      RETREAT: { color: vars.text.secondary },
      LOSS: { color: vars.color.negative },
    },
  },
});

export const emptyRow = style({
  backgroundColor: vars.surface.low,
  padding: "12px",
  fontSize: "12px",
  color: vars.text.muted,
  textAlign: "center",
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
      outline: `2px solid ${vars.text.primary}`,
      outlineOffset: "3px",
    },
  },
});

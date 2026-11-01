import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

import { fieldWidget, vars } from "@/styles/theme.css";

export const container = recipe({
  base: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "8px",
    padding: "12px",
  },
  variants: {
    critical: {
      true: fieldWidget({ tone: "negative" }),
      false: fieldWidget({ tone: "default" }),
    },
  },
  defaultVariants: {
    critical: false,
  },
});

export const headerRow = style({
  display: "flex",
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
  gap: "8px",
  paddingBottom: "6px",
  borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
});

export const name = style({
  fontSize: "13px",
  fontWeight: 700,
  color: vars.text.primary,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const statusTag = recipe({
  base: {
    fontFamily: vars.font.mono,
    fontSize: "10px",
    fontWeight: 600,
    padding: "2px 5px",
    borderRadius: vars.radius.badge,
  },
  variants: {
    danger: {
      true: {
        color: vars.color.negative,
        backgroundColor: vars.color.negativeBg,
      },
      false: {
        color: vars.color.positive,
        backgroundColor: vars.color.positiveBg,
      },
    },
  },
  defaultVariants: {
    danger: false,
  },
});

export const gaugeSection = style({
  display: "flex",
  flexDirection: "column",
  width: "100%",
  gap: "4px",
});

export const labelRow = style({
  width: "100%",
  display: "flex",
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
});

export const metricLabel = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  fontWeight: 500,
  color: vars.text.muted,
});

export const metricValue = recipe({
  base: {
    fontFamily: vars.font.mono,
    fontSize: "12px",
    fontWeight: 600,
    fontVariantNumeric: "tabular-nums",
  },
  variants: {
    critical: {
      true: { color: vars.color.negative },
      false: { color: vars.text.primary },
    },
  },
  defaultVariants: {
    critical: false,
  },
});

export const segmentTrack = style({
  display: "grid",
  gridTemplateColumns: "repeat(10, 1fr)",
  gap: "2px",
  width: "100%",
});

export const segmentCell = recipe({
  base: {
    height: "6px",
    borderRadius: "1px",
    transition: "background-color 0.2s ease",
  },
  variants: {
    state: {
      empty: { backgroundColor: vars.border.grid },
      positive: { backgroundColor: vars.color.positive },
      negative: { backgroundColor: vars.color.negative },
    },
  },
  defaultVariants: {
    state: "empty",
  },
});

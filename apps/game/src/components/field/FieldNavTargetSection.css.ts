import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

import { fieldWidget, vars } from "@/styles/theme.css";

export const container = recipe({
  base: {
    height: "auto",
    width: "100%",
    flexDirection: "column",
    justifyContent: "flex-start",
    alignItems: "stretch",
    padding: "14px",
    flex: 0,
    gap: "10px",
  },
  variants: {
    stable: {
      true: fieldWidget({ tone: "default" }),
      false: fieldWidget({ tone: "negative" }),
    },
  },
  defaultVariants: {
    stable: true,
  },
});

export const topTelemetryBar = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  paddingBottom: "8px",
  borderBottom: `1px solid ${vars.border.subtle}`,
});

export const telemetryLeft = style({
  display: "flex",
  alignItems: "center",
  gap: "6px",
});

export const statusDot = recipe({
  base: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
  },
  variants: {
    positive: {
      true: { backgroundColor: vars.color.positive },
      false: { backgroundColor: vars.color.negative },
    },
  },
  defaultVariants: {
    positive: true,
  },
});

export const subTitle = style({
  fontSize: "12px",
  fontWeight: 600,
  color: vars.text.primary,
  margin: 0,
});

export const nodeCode = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  color: vars.text.secondary,
  fontVariantNumeric: "tabular-nums",
});

export const overlapBadge = recipe({
  base: {
    fontFamily: vars.font.mono,
    fontSize: "11px",
    fontWeight: 600,
    padding: "2px 6px",
    borderRadius: vars.radius.badge,
  },
  variants: {
    positive: {
      true: {
        color: vars.color.positive,
        backgroundColor: vars.color.positiveBg,
        border: `1px solid ${vars.border.positive}`,
      },
      false: {
        color: vars.color.negative,
        backgroundColor: vars.color.negativeBg,
        border: `1px solid ${vars.border.negative}`,
      },
    },
  },
  defaultVariants: {
    positive: true,
  },
});

export const destinationRow = style({
  display: "flex",
  flexDirection: "column",
  gap: "3px",
});

export const destinationText = style({
  color: vars.text.primary,
  fontWeight: 700,
  fontSize: "17px",
  letterSpacing: "-0.02em",
  fontVariantNumeric: "tabular-nums",
});

export const statusHint = recipe({
  base: {
    fontSize: "12px",
    margin: 0,
  },
  variants: {
    positive: {
      true: { color: vars.color.positive },
      false: { color: vars.text.secondary },
    },
  },
  defaultVariants: {
    positive: false,
  },
});

export const noticeBanner = recipe({
  base: {
    padding: "8px 10px",
    borderRadius: vars.radius.badge,
    fontSize: "12px",
    margin: 0,
  },
  variants: {
    tone: {
      positive: {
        color: vars.color.positive,
        backgroundColor: vars.color.positiveBg,
        border: `1px solid ${vars.border.positive}`,
      },
      negative: {
        color: vars.color.negative,
        backgroundColor: vars.color.negativeBg,
        border: `1px solid ${vars.border.negative}`,
      },
    },
  },
  defaultVariants: {
    tone: "positive",
  },
});

export const telemetryGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "1px",
  backgroundColor: vars.border.grid,
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: vars.radius.control,
  overflow: "hidden",
});

export const telemetryCell = style({
  backgroundColor: vars.surface.low,
  padding: "8px 10px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
});

export const cellLabel = style({
  fontFamily: vars.font.mono,
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

export const primaryAction = style({
  width: "100%",
  padding: "10px 12px",
  border: 0,
  borderRadius: vars.radius.control,
  backgroundColor: vars.color.ctaBg,
  color: vars.color.ctaFg,
  fontSize: "12px",
  fontWeight: 600,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  cursor: "pointer",
  transition: "background-color 0.15s ease",
  selectors: {
    "&:hover:not(:disabled)": {
      backgroundColor: vars.color.ctaHover,
    },
    "&:disabled": {
      opacity: 0.4,
      cursor: "default",
    },
  },
});

export const secondaryAction = style({
  width: "100%",
  padding: "9px 12px",
  borderRadius: vars.radius.control,
  border: `1px solid ${vars.border.positive}`,
  backgroundColor: vars.color.positiveBg,
  color: vars.color.positive,
  fontSize: "12px",
  fontWeight: 600,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  cursor: "pointer",
  selectors: {
    "&:disabled": {
      opacity: 0.4,
      cursor: "default",
    },
  },
});

export const actionCode = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  fontVariantNumeric: "tabular-nums",
});

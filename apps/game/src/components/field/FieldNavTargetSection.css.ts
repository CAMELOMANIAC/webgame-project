import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

import { fieldWidget, vars } from "@/styles/theme.css";

export const container = style([
  fieldWidget({ tone: "default" }),
  {
    height: "auto",
    width: "100%",
    flexDirection: "column",
    justifyContent: "flex-start",
    alignItems: "stretch",
    padding: "14px",
    flex: 0,
    gap: "10px",
  },
]);

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

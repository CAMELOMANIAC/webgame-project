import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

import { fieldWidget, vars } from "@/styles/theme.css";

export const statusSection = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.35fr) minmax(0, 1fr)",
  width: "100%",
  gap: "8px",
  padding: "12px 16px 0",
});

export const primaryCol = style({
  display: "flex",
  minWidth: 0,
});

export const sideCol = style({
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  minWidth: 0,
});

export const compactWidget = style([
  fieldWidget({ tone: "default" }),
  {
    padding: "10px 12px",
    gap: "4px",
  },
]);

export const cellHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "6px",
});

export const widgetLabel = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  fontWeight: 500,
  color: vars.text.muted,
});

export const metricDot = recipe({
  base: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
  },
  variants: {
    tone: {
      positive: { backgroundColor: vars.color.positive },
      neutral: { backgroundColor: vars.text.muted },
    },
  },
  defaultVariants: {
    tone: "neutral",
  },
});

export const capacityText = style({
  fontFamily: vars.font.mono,
  fontSize: "13px",
  fontWeight: 600,
  color: vars.text.primary,
  fontVariantNumeric: "tabular-nums",
});

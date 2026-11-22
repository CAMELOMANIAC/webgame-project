import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

import { fieldWidget, vars } from "@/styles/theme.css";

export const statusSection = recipe({
  base: {
    display: "grid",
    width: "100%",
    padding: "12px 16px 0",
    transition:
      "grid-template-columns 350ms cubic-bezier(0.4, 0, 0.2, 1), gap 350ms cubic-bezier(0.4, 0, 0.2, 1)",
    "@media": {
      "(prefers-reduced-motion: reduce)": {
        transition: "none",
      },
    },
  },
  variants: {
    combat: {
      false: {
        gridTemplateColumns: "minmax(0, 1.35fr) minmax(0, 1fr)",
        gap: "8px",
      },
      true: {
        gridTemplateColumns: "minmax(0, 1fr) minmax(0, 0fr)",
        gap: "0px",
      },
    },
  },
  defaultVariants: {
    combat: false,
  },
});

export const primaryCol = style({
  display: "flex",
  minWidth: 0,
});

export const sideCol = recipe({
  base: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    minWidth: 0,
    overflow: "hidden",
    transition: "opacity 280ms cubic-bezier(0.4, 0, 0.2, 1)",
    "@media": {
      "(prefers-reduced-motion: reduce)": {
        transition: "none",
      },
    },
  },
  variants: {
    combat: {
      false: {
        opacity: 1,
      },
      true: {
        opacity: 0,
        pointerEvents: "none",
      },
    },
  },
  defaultVariants: {
    combat: false,
  },
});

export const compactWidget = recipe({
  base: [
    fieldWidget({ tone: "default" }),
    {
      padding: "10px 12px",
      gap: "4px",
    },
  ],
  variants: {
    hidden: {
      true: {
        visibility: "hidden",
        pointerEvents: "none",
      },
      false: {},
    },
  },
  defaultVariants: {
    hidden: false,
  },
});

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
      negative: { backgroundColor: vars.color.negative },
      neutral: { backgroundColor: vars.text.muted },
    },
  },
  defaultVariants: {
    tone: "neutral",
  },
});

export const capacityText = recipe({
  base: {
    fontFamily: vars.font.mono,
    fontSize: "13px",
    fontWeight: 600,
    fontVariantNumeric: "tabular-nums",
  },
  variants: {
    tone: {
      default: { color: vars.text.primary },
      negative: { color: vars.color.negative },
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

export const discardWidget = recipe({
  base: [
    fieldWidget({ tone: "default" }),
    {
      position: "absolute",
      inset: 0,
      zIndex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "6px",
      padding: "10px 12px",
      transition: "border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease",
    },
  ],
  variants: {
    active: {
      false: {
        borderColor: vars.border.strong,
        color: vars.text.secondary,
      },
      true: {
        borderColor: vars.border.negative,
        backgroundColor: vars.color.negativeBg,
        color: vars.color.negative,
      },
    },
  },
  defaultVariants: {
    active: false,
  },
});

export const discardLabel = style({
  fontSize: "12px",
  fontWeight: 600,
  letterSpacing: "-0.01em",
});

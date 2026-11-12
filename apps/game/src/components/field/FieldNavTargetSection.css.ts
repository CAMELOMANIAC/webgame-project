import { keyframes, style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

import { cornerBrackets, fieldWidget, vars } from "@/styles/theme.css";

export const container = style([
  fieldWidget({ tone: "default" }),
  {
    height: "auto",
    maxHeight: "100%",
    minHeight: 0,
    width: "100%",
    flexDirection: "column",
    justifyContent: "flex-start",
    alignItems: "stretch",
    padding: "14px",
    flex: 0,
    gap: "10px",
  },
]);

export const destinationHeader = style({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "8px",
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

export const telemetryGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "1px",
  backgroundColor: vars.border.grid,
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: vars.radius.control,
  overflow: "hidden",
});

export const telemetryCell = style({
  backgroundColor: vars.surface.low,
  padding: "6px 8px",
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: "2px",
  overflow: "hidden",
});

export const cellLabel = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  color: vars.text.muted,
});

export const cellValue = style({
  position: "relative",
  display: "inline-block",
  fontFamily: vars.font.mono,
  fontSize: "13px",
  fontWeight: 600,
  color: vars.text.primary,
  fontVariantNumeric: "tabular-nums",
});

export const accessibleValue = style({
  position: "absolute",
  width: "1px",
  height: "1px",
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
});

export const digitRow = style({
  display: "flex",
});

export const digitWindow = style({
  width: "1ch",
  height: "1lh",
  overflow: "hidden",
});

const slideDigit = keyframes({
  from: { transform: "translateY(0)" },
  to: { transform: "translateY(-50%)" },
});

export const digitRoll = recipe({
  base: {
    display: "flex",
    flexDirection: "column",
    animationName: slideDigit,
    animationDuration: "140ms",
    animationTimingFunction: "ease-out",
    animationFillMode: "both",
    "@media": {
      "(prefers-reduced-motion: reduce)": { animationDuration: "0ms" },
    },
  },
  variants: {
    direction: {
      up: { animationDirection: "normal" },
      down: { animationDirection: "reverse", animationTimingFunction: "ease-in" },
    },
  },
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

export const recommendToggle = recipe({
  base: {
    flexShrink: 0,
    width: "30px",
    height: "30px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: vars.radius.control,
    cursor: "pointer",
    fontSize: "16px",
    transition: "background-color 0.15s ease, color 0.15s ease",
    selectors: {
      "&:disabled": {
        opacity: 0.4,
        cursor: "default",
      },
    },
  },
  variants: {
    open: {
      true: {
        border: `1px solid ${vars.color.ctaBg}`,
        backgroundColor: vars.color.ctaBg,
        color: vars.color.ctaFg,
        selectors: {
          "&:hover:not(:disabled)": {
            backgroundColor: vars.color.ctaHover,
          },
        },
      },
      false: {
        border: `1px solid ${vars.border.strong}`,
        backgroundColor: vars.surface.low,
        color: vars.text.primary,
        selectors: {
          "&:hover:not(:disabled)": {
            backgroundColor: vars.surface.high,
          },
        },
      },
    },
  },
  defaultVariants: {
    open: false,
  },
});

export const recommendList = style({
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  overflowY: "auto",
  maxHeight: "48dvh",
  minHeight: 0,
  flex: "1 1 auto",
  paddingRight: "2px",
});

export const bodySection = recipe({
  base: {
    display: "grid",
    minHeight: 0,
    transition:
      "grid-template-rows 450ms cubic-bezier(0.4, 0, 0.2, 1), opacity 450ms ease-in-out",
    "@media": {
      "(prefers-reduced-motion: reduce)": { transition: "none" },
    },
  },
  variants: {
    visible: {
      true: { gridTemplateRows: "1fr", opacity: 1 },
      false: { gridTemplateRows: "0fr", opacity: 0 },
    },
  },
});

export const bodyContent = style({
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  overflow: "hidden",
  gap: "10px",
});

export const recommendItem = recipe({
  base: {
    position: "relative",
    width: "100%",
    padding: "10px 12px",
    borderRadius: vars.radius.control,
    border: `1px solid ${vars.border.subtle}`,
    backgroundColor: vars.surface.low,
    color: vars.text.primary,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    flexShrink: 0,
    textAlign: "left",
    cursor: "pointer",
    transition: "background-color 0.15s ease, border-color 0.15s ease",
    selectors: {
      "&:hover:not(:disabled)": {
        backgroundColor: vars.surface.high,
        borderColor: vars.border.strong,
      },
      "&:disabled": {
        opacity: 0.45,
        cursor: "default",
      },
    },
  },
  variants: {
    active: {
      true: [
        cornerBrackets({ tone: "default" }),
        {
          borderColor: vars.text.primary,
          backgroundColor: vars.surface.high,
        },
      ],
      false: [cornerBrackets({ tone: "default" })],
    },
  },
  defaultVariants: {
    active: false,
  },
});

export const recommendBackdrop = style({
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  width: "68%",
  borderRadius: vars.radius.control,
  backgroundSize: "cover",
  backgroundPosition: "right center",
  backgroundRepeat: "no-repeat",
  opacity: 0.45,
  pointerEvents: "none",
  zIndex: 0,
  maskImage:
    "linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.35) 38%, black 100%)",
  WebkitMaskImage:
    "linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.35) 38%, black 100%)",
});

export const recommendInfo = style({
  position: "relative",
  zIndex: 1,
  display: "flex",
  flexDirection: "column",
  gap: "3px",
  minWidth: 0,
});

export const recommendMeta = style({
  display: "flex",
  alignItems: "center",
  gap: "6px",
});

export const recommendTag = recipe({
  base: {
    fontFamily: vars.font.mono,
    fontSize: "10px",
    fontWeight: 600,
    padding: "1px 5px",
    borderRadius: "2px",
  },
  variants: {
    tone: {
      positive: {
        color: vars.color.positive,
        backgroundColor: vars.color.positiveBg,
      },
      neutral: {
        color: vars.text.secondary,
        backgroundColor: vars.surface.high,
      },
    },
  },
  defaultVariants: {
    tone: "neutral",
  },
});

export const recommendCode = style({
  fontFamily: vars.font.mono,
  fontSize: "10px",
  color: vars.text.muted,
  fontVariantNumeric: "tabular-nums",
});

export const recommendName = style({
  fontSize: "13px",
  fontWeight: 600,
  color: vars.text.primary,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const recommendTime = style({
  position: "relative",
  zIndex: 1,
  flexShrink: 0,
  fontFamily: vars.font.mono,
  fontSize: "12px",
  fontWeight: 600,
  color: vars.text.secondary,
  fontVariantNumeric: "tabular-nums",
});

export const recommendEmpty = style({
  padding: "14px 12px",
  borderRadius: vars.radius.control,
  border: `1px solid ${vars.border.subtle}`,
  backgroundColor: vars.surface.low,
  color: vars.text.muted,
  fontSize: "12px",
  textAlign: "center",
});

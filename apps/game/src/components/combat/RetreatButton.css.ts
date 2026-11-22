import { keyframes, style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

import { vars } from "@/styles/theme.css";

const pulseBlink = keyframes({
  "0%, 100%": { opacity: 0.9 },
  "50%": { opacity: 0.18 },
});

export const container = style({
  position: "relative",
  display: "flex",
  width: "100%",
  padding: "0 16px",
  justifyContent: "center",
  alignItems: "stretch",
  gap: "8px",
});

export const continueButton = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "7px 14px",
  borderRadius: vars.radius.control,
  border: `1px solid ${vars.border.strong}`,
  backgroundColor: vars.surface.mid,
  color: vars.text.primary,
  fontFamily: vars.font.sans,
  fontSize: "12px",
  fontWeight: 600,
  letterSpacing: "-0.01em",
  whiteSpace: "nowrap",
  cursor: "pointer",
  transition: "background-color 180ms ease, border-color 180ms ease",
  selectors: {
    "&:hover:not(:disabled)": {
      backgroundColor: vars.surface.high,
      borderColor: vars.text.primary,
    },
    "&:focus-visible": {
      outline: `1px solid ${vars.text.primary}`,
      outlineOffset: "2px",
    },
    "&:disabled": {
      opacity: 0.5,
      cursor: "not-allowed",
    },
  },
});

export const button = recipe({
  base: {
    position: "relative",
    minWidth: "168px",
    display: "inline-flex",
    flexDirection: "column",
    gap: "5px",
    padding: "7px 14px 6px",
    borderRadius: vars.radius.control,
    borderWidth: "1px",
    borderStyle: "solid",
    overflow: "hidden",
    boxSizing: "border-box",
    fontFamily: vars.font.sans,
    transition: "background-color 220ms ease, border-color 220ms ease",
  },
  variants: {
    status: {
      DETECTED: {
        backgroundColor: vars.surface.mid,
        borderColor: vars.border.negative,
        color: vars.color.negative,
        cursor: "default",
      },
      PREPARING: {
        backgroundColor: vars.surface.mid,
        borderColor: vars.border.strong,
        color: vars.text.primary,
        cursor: "default",
      },
      READY: {
        backgroundColor: vars.color.ctaBg,
        borderColor: vars.color.ctaBg,
        color: vars.color.ctaFg,
        cursor: "pointer",
        selectors: {
          "&:hover": {
            backgroundColor: vars.color.ctaHover,
            borderColor: vars.color.ctaHover,
          },
        },
      },
      EXPIRED: {
        backgroundColor: vars.surface.low,
        borderColor: vars.border.negative,
        color: vars.text.muted,
        cursor: "not-allowed",
      },
    },
  },
  defaultVariants: {
    status: "DETECTED",
  },
});

export const contentHost = style({
  position: "relative",
  width: "100%",
  height: "20px",
  overflow: "hidden",
});

export const contentRow = style({
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "7px",
  fontSize: "12px",
  fontWeight: 600,
  letterSpacing: "-0.01em",
  whiteSpace: "nowrap",
});

export const statusDot = recipe({
  base: {
    width: "5px",
    height: "5px",
    borderRadius: "1px",
    flexShrink: 0,
  },
  variants: {
    status: {
      DETECTED: { backgroundColor: vars.color.negative },
      PREPARING: { backgroundColor: vars.color.positive },
      READY: { backgroundColor: vars.color.ctaFg },
      EXPIRED: { backgroundColor: vars.text.disabled },
    },
    blinking: {
      true: {
        animation: `${pulseBlink} 0.75s ease-in-out infinite`,
      },
      false: {},
    },
  },
  defaultVariants: {
    status: "DETECTED",
    blinking: false,
  },
});

export const track = recipe({
  base: {
    position: "relative",
    width: "100%",
    height: "3px",
    borderRadius: "1px",
    overflow: "hidden",
  },
  variants: {
    ready: {
      true: { backgroundColor: "rgba(9, 9, 11, 0.18)" },
      false: { backgroundColor: vars.border.grid },
    },
  },
  defaultVariants: {
    ready: false,
  },
});

export const gaugeBar = recipe({
  base: {
    height: "100%",
    transformOrigin: "left center",
  },
  variants: {
    status: {
      DETECTED: { backgroundColor: vars.color.negative },
      PREPARING: { backgroundColor: vars.color.positive },
      READY: { backgroundColor: vars.color.ctaFg, width: "100%" },
      EXPIRED: { backgroundColor: vars.border.grid },
    },
    blinking: {
      true: {
        animation: `${pulseBlink} 0.75s ease-in-out infinite`,
      },
      false: {},
    },
  },
  defaultVariants: {
    status: "DETECTED",
    blinking: false,
  },
});

export const segmentMask = recipe({
  base: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    backgroundImage: `repeating-linear-gradient(to right, transparent, transparent 8px, ${vars.surface.base} 8px, ${vars.surface.base} 10px)`,
  },
  variants: {
    ready: {
      true: { opacity: 0.2 },
      false: { opacity: 0.85 },
    },
  },
  defaultVariants: {
    ready: false,
  },
});

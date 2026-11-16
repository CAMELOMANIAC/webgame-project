import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

import { vars } from "@/styles/theme.css";

export const container = style({
  position: "relative",
  display: "flex",
  width: "100%",
  justifyContent: "center",
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
  },
  defaultVariants: {
    status: "DETECTED",
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
  },
  variants: {
    status: {
      DETECTED: { backgroundColor: vars.color.negative },
      PREPARING: { backgroundColor: vars.color.positive },
      READY: { backgroundColor: vars.color.ctaFg },
      EXPIRED: { backgroundColor: vars.border.grid },
    },
  },
  defaultVariants: {
    status: "DETECTED",
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

import { keyframes, style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

export const rollingRoot = style({
  display: "inline-flex",
  alignItems: "baseline",
  position: "relative",
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
  display: "inline-flex",
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
      down: {
        animationDirection: "reverse",
        animationTimingFunction: "ease-in",
      },
    },
  },
});

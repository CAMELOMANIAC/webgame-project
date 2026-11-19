import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

import { vars } from "@/styles/theme.css";

export const stage = style({
  position: "absolute",
  inset: 0,
  overflow: "hidden",
  backgroundColor: vars.surface.base,
});

export const map = style({
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
});

export const fade = recipe({
  base: {
    position: "absolute",
    inset: 0,
    backgroundColor: "#000000",
    opacity: 0,
    pointerEvents: "none",
    transition: "opacity 2.4s ease-in-out",
  },
  variants: {
    visible: {
      true: { opacity: 0.6 },
    },
  },
});

export const skipLayer = style({
  position: "absolute",
  inset: 0,
  padding: 0,
  border: 0,
  background: "transparent",
  cursor: "pointer",
});

import { recipe } from "@vanilla-extract/recipes";

export const container = recipe({
  base: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: 0,
    overflow: "hidden",
    background: "transparent",
  },
  variants: {
    interactive: {
      true: { pointerEvents: "auto" },
      false: { pointerEvents: "none" },
    },
  },
  defaultVariants: {
    interactive: false,
  },
});

export const redFlashOverlay = recipe({
  base: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: 10,
    boxShadow: "inset 0 0 40px rgba(255, 113, 108, 0.45)",
    transition: "opacity 0.12s ease-out",
  },
  variants: {
    visible: {
      true: { opacity: 1 },
      false: { opacity: 0 },
    },
  },
  defaultVariants: {
    visible: false,
  },
});

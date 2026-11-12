import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

export const container = style({
  position: "relative",
  display: "flex",
  width: "100%",
  height: "auto",
  justifyContent: "center",
});

export const buttonModal = recipe({
  base: {
    position: "relative",
    display: "flex",
    width: "auto",
    height: "auto",
    borderRadius: "9999px",
    padding: "6px 16px",
    fontWeight: 800,
    letterSpacing: "1px",
    fontSize: "12px",
    overflow: "hidden",
    backdropFilter: "blur(6px)",
    borderWidth: "1px",
    borderStyle: "solid",
    boxSizing: "border-box",
  },
  variants: {
    theme: {
      READY: {
        backgroundColor: "rgba(133, 173, 255, 0.2)",
        borderColor: "rgba(133, 173, 255, 0.5)",
        color: "rgb(133, 173, 255)",
        cursor: "pointer",
      },
      DANGER: {
        backgroundColor: "rgba(255, 113, 108, 0.2)",
        borderColor: "rgba(255, 113, 108, 0.5)",
        color: "rgb(255, 113, 108)",
        cursor: "default",
      },
      PENDING: {
        backgroundColor: "rgba(150, 150, 150, 0.2)",
        borderColor: "rgba(150, 150, 150, 0.5)",
        color: "rgb(200, 200, 200)",
        cursor: "default",
      },
    },
  },
  defaultVariants: {
    theme: "DANGER",
  },
});

export const gaugeBar = style({
  position: "absolute",
  top: 0,
  left: 0,
  height: "100%",
  backgroundColor: "rgba(255, 255, 255, 0.15)",
  zIndex: 0,
});

export const content = style({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  zIndex: 1,
});

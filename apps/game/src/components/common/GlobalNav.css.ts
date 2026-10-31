import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

import { vars } from "@/styles/theme.css";

export const navContainer = style({
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "6px",
  bottom: 0,
  position: "sticky",
  zIndex: 30,
  width: "100%",
  height: "64px",
  padding: "8px 12px 12px",
  backgroundColor: vars.surface.low,
  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
  color: vars.text.muted,
});

export const navLink = style({
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  height: "100%",
  borderRadius: vars.radius.control,
});

export const activePill = style({
  position: "absolute",
  inset: 0,
  borderRadius: vars.radius.control,
  background: "rgba(255, 255, 255, 0.07)",
  border: "1px solid rgba(255, 255, 255, 0.14)",
  zIndex: 0,
});

export const navItem = recipe({
  base: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "3px",
    width: "100%",
    height: "100%",
    transition: "color 0.15s ease",
  },
  variants: {
    active: {
      true: {
        color: vars.text.primary,
      },
      false: {
        color: vars.text.muted,
      },
    },
  },
  defaultVariants: {
    active: false,
  },
});

export const navLabel = style({
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "-0.01em",
  display: "flex",
  alignItems: "center",
  gap: "3px",
});

export const navIndex = style({
  fontFamily: vars.font.mono,
  fontSize: "10px",
  opacity: 0.65,
  fontVariantNumeric: "tabular-nums",
});

export const navIcon = style({
  width: "16px",
  height: "16px",
});

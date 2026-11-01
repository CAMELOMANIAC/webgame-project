import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

import { vars } from "@/styles/theme.css";

export const navContainer = style({
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "6px",
  position: "absolute",
  bottom: "12px",
  left: "16px",
  right: "16px",
  zIndex: 30,
  height: "58px",
  padding: "6px",
  backgroundColor: "rgba(16, 16, 20, 0.92)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: vars.radius.panel,
  boxShadow:
    "0 10px 30px -4px rgba(0, 0, 0, 0.52), inset 0 1px 0 0 rgba(255, 255, 255, 0.14)",
  color: vars.text.muted,
  viewTransitionName: "global-nav",
  "@supports": {
    "(-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px))": {
      backgroundColor: "rgba(14, 15, 19, 0.70)",
      backdropFilter: "blur(16px) saturate(140%)",
      WebkitBackdropFilter: "blur(16px) saturate(140%)",
    },
  },
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
  top: "6px",
  bottom: "6px",
  left: "6px",
  width: "calc((100% - 30px) / 4)",
  borderRadius: vars.radius.control,
  background: "rgba(255, 255, 255, 0.08)",
  border: "1px solid rgba(255, 255, 255, 0.15)",
  boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.12), 0 2px 6px rgba(0, 0, 0, 0.25)",
  transition: "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
  pointerEvents: "none",
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

import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

import { cornerBrackets, vars } from "@/styles/theme.css";

export const slot = recipe({
  base: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    width: "52px",
    aspectRatio: "1 / 1",
    backdropFilter: "blur(8px)",
    borderRadius: vars.radius.control,
    color: vars.text.primary,
    touchAction: "none",
    overflow: "visible",
    transition: "border-color 0.15s ease, background-color 0.15s ease",
    cursor: "grab",
    selectors: {
      "&:active": {
        cursor: "grabbing",
      },
    },
  },
  variants: {
    state: {
      empty: [
        cornerBrackets({ tone: "none" }),
        {
          border: `1px solid ${vars.border.subtle}`,
          backgroundColor: "rgba(12, 12, 15, 0.78)",
          selectors: {
            "&:hover": {
              borderColor: "rgba(255, 255, 255, 0.12)",
            },
          },
        },
      ],
      casting: [
        cornerBrackets({ tone: "positive" }),
        {
          border: "1px solid rgba(133, 173, 255, 0.55)",
          backgroundColor: "rgba(20, 20, 24, 0.92)",
          selectors: {
            "&:hover": {
              borderColor: "rgba(133, 173, 255, 0.65)",
            },
          },
        },
      ],
      attacking: [
        cornerBrackets({ tone: "default" }),
        {
          border: "1px solid #fafafa",
          backgroundColor: "rgba(20, 20, 24, 0.92)",
        },
      ],
      occupied: [
        cornerBrackets({ tone: "default" }),
        {
          border: `1px solid ${vars.border.strong}`,
          backgroundColor: "rgba(20, 20, 24, 0.92)",
          selectors: {
            "&:hover": {
              borderColor: "rgba(133, 173, 255, 0.45)",
            },
          },
        },
      ],
    },
  },
  defaultVariants: {
    state: "occupied",
  },
});

export const slotIndex = style({
  position: "absolute",
  top: "3px",
  left: "4px",
  fontFamily: vars.font.mono,
  fontSize: "9px",
  color: vars.text.disabled,
  fontVariantNumeric: "tabular-nums",
  pointerEvents: "none",
});

export const weaponNameLabel = style({
  position: "absolute",
  bottom: "3px",
  fontSize: "10px",
  fontWeight: 500,
  color: vars.text.secondary,
  maxWidth: "90%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  pointerEvents: "none",
});

export const cooldownOverlay = style({
  position: "absolute",
  inset: 0,
  borderRadius: "5px",
  background:
    "conic-gradient(rgba(9, 9, 11, 0.84) calc(var(--cooldown-percent, 0) * 360deg), rgba(9, 9, 11, 0.35) 0deg)",
  pointerEvents: "none",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 2,
});

export const cooldownText = style({
  fontFamily: vars.font.mono,
  color: vars.text.primary,
  fontSize: "13px",
  fontWeight: 700,
  fontVariantNumeric: "tabular-nums",
});

export const castBar = style({
  position: "absolute",
  bottom: "3px",
  left: "5px",
  right: "5px",
  height: "3px",
  backgroundColor: vars.border.grid,
  borderRadius: "1px",
  overflow: "hidden",
  zIndex: 3,
});

export const castProgress = style({
  height: "100%",
  backgroundColor: vars.color.positive,
});

export const tooltipLabel = style({
  display: "none",
  position: "absolute",
  bottom: "108%",
  left: "50%",
  transform: "translateX(-50%)",
  backgroundColor: vars.surface.mid,
  border: `1px solid ${vars.border.strong}`,
  borderRadius: vars.radius.control,
  padding: "6px 10px",
  fontSize: "11px",
  whiteSpace: "nowrap",
  pointerEvents: "none",
  zIndex: 100,
  color: vars.text.primary,
  boxShadow: "0 8px 16px rgba(0, 0, 0, 0.45)",
  selectors: {
    "*:hover > &": {
      display: "flex",
      flexDirection: "column",
      gap: "2px",
    },
  },
});

export const tooltipStats = style({
  display: "flex",
  gap: "8px",
  fontFamily: vars.font.mono,
  color: vars.text.secondary,
  fontSize: "11px",
  fontVariantNumeric: "tabular-nums",
  marginTop: "2px",
});

import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

import { cornerBrackets, vars } from "@/styles/theme.css";

export const itemSlotSize = "52px";

const occupiedSlotSurface = {
  backgroundColor: "rgba(20, 20, 24, 0.92)",
  backgroundImage:
    "radial-gradient(circle at 50% 45%, rgba(44, 47, 56, 0.42) 0%, rgba(12, 12, 15, 0.68) 100%)",
  boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.04)",
} as const;

export const slot = recipe({
  base: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    width: itemSlotSize,
    aspectRatio: "1 / 1",
    backdropFilter: "blur(8px)",
    borderRadius: vars.radius.control,
    color: vars.text.primary,
    userSelect: "none",
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
          ...occupiedSlotSurface,
          selectors: {
            "&:hover": {
              borderColor: vars.text.primary,
            },
          },
        },
      ],
      attacking: [
        cornerBrackets({ tone: "default" }),
        {
          border: "1px solid #fafafa",
          ...occupiedSlotSurface,
        },
      ],
      occupied: [
        cornerBrackets({ tone: "default" }),
        {
          border: `1px solid ${vars.border.strong}`,
          ...occupiedSlotSurface,
          selectors: {
            "&:hover": {
              borderColor: vars.text.primary,
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
  zIndex: 1,
  fontFamily: vars.font.mono,
  fontSize: "9px",
  color: vars.text.disabled,
  fontVariantNumeric: "tabular-nums",
  textShadow: "0 1px 2px rgba(0, 0, 0, 0.9)",
  pointerEvents: "none",
});

export const itemNameLabel = style({
  position: "absolute",
  bottom: "2px",
  zIndex: 1,
  fontSize: "10px",
  fontWeight: 500,
  color: vars.text.secondary,
  maxWidth: "90%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  textShadow: "0 1px 2px rgba(0, 0, 0, 0.95), 0 0 4px rgba(0, 0, 0, 0.95)",
  pointerEvents: "none",
});

export const quantityBadge = style({
  position: "absolute",
  top: "3px",
  right: "4px",
  zIndex: 1,
  fontFamily: vars.font.mono,
  fontSize: "9px",
  color: vars.color.positive,
  fontVariantNumeric: "tabular-nums",
  textShadow: "0 1px 2px rgba(0, 0, 0, 0.9)",
  pointerEvents: "none",
});

export const dragging = style({ opacity: 0.25, cursor: "grabbing" });

export const staticSlot = style({
  cursor: "default",
  touchAction: "pan-y",
  selectors: { "&:active": { cursor: "default" } },
});

export const button = style({
  padding: 0,
  selectors: {
    "&:disabled": { opacity: 0.4, cursor: "default" },
  },
});

export const itemImage = style({
  display: "block",
  width: "100%",
  height: "100%",
  padding: "2px",
  boxSizing: "border-box",
  objectFit: "contain",
  pointerEvents: "none",
  userSelect: "none",
  filter: "saturate(0.55) contrast(1.04) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.85))",
});

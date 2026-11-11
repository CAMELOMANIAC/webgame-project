import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

import { cornerBrackets, vars } from "@/styles/theme.css";

export const slot = recipe({
  base: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "space-between",
    position: "relative",
    width: "100%",
    aspectRatio: "1 / 1",
    padding: "8px",
    borderRadius: vars.radius.control,
    color: vars.text.primary,
    userSelect: "none",
    transition:
      "background-color 0.15s ease, border-color 0.15s ease, opacity 0.15s ease",
  },
  variants: {
    state: {
      over: [
        cornerBrackets({ tone: "positive" }),
        {
          border: "1px solid rgba(133, 173, 255, 0.5)",
          backgroundColor: vars.color.positiveBg,
        },
      ],
      occupied: [
        cornerBrackets({ tone: "default" }),
        {
          border: `1px solid ${vars.border.strong}`,
          backgroundColor: vars.surface.high,
        },
      ],
      empty: [
        cornerBrackets({ tone: "none" }),
        {
          border: "1px solid rgba(255, 255, 255, 0.06)",
          backgroundColor: vars.surface.low,
        },
      ],
    },
    dragging: {
      true: {
        opacity: 0.25,
        cursor: "grabbing",
      },
      false: {
        opacity: 1,
      },
    },
    draggable: {
      true: {
        cursor: "grab",
        touchAction: "none",
      },
      false: {
        cursor: "default",
        touchAction: "pan-y",
      },
    },
  },
  defaultVariants: {
    state: "empty",
    dragging: false,
    draggable: false,
  },
});

export const itemName = style({
  fontSize: "12px",
  fontWeight: 600,
  color: vars.text.primary,
  lineHeight: 1.3,
  overflow: "hidden",
  textOverflow: "ellipsis",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
});

export const emptyLabel = style({
  margin: "auto",
  fontFamily: vars.font.mono,
  fontSize: "10px",
  color: vars.text.disabled,
});

export const quantityBadge = style({
  alignSelf: "flex-end",
  fontFamily: vars.font.mono,
  fontSize: "11px",
  fontWeight: 600,
  color: vars.color.positive,
  fontVariantNumeric: "tabular-nums",
});

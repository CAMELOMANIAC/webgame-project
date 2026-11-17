import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

import { fieldWidget, vars } from "@/styles/theme.css";

import survivorPortrait from "../../assets/survivor-portrait-tranparent.png";

export const combatWidget = style([
  fieldWidget({ tone: "default" }),
  {
    gap: "10px",
    padding: "14px",
  },
]);

export const headerRow = style({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingBottom: "8px",
  borderBottom: `1px solid ${vars.border.subtle}`,
});

export const subTitle = style({
  fontSize: "13px",
  fontWeight: 700,
  color: vars.text.primary,
  margin: 0,
});

export const actionLogList = style({
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "flex",
  flexDirection: "row",
  gap: "6px",
  width: "100%",
  overflowX: "auto",
});

export const actionLogItem = recipe({
  base: {
    display: "flex",
    flexDirection: "column",
    position: "relative",
    width: "96px",
    height: "44px",
    flex: "none",
    backgroundColor: vars.surface.low,
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: vars.radius.badge,
    overflow: "hidden",
  },
  variants: {
    role: {
      self: {
        borderRight: `2px solid ${vars.color.positive}`,
      },
      ally: {
        borderRight: `2px solid ${vars.text.primary}`,
      },
      enemy: {
        borderLeft: `2px solid ${vars.color.negative}`,
      },
    },
  },
  defaultVariants: {
    role: "enemy",
  },
});

export const actionLogPortrait = recipe({
  base: {
    width: "46px",
    height: "46px",
    backgroundImage: `url(${survivorPortrait})`,
    backgroundSize: "cover",
    backgroundPosition: "top center",
    backgroundRepeat: "no-repeat",
    position: "absolute",
    top: 0,
    flexShrink: 0,
    selectors: {
      "&::after": {
        content: '""',
        position: "absolute",
        inset: 0,
        background: `linear-gradient(to right, rgba(12, 12, 15, 0) 0%, ${vars.surface.low} 100%)`,
      },
    },
  },
  variants: {
    mirrored: {
      true: {
        right: "-6px",
        transform: "scaleX(-1)",
      },
      false: {
        left: "-6px",
      },
    },
  },
  defaultVariants: {
    mirrored: false,
  },
});

export const actionLogText = recipe({
  base: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: "2px",
    overflow: "hidden",
  },
  variants: {
    mirrored: {
      true: {
        alignItems: "flex-start",
        paddingLeft: "8px",
        paddingRight: "32px",
      },
      false: {
        alignItems: "flex-end",
        paddingRight: "8px",
        paddingLeft: "32px",
      },
    },
  },
  defaultVariants: {
    mirrored: false,
  },
});

export const actionLogType = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  fontWeight: 600,
  color: vars.text.primary,
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const actionLogActor = style({
  fontSize: "11px",
  fontWeight: 500,
  color: vars.text.secondary,
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

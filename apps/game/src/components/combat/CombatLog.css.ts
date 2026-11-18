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
    width: "140px",
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
        borderLeft: `2px solid ${vars.color.positive}`,
      },
      ally: {
        borderLeft: `2px solid ${vars.text.primary}`,
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

export const actionLogPortrait = style({
  width: "46px",
  height: "46px",
  backgroundImage: `url(${survivorPortrait})`,
  backgroundSize: "cover",
  backgroundPosition: "top center",
  backgroundRepeat: "no-repeat",
  position: "absolute",
  top: 0,
  left: "-6px",
  flexShrink: 0,
  selectors: {
    "&::after": {
      content: '""',
      position: "absolute",
      inset: 0,
      background: `linear-gradient(to right, rgba(12, 12, 15, 0) 0%, ${vars.surface.low} 100%)`,
    },
  },
});

export const actionLogText = style({
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "stretch",
  gap: "2px",
  paddingRight: "8px",
  paddingLeft: "34px",
  overflow: "hidden",
});

export const actionLogHeader = style({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "6px",
  width: "100%",
  minWidth: 0,
});

export const actionLogTitle = style({
  fontSize: "11px",
  fontWeight: 600,
  color: vars.text.primary,
  minWidth: 0,
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const actionLogAmount = recipe({
  base: {
    fontFamily: vars.font.mono,
    fontVariantNumeric: "tabular-nums",
    fontSize: "11px",
    fontWeight: 700,
    flexShrink: 0,
  },
  variants: {
    tone: {
      damage: { color: vars.color.negative },
      heal: { color: vars.color.positive },
      shield: { color: vars.text.primary },
      neutral: { color: vars.text.secondary },
    },
  },
  defaultVariants: {
    tone: "neutral",
  },
});

export const actionLogActor = style({
  fontSize: "11px",
  fontWeight: 500,
  color: vars.text.secondary,
  textAlign: "right",
  width: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

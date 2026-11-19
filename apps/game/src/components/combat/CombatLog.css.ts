import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

import { fieldWidget, vars } from "@/styles/theme.css";

import survivorPortrait from "../../assets/survivor-portrait-tranparent.png";

export const combatWidget = style([
  fieldWidget({ tone: "default" }),
  {
    gap: "8px",
    padding: "12px 14px",
  },
]);

export const headerRow = style({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  paddingBottom: "8px",
  borderBottom: `1px solid ${vars.border.subtle}`,
});

export const headerLeft = style({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  minWidth: 0,
});

export const headerRight = style({
  display: "flex",
  alignItems: "center",
  gap: "6px",
  flexShrink: 0,
});

export const subTitle = style({
  fontSize: "13px",
  fontWeight: 700,
  color: vars.text.primary,
  margin: 0,
  whiteSpace: "nowrap",
});

export const tickBadge = recipe({
  base: {
    fontFamily: vars.font.mono,
    fontVariantNumeric: "tabular-nums",
    fontSize: "10px",
    fontWeight: 700,
    padding: "2px 6px",
    borderRadius: vars.radius.badge,
    border: `1px solid ${vars.border.subtle}`,
    backgroundColor: vars.surface.low,
    color: vars.text.secondary,
    letterSpacing: "0.04em",
    whiteSpace: "nowrap",
  },
  variants: {
    overload: {
      true: {
        borderColor: vars.color.negative,
        color: vars.color.negative,
      },
      false: {},
    },
  },
  defaultVariants: {
    overload: false,
  },
});

export const enemyTelemetry = style({
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  paddingBottom: "8px",
  borderBottom: `1px solid ${vars.border.subtle}`,
});

export const enemyMetaRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  minWidth: 0,
});

export const enemyIdentity = style({
  display: "flex",
  alignItems: "center",
  gap: "6px",
  minWidth: 0,
});

export const enemyName = style({
  fontSize: "12px",
  fontWeight: 600,
  color: vars.text.primary,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const enemyVitals = style({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexShrink: 0,
  fontFamily: vars.font.mono,
  fontVariantNumeric: "tabular-nums",
  fontSize: "11px",
  fontWeight: 700,
});

export const enemyShieldText = style({
  color: vars.color.positive,
});

export const enemyHpText = recipe({
  base: {},
  variants: {
    tone: {
      enemy: { color: vars.color.negative },
      ally: { color: vars.text.primary },
    },
  },
  defaultVariants: {
    tone: "enemy",
  },
});

export const enemyLoadoutRow = style({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: "4px",
  overflowX: "auto",
});

export const enemyWeaponChip = recipe({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "2px 6px",
    borderRadius: vars.radius.badge,
    backgroundColor: vars.surface.low,
    border: `1px solid ${vars.border.subtle}`,
    fontSize: "10px",
    color: vars.text.secondary,
    whiteSpace: "nowrap",
    flexShrink: 0,
    cursor: "pointer",
    transition: "border-color 0.15s ease, color 0.15s ease",
    selectors: {
      "&:hover": {
        borderColor: vars.text.primary,
        color: vars.text.primary,
      },
      "&:focus-visible": {
        outline: "none",
        borderColor: vars.text.primary,
        color: vars.text.primary,
      },
    },
  },
  variants: {
    state: {
      idle: {},
      attacking: {
        borderColor: vars.text.primary,
        color: vars.text.primary,
      },
      casting: {
        borderColor: vars.color.positive,
        color: vars.color.positive,
      },
    },
  },
  defaultVariants: {
    state: "idle",
  },
});

export const enemyWeaponSlotIndex = style({
  fontFamily: vars.font.mono,
  fontVariantNumeric: "tabular-nums",
  fontSize: "9px",
  color: vars.text.disabled,
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
    width: "148px",
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

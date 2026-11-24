import { keyframes, style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

import {
  cornerBrackets,
  fieldWidget,
  negativeMutedColor,
  vars,
} from "@/styles/theme.css";

export const cardDeck = style({
  position: "relative",
  width: "100%",
  maxHeight: "100%",
  minHeight: 0,
  overflow: "hidden",
});

export const container = style([
  fieldWidget({ tone: "default" }),
  {
    height: "auto",
    maxHeight: "100%",
    minHeight: 0,
    width: "100%",
    flexDirection: "column",
    justifyContent: "flex-start",
    alignItems: "stretch",
    padding: "14px",
    flex: 0,
    gap: "10px",
  },
]);

export const destinationHeader = style({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "8px",
});

export const destinationRow = style({
  display: "flex",
  flexDirection: "column",
  gap: "3px",
  minWidth: 0,
});

export const headerActions = style({
  display: "flex",
  alignItems: "center",
  gap: "6px",
  flexShrink: 0,
});

export const destinationText = style({
  color: vars.text.primary,
  fontWeight: 700,
  fontSize: "17px",
  letterSpacing: "-0.02em",
  fontVariantNumeric: "tabular-nums",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const statusHint = recipe({
  base: {
    fontSize: "12px",
    margin: 0,
  },
  variants: {
    positive: {
      true: { color: vars.color.positive },
      false: { color: vars.text.secondary },
    },
  },
  defaultVariants: {
    positive: false,
  },
});

export const telemetryGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "1px",
  backgroundColor: vars.border.grid,
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: vars.radius.control,
  overflow: "hidden",
});

export const telemetryCell = style({
  backgroundColor: vars.surface.low,
  padding: "6px 8px",
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: "2px",
  overflow: "hidden",
});

export const cellLabel = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  color: vars.text.muted,
});

export const cellValue = style({
  position: "relative",
  display: "inline-block",
  fontFamily: vars.font.mono,
  fontSize: "13px",
  fontWeight: 600,
  color: vars.text.primary,
  fontVariantNumeric: "tabular-nums",
});

export const cellValueRow = style({
  display: "inline-flex",
  alignItems: "baseline",
  gap: "4px",
});

export const exhaustedMultiplier = style({
  fontFamily: vars.font.mono,
  fontSize: "10px",
  fontWeight: 700,
  color: vars.color.negative,
  fontVariantNumeric: "tabular-nums",
});

export const telemetryGroup = style({
  display: "flex",
  flexDirection: "column",
});

export const pathRiskLegendWrap = recipe({
  base: {
    display: "grid",
    minHeight: 0,
    transition:
      "grid-template-rows 260ms cubic-bezier(0.4, 0, 0.2, 1), opacity 220ms ease-in-out",
    "@media": {
      "(prefers-reduced-motion: reduce)": { transition: "none" },
    },
  },
  variants: {
    visible: {
      true: { gridTemplateRows: "1fr", opacity: 1 },
      false: { gridTemplateRows: "0fr", opacity: 0 },
    },
  },
});

export const pathRiskLegendInner = style({
  minHeight: 0,
  overflow: "hidden",
});

export const pathRiskLegend = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  padding: "8px 2px 0",
});

export const pathRiskItem = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "5px",
  fontSize: "11px",
  color: vars.text.muted,
  whiteSpace: "nowrap",
});

export const pathRiskSwatch = recipe({
  base: {
    display: "inline-block",
    width: "16px",
    flexShrink: 0,
    borderRadius: "999px",
  },
  variants: {
    tier: {
      safe: {
        height: "3px",
        backgroundColor: vars.text.primary,
        opacity: 1,
      },
      medium: {
        height: "3px",
        backgroundColor: negativeMutedColor,
        opacity: 1,
      },
      high: {
        height: "4px",
        backgroundColor: vars.color.negative,
        opacity: 1,
      },
    },
  },
});

export const accessibleValue = style({
  position: "absolute",
  width: "1px",
  height: "1px",
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
});

export const digitRow = style({
  display: "flex",
});

export const digitWindow = style({
  width: "1ch",
  height: "1lh",
  overflow: "hidden",
});

const slideDigit = keyframes({
  from: { transform: "translateY(0)" },
  to: { transform: "translateY(-50%)" },
});

export const digitRoll = recipe({
  base: {
    display: "flex",
    flexDirection: "column",
    animationName: slideDigit,
    animationDuration: "140ms",
    animationTimingFunction: "ease-out",
    animationFillMode: "both",
    "@media": {
      "(prefers-reduced-motion: reduce)": { animationDuration: "0ms" },
    },
  },
  variants: {
    direction: {
      up: { animationDirection: "normal" },
      down: { animationDirection: "reverse", animationTimingFunction: "ease-in" },
    },
  },
});

export const primaryAction = style({
  width: "100%",
  padding: "10px 12px",
  border: 0,
  borderRadius: vars.radius.control,
  backgroundColor: vars.color.ctaBg,
  color: vars.color.ctaFg,
  fontSize: "12px",
  fontWeight: 600,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  transition: "background-color 0.15s ease",
  selectors: {
    "&:hover:not(:disabled)": {
      backgroundColor: vars.color.ctaHover,
    },
    "&:disabled": {
      opacity: 0.4,
      cursor: "default",
    },
  },
});

export const primaryActionWithCost = style([
  primaryAction,
  {
    justifyContent: "space-between",
  },
]);

export const secondaryAction = style({
  width: "100%",
  padding: "9px 12px",
  borderRadius: vars.radius.control,
  border: `1px solid ${vars.border.positive}`,
  backgroundColor: vars.color.positiveBg,
  color: vars.color.positive,
  fontSize: "12px",
  fontWeight: 600,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  cursor: "pointer",
  selectors: {
    "&:disabled": {
      opacity: 0.4,
      cursor: "default",
    },
  },
});

export const actionCode = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  fontVariantNumeric: "tabular-nums",
});

export const recommendToggle = recipe({
  base: {
    flexShrink: 0,
    width: "30px",
    height: "30px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: vars.radius.control,
    cursor: "pointer",
    fontSize: "16px",
    transition: "background-color 0.15s ease, color 0.15s ease",
    selectors: {
      "&:disabled": {
        opacity: 0.4,
        cursor: "default",
      },
    },
  },
  variants: {
    open: {
      true: {
        border: `1px solid ${vars.color.ctaBg}`,
        backgroundColor: vars.color.ctaBg,
        color: vars.color.ctaFg,
        selectors: {
          "&:hover:not(:disabled)": {
            backgroundColor: vars.color.ctaHover,
          },
        },
      },
      false: {
        border: `1px solid ${vars.border.strong}`,
        backgroundColor: vars.surface.low,
        color: vars.text.primary,
        selectors: {
          "&:hover:not(:disabled)": {
            backgroundColor: vars.surface.high,
          },
        },
      },
    },
  },
  defaultVariants: {
    open: false,
  },
});

export const recommendList = style({
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  overflowX: "hidden",
  overflowY: "auto",
  maxHeight: "48dvh",
  minHeight: 0,
  flex: "1 1 auto",
  paddingRight: "2px",
});

export const recommendTabPanel = style({
  display: "flex",
  flexDirection: "column",
  gap: "6px",
});

export const bodySection = recipe({
  base: {
    display: "grid",
    minHeight: 0,
    transition:
      "grid-template-rows 450ms cubic-bezier(0.4, 0, 0.2, 1), opacity 450ms ease-in-out",
    "@media": {
      "(prefers-reduced-motion: reduce)": { transition: "none" },
    },
  },
  variants: {
    visible: {
      true: { gridTemplateRows: "1fr", opacity: 1 },
      false: { gridTemplateRows: "0fr", opacity: 0 },
    },
  },
});

export const bodyContent = style({
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  overflow: "hidden",
  gap: "10px",
});

export const recommendItem = recipe({
  base: {
    position: "relative",
    width: "100%",
    padding: "10px 12px",
    borderRadius: vars.radius.control,
    border: `1px solid ${vars.border.subtle}`,
    backgroundColor: vars.surface.low,
    color: vars.text.primary,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    flexShrink: 0,
    textAlign: "left",
    cursor: "pointer",
    transition: "background-color 0.15s ease, border-color 0.15s ease",
    selectors: {
      "&:hover:not(:disabled)": {
        backgroundColor: vars.surface.high,
        borderColor: vars.border.strong,
      },
      "&:disabled": {
        opacity: 0.45,
        cursor: "default",
      },
    },
  },
  variants: {
    active: {
      true: [
        cornerBrackets({ tone: "default" }),
        {
          borderColor: vars.text.primary,
          backgroundColor: vars.surface.high,
        },
      ],
      false: [cornerBrackets({ tone: "default" })],
    },
  },
  defaultVariants: {
    active: false,
  },
});

export const recommendBackdrop = style({
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  width: "68%",
  borderRadius: vars.radius.control,
  backgroundSize: "cover",
  backgroundPosition: "right center",
  backgroundRepeat: "no-repeat",
  opacity: 0.45,
  pointerEvents: "none",
  zIndex: 0,
  maskImage:
    "linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.35) 38%, black 100%)",
  WebkitMaskImage:
    "linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.35) 38%, black 100%)",
});

export const recommendInfo = style({
  position: "relative",
  zIndex: 1,
  display: "flex",
  flexDirection: "column",
  gap: "3px",
  minWidth: 0,
});

export const recommendMeta = style({
  display: "flex",
  alignItems: "center",
  gap: "6px",
});

export const recommendTag = style({
  fontFamily: vars.font.mono,
  fontSize: "10px",
  fontWeight: 600,
  color: vars.text.secondary,
  padding: "1px 5px",
  borderRadius: "2px",
  border: `1px solid ${vars.border.subtle}`,
});

export const lockdownWarningBadge = style({
  fontFamily: vars.font.mono,
  fontSize: "10px",
  fontWeight: 700,
  color: vars.color.negative,
  padding: "1px 5px",
  borderRadius: "2px",
  border: `1px solid ${vars.border.negative}`,
  fontVariantNumeric: "tabular-nums",
});

export const recommendCode = style({
  fontFamily: vars.font.mono,
  fontSize: "10px",
  color: vars.text.muted,
  fontVariantNumeric: "tabular-nums",
});

export const recommendName = style({
  fontSize: "13px",
  fontWeight: 600,
  color: vars.text.primary,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const recommendTime = style({
  position: "relative",
  zIndex: 1,
  flexShrink: 0,
  fontFamily: vars.font.mono,
  fontSize: "12px",
  fontWeight: 600,
  color: vars.text.secondary,
  fontVariantNumeric: "tabular-nums",
});

export const recommendEmpty = style({
  padding: "14px 12px",
  borderRadius: vars.radius.control,
  border: `1px solid ${vars.border.subtle}`,
  backgroundColor: vars.surface.low,
  color: vars.text.muted,
  fontSize: "12px",
  textAlign: "center",
});

export const showMoreBtn = style({
  width: "100%",
  padding: "8px 12px",
  borderRadius: vars.radius.control,
  border: `1px dashed ${vars.border.subtle}`,
  backgroundColor: "transparent",
  color: vars.text.secondary,
  fontFamily: vars.font.mono,
  fontSize: "11px",
  fontWeight: 600,
  cursor: "pointer",
  transition: "border-color 0.15s ease, color 0.15s ease",
  selectors: {
    "&:hover": {
      color: vars.text.primary,
      borderColor: vars.text.primary,
    },
    "&:focus-visible": {
      outline: `1px solid ${vars.text.primary}`,
      outlineOffset: "1px",
    },
  },
});

export const modeSwitch = style({
  position: "relative",
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  padding: "3px",
  borderRadius: "999px",
  border: `1px solid ${vars.border.subtle}`,
  backgroundColor: vars.surface.low,
  gap: "2px",
  flexShrink: 0,
});

export const modeSwitchBtn = recipe({
  base: {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: "28px",
    borderRadius: "999px",
    border: 0,
    backgroundColor: "transparent",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "color 0.15s ease",
  },
  variants: {
    active: {
      true: {
        color: vars.color.ctaFg,
      },
      false: {
        color: vars.text.muted,
        selectors: {
          "&:hover": {
            color: vars.text.primary,
          },
        },
      },
    },
  },
  defaultVariants: {
    active: false,
  },
});

export const modeSwitchIndicator = style({
  position: "absolute",
  inset: 0,
  borderRadius: "999px",
  backgroundColor: vars.color.ctaBg,
  zIndex: 0,
  pointerEvents: "none",
});

export const modeSwitchBtnInner = style({
  position: "relative",
  zIndex: 1,
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
});

export const recipeCard = recipe({
  base: {
    position: "relative",
    width: "100%",
    padding: "10px 12px",
    borderRadius: vars.radius.control,
    border: `1px solid ${vars.border.subtle}`,
    backgroundColor: vars.surface.low,
    color: vars.text.primary,
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    flexShrink: 0,
    textAlign: "left",
    cursor: "pointer",
    overflow: "visible",
    transition: "background-color 0.15s ease, border-color 0.15s ease",
    selectors: {
      "&:hover": {
        backgroundColor: vars.surface.high,
        borderColor: vars.border.strong,
      },
    },
  },
  variants: {
    active: {
      true: [
        cornerBrackets({ tone: "default" }),
        {
          borderColor: vars.text.primary,
          backgroundColor: vars.surface.high,
        },
      ],
      false: [cornerBrackets({ tone: "default" })],
    },
  },
  defaultVariants: {
    active: false,
  },
});

export const recipeBackdropWrap = style({
  position: "absolute",
  inset: 0,
  overflow: "hidden",
  borderRadius: vars.radius.control,
  pointerEvents: "none",
  zIndex: 0,
});

export const recipeBackdrop = style({
  position: "absolute",
  top: "-18px",
  right: "-18px",
  bottom: "-18px",
  width: "136px",
  backgroundSize: "contain",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  opacity: 0.45,
  pointerEvents: "none",
  zIndex: 0,
  maskImage:
    "linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.55) 40%, black 100%)",
  WebkitMaskImage:
    "linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.55) 40%, black 100%)",
});

export const recipeCardContent = style({
  position: "relative",
  zIndex: 1,
  display: "flex",
  flexDirection: "column",
  gap: "6px",
});

export const recipeHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
});

export const recipeTitleGroup = style({
  display: "flex",
  alignItems: "center",
  gap: "6px",
  minWidth: 0,
});

export const recipeName = style({
  fontSize: "13px",
  fontWeight: 600,
  color: vars.text.primary,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const recipeDetailBtn = style({
  flexShrink: 0,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "26px",
  height: "26px",
  padding: 0,
  color: vars.text.secondary,
  backgroundColor: vars.surface.mid,
  border: `1px solid ${vars.border.subtle}`,
  borderRadius: vars.radius.badge,
  cursor: "pointer",
  transition: "border-color 0.15s ease, color 0.15s ease",
  selectors: {
    "&:hover": {
      color: vars.text.primary,
      borderColor: vars.text.primary,
    },
    "&:focus-visible": {
      outline: `1px solid ${vars.text.primary}`,
      outlineOffset: "1px",
    },
  },
});

export const recipeIngredientsRow = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "4px",
});

export const recipeBaseBadge = recipe({
  base: {
    fontFamily: vars.font.mono,
    fontSize: "11px",
    lineHeight: 1.2,
    padding: "2px 6px",
    borderRadius: vars.radius.badge,
    border: `1px solid ${vars.border.subtle}`,
    backgroundColor: vars.surface.high,
    cursor: "pointer",
    transition: "border-color 0.15s ease, opacity 0.15s ease",
  },
  variants: {
    owned: {
      true: {
        color: vars.text.secondary,
        selectors: {
          "&:hover": {
            borderColor: vars.text.primary,
          },
        },
      },
      false: {
        color: vars.color.negative,
        borderColor: vars.color.negative,
        backgroundColor: vars.color.negativeBg,
        opacity: 0.8,
        selectors: {
          "&:hover": {
            opacity: 1,
          },
        },
      },
    },
    selected: {
      true: {
        boxShadow: `0 0 0 1px ${vars.text.primary}`,
        borderColor: vars.text.primary,
        opacity: 1,
      },
      false: {},
    },
  },
  defaultVariants: {
    owned: false,
    selected: false,
  },
});

export const ingredientChip = recipe({
  base: {
    fontSize: "11px",
    fontWeight: 500,
    lineHeight: 1.2,
    padding: "3px 7px",
    borderRadius: vars.radius.badge,
    cursor: "pointer",
    transition: "border-color 0.15s ease, opacity 0.15s ease",
  },
  variants: {
    owned: {
      true: {
        border: `1px solid ${vars.border.strong}`,
        backgroundColor: vars.surface.high,
        color: vars.text.primary,
        selectors: {
          "&:hover": {
            borderColor: vars.text.primary,
          },
        },
      },
      false: {
        border: `1px solid ${vars.color.negative}`,
        backgroundColor: vars.color.negativeBg,
        color: vars.color.negative,
        opacity: 0.78,
        selectors: {
          "&:hover": {
            opacity: 1,
          },
        },
      },
    },
    selected: {
      true: {
        boxShadow: `0 0 0 1px ${vars.text.primary}`,
        borderColor: vars.text.primary,
        opacity: 1,
      },
      false: {},
    },
  },
  defaultVariants: {
    owned: false,
    selected: false,
  },
});

export const buildingEventCard = style([
  fieldWidget({ tone: "default" }),
  {
    position: "relative",
    height: "auto",
    maxHeight: "100%",
    minHeight: 0,
    width: "100%",
    flexDirection: "column",
    justifyContent: "flex-start",
    alignItems: "stretch",
    padding: 0,
    flex: 0,
    overflow: "hidden",
  },
]);

export const buildingEventContent = style({
  position: "relative",
  zIndex: 1,
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  padding: "14px",
  minHeight: 0,
  overflowY: "auto",
});

export const buildingEventHero = style({
  position: "relative",
  margin: "-14px -14px 0",
  padding: "14px 14px 12px",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  overflow: "hidden",
  flexShrink: 0,
});

export const buildingEventHeader = style({
  position: "relative",
  zIndex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
});

export const buildingEventTitle = style({
  fontSize: "12px",
  fontWeight: 600,
  color: vars.text.primary,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const districtBadge = style({
  flexShrink: 0,
  fontFamily: vars.font.mono,
  fontSize: "10px",
  fontWeight: 600,
  color: vars.text.secondary,
  fontVariantNumeric: "tabular-nums",
});

export const buildingEventImageWrap = style({
  position: "absolute",
  inset: 0,
  zIndex: 0,
  pointerEvents: "none",
  overflow: "hidden",
  WebkitMaskImage:
    "linear-gradient(180deg, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.75) 55%, rgba(0, 0, 0, 0) 100%)",
  maskImage:
    "linear-gradient(180deg, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.75) 55%, rgba(0, 0, 0, 0) 100%)",
  selectors: {
    "&::after": {
      content: '""',
      position: "absolute",
      inset: 0,
      background:
        "linear-gradient(180deg, rgba(14, 15, 18, 0.3) 0%, rgba(14, 15, 18, 0) 100%)",
    },
  },
});

export const buildingEventImage = style({
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
  opacity: 0.28,
});

export const buildingEventText = style({
  position: "relative",
  zIndex: 1,
  margin: 0,
  padding: "10px 12px",
  borderRadius: vars.radius.control,
  backgroundColor: "rgba(9, 9, 11, 0.45)",
  backdropFilter: "blur(4px)",
  WebkitBackdropFilter: "blur(4px)",
  fontSize: "12px",
  lineHeight: 1.6,
  color: vars.text.primary,
});

export const buildingActionBtn = style({
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  textAlign: "left",
  padding: "8px 10px",
  borderRadius: vars.radius.control,
  border: `1px solid ${vars.border.subtle}`,
  backgroundColor: vars.surface.high,
  color: vars.text.primary,
  fontSize: "12px",
  fontWeight: 600,
  cursor: "pointer",
  selectors: {
    "&:hover:not(:disabled)": {
      borderColor: vars.border.strong,
    },
    "&:disabled": {
      opacity: 0.45,
      cursor: "not-allowed",
    },
  },
});

export const craftSubmitBtn = style([
  buildingActionBtn,
  {
    border: `1px solid ${vars.color.ctaBg}`,
    backgroundColor: vars.color.ctaBg,
    color: vars.color.ctaFg,
    transition: "background-color 0.15s ease, color 0.15s ease, opacity 0.15s ease",
    selectors: {
      "&:hover:not(:disabled)": {
        borderColor: vars.color.ctaHover,
        backgroundColor: vars.color.ctaHover,
      },
      "&:disabled": {
        border: `1px solid ${vars.border.subtle}`,
        backgroundColor: vars.surface.high,
        color: vars.text.primary,
        opacity: 0.45,
        cursor: "not-allowed",
      },
    },
  },
]);

export const buildingDismissBtn = style([
  buildingActionBtn,
  {
    justifyContent: "center",
    textAlign: "center",
  },
]);

export const buildingChoiceList = style({
  display: "flex",
  flexDirection: "column",
  gap: "6px",
});

export const buildingChoiceTextGroup = style({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  minWidth: 0,
});

export const buildingChoiceCondition = style({
  fontSize: "11px",
  fontWeight: 500,
  color: vars.text.muted,
});

export const craftList = style({
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  paddingTop: "6px",
  borderTop: `1px solid ${vars.border.subtle}`,
});

export const craftOption = recipe({
  base: [
    cornerBrackets({ tone: "default" }),
    {
      position: "relative",
      display: "flex",
      alignItems: "flex-start",
      gap: "10px",
      padding: "10px",
      borderRadius: vars.radius.control,
      border: `1px solid ${vars.border.subtle}`,
      backgroundColor: vars.surface.base,
      cursor: "pointer",
      transition: "border-color 0.15s ease, background-color 0.15s ease",
      selectors: {
        "&:hover": {
          borderColor: vars.border.strong,
        },
        "&:has(input:focus-visible)": {
          outline: `1px solid ${vars.text.primary}`,
          outlineOffset: "1px",
        },
      },
    },
  ],
  variants: {
    selected: {
      true: {
        borderColor: vars.text.primary,
        backgroundColor: vars.surface.high,
        selectors: {
          "&:hover": {
            borderColor: vars.text.primary,
          },
        },
      },
      false: {},
    },
    unavailable: {
      true: {
        opacity: 0.6,
      },
      false: {},
    },
  },
  defaultVariants: {
    selected: false,
    unavailable: false,
  },
});

export const craftRadioInput = style({
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
});

export const craftRadioIndicator = recipe({
  base: {
    position: "relative",
    zIndex: 1,
    flexShrink: 0,
    marginTop: "3px",
    width: "14px",
    height: "14px",
    borderRadius: "50%",
    border: `1px solid ${vars.border.strong}`,
    backgroundColor: "transparent",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "border-color 0.15s ease, background-color 0.15s ease",
  },
  variants: {
    selected: {
      true: {
        borderColor: vars.text.primary,
        backgroundColor: vars.text.primary,
        boxShadow: `inset 0 0 0 3px ${vars.surface.high}`,
      },
      false: {},
    },
  },
  defaultVariants: {
    selected: false,
  },
});

export const craftCardContent = style([
  recipeCardContent,
  {
    flex: 1,
    minWidth: 0,
  },
]);

export const craftMaterialPicker = style({
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  paddingTop: "6px",
  borderTop: `1px solid ${vars.border.subtle}`,
});

export const craftSlotRow = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "4px",
});

export const craftSlotLabel = style({
  minWidth: "44px",
  fontFamily: vars.font.mono,
  fontSize: "11px",
  lineHeight: 1.2,
  color: vars.text.secondary,
});

export const lootCard = style([
  fieldWidget({ tone: "default" }),
  {
    height: "auto",
    maxHeight: "100%",
    minHeight: 0,
    width: "100%",
    flexDirection: "column",
    justifyContent: "flex-start",
    alignItems: "stretch",
    padding: "14px",
    flex: 0,
    gap: "10px",
    overflowY: "auto",
  },
]);

export const lootHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
});

export const lootTitle = style({
  fontSize: "14px",
  fontWeight: 700,
  color: vars.text.primary,
  letterSpacing: "-0.02em",
});

export const lootList = style({
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  gap: "8px",
  maxHeight: "34dvh",
  overflowY: "auto",
  padding: "2px",
});

export const lootRow = recipe({
  base: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: "58px",
    flexShrink: 0,
    aspectRatio: "1 / 1",
    padding: 0,
    borderRadius: vars.radius.control,
    backdropFilter: "blur(8px)",
    color: vars.text.primary,
    userSelect: "none",
    transition: "border-color 0.15s ease, background-color 0.15s ease",
  },
  variants: {
    blocked: {
      false: {
        border: `1px solid ${vars.border.strong}`,
        backgroundColor: "rgba(20, 20, 24, 0.92)",
        backgroundImage:
          "radial-gradient(circle at 50% 45%, rgba(44, 47, 56, 0.42) 0%, rgba(12, 12, 15, 0.68) 100%)",
        boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.04)",
        cursor: "pointer",
        selectors: {
          "&:hover:not(:disabled)": {
            borderColor: vars.text.primary,
          },
          "&:disabled": {
            opacity: 0.45,
            cursor: "default",
          },
        },
      },
      true: {
        border: `1px solid ${vars.border.negative}`,
        backgroundColor: vars.color.negativeBg,
        opacity: 0.65,
        cursor: "not-allowed",
      },
    },
  },
  defaultVariants: {
    blocked: false,
  },
});

export const lootSlotWeight = style({
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

export const lootBulkRow = style({
  display: "flex",
  flexDirection: "column",
  gap: "6px",
});

export const lootAbandonBtn = style({
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "9px 12px",
  borderRadius: vars.radius.control,
  border: `1px solid ${vars.border.strong}`,
  backgroundColor: vars.surface.low,
  color: vars.text.primary,
  fontSize: "12px",
  fontWeight: 600,
  whiteSpace: "nowrap",
  cursor: "pointer",
  transition: "background-color 0.15s ease",
  selectors: {
    "&:hover:not(:disabled)": {
      backgroundColor: vars.surface.high,
    },
    "&:disabled": {
      opacity: 0.4,
      cursor: "default",
    },
  },
});

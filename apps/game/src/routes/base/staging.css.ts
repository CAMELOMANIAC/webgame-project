import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

import { cornerBrackets, vars } from "@/styles/theme.css";

export const container = style({
  display: "flex",
  flexDirection: "column",
  width: "100%",
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "0 16px 148px",
  color: vars.text.primary,
  gap: "16px",
});

export const headerArea = style({
  paddingBottom: "12px",
  borderBottom: `1px solid ${vars.border.subtle}`,
  display: "flex",
  flexDirection: "column",
  gap: "12px",
});

export const headerTop = style({
  position: "sticky",
  top: 0,
  zIndex: 20,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  margin: "0 -16px",
  padding: "16px 16px 14px",
  backgroundColor: "rgba(9, 9, 11, 0.92)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  borderBottom: `1px solid ${vars.border.subtle}`,
});

export const headerTitleGroup = style({
  display: "flex",
  alignItems: "center",
  gap: "12px",
});

export const backButton = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "36px",
  height: "36px",
  border: `1px solid ${vars.border.strong}`,
  borderRadius: vars.radius.control,
  background: vars.surface.mid,
  color: vars.text.primary,
  fontSize: "16px",
  cursor: "pointer",
  transition: "background-color 0.15s ease, border-color 0.15s ease",
  flexShrink: 0,
  selectors: {
    "&:hover": {
      background: vars.surface.high,
      borderColor: vars.border.subtle,
    },
  },
});

export const backArrow = style({
  lineHeight: 1,
});

export const title = style({
  margin: 0,
  fontSize: "22px",
  fontWeight: 700,
  letterSpacing: "-0.02em",
  color: vars.text.primary,
});

export const telemetryCode = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  color: vars.text.muted,
  fontVariantNumeric: "tabular-nums",
  letterSpacing: "0.06em",
});

export const stepBadge = style({
  fontFamily: vars.font.mono,
  fontSize: "12px",
  color: vars.text.secondary,
  fontVariantNumeric: "tabular-nums",
  letterSpacing: "0.06em",
  display: "flex",
  alignItems: "baseline",
  gap: "4px",
});

export const stepNumber = style({
  fontSize: "15px",
  fontWeight: 700,
  color: vars.text.primary,
});

export const stepTotal = style({
  fontSize: "11px",
  color: vars.text.muted,
});

export const stepDescription = style({
  margin: 0,
  color: vars.text.secondary,
  fontSize: "13px",
  lineHeight: 1.5,
});

export const contentArea = style({
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  minWidth: 0,
});

export const floatingCtaContainer = style({
  position: "fixed",
  bottom: "82px",
  left: "16px",
  right: "16px",
  zIndex: 25,
  display: "flex",
  justifyContent: "center",
  pointerEvents: "none",
});

export const floatingCtaButton = style({
  minHeight: "48px",
  minWidth: "220px",
  maxWidth: "356px",
  width: "100%",
  padding: "0 24px",
  border: 0,
  borderRadius: vars.radius.control,
  backgroundColor: vars.color.ctaBg,
  color: vars.color.ctaFg,
  fontSize: "14px",
  fontWeight: 700,
  letterSpacing: "-0.01em",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  pointerEvents: "auto",
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(250, 250, 250, 0.16)",
  transition: "background-color 0.15s ease, transform 0.1s ease, opacity 0.15s ease",
  selectors: {
    "&:hover:not(:disabled)": {
      backgroundColor: vars.color.ctaHover,
    },
    "&:active:not(:disabled)": {
      transform: "scale(0.98)",
    },
    "&:disabled": {
      opacity: 0.45,
      cursor: "default",
    },
  },
});

export const entryGrid = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: "8px",
});

export const entryCard = recipe({
  base: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: vars.radius.control,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "6px",
    textAlign: "left",
    cursor: "pointer",
    transition: "background-color 0.15s ease, border-color 0.15s ease",
    selectors: {
      "&:hover:not(:disabled)": {
        backgroundColor: vars.surface.high,
        borderColor: "rgba(250, 250, 250, 0.24)",
      },
      "&:disabled": {
        opacity: 0.55,
        cursor: "default",
      },
    },
  },
  variants: {
    selected: {
      true: [
        cornerBrackets({ tone: "default" }),
        {
          border: "1px solid rgba(250, 250, 250, 0.36)",
          backgroundColor: vars.surface.high,
        },
      ],
      false: [
        cornerBrackets({ tone: "none" }),
        {
          border: `1px solid ${vars.border.subtle}`,
          backgroundColor: vars.surface.low,
        },
      ],
    },
  },
  defaultVariants: {
    selected: false,
  },
});

export const entryHeader = style({
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
});

export const entryCode = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  fontWeight: 600,
  color: vars.text.secondary,
  fontVariantNumeric: "tabular-nums",
});

export const entryBadge = style({
  fontFamily: vars.font.mono,
  fontSize: "10px",
  fontWeight: 600,
  padding: "2px 6px",
  borderRadius: vars.radius.badge,
  color: vars.color.positive,
  backgroundColor: vars.color.positiveBg,
});

export const entryName = style({
  fontSize: "15px",
  fontWeight: 700,
  color: vars.text.primary,
  letterSpacing: "-0.01em",
});

export const entryMeta = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  fontWeight: 600,
  color: vars.text.secondary,
  fontVariantNumeric: "tabular-nums",
});

export const entryMaterials = style({
  fontSize: "12px",
  color: vars.text.muted,
  lineHeight: 1.4,
});

export const entryMinimapWrap = style({
  position: "relative",
  width: "100%",
  aspectRatio: "1850 / 820",
  borderRadius: vars.radius.control,
  border: `1px solid ${vars.border.subtle}`,
  backgroundColor: vars.surface.low,
  boxSizing: "border-box",
  overflow: "hidden",
});

export const entryMinimapSvg = style({
  display: "block",
  width: "100%",
  height: "100%",
});

export const entryMinimapDistrict = style({
  fill: "rgba(255, 255, 255, 0.03)",
  stroke: vars.border.strong,
  strokeWidth: 1,
  strokeLinejoin: "round",
});

const entryMinimapChip = style({
  position: "absolute",
  transform: "translate(-50%, -50%)",
  padding: "1px 4px",
  borderRadius: vars.radius.badge,
  fontFamily: vars.font.mono,
  fontSize: "10px",
  fontWeight: 700,
  lineHeight: "14px",
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
});

export const entryMinimapExtraction = style([
  entryMinimapChip,
  {
    color: vars.color.positive,
    backgroundColor: vars.surface.low,
    border: `1px solid ${vars.border.positive}`,
    pointerEvents: "none",
  },
]);

export const entryMinimapMarker = recipe({
  base: [
    entryMinimapChip,
    {
      cursor: "pointer",
      transition: "border-color 0.15s ease, color 0.15s ease",
      selectors: {
        "&:disabled": {
          cursor: "default",
        },
      },
    },
  ],
  variants: {
    selected: {
      true: {
        zIndex: 1,
        color: vars.color.ctaFg,
        backgroundColor: vars.text.primary,
        border: `1px solid ${vars.text.primary}`,
      },
      false: {
        color: vars.text.secondary,
        backgroundColor: vars.surface.high,
        border: `1px solid ${vars.border.strong}`,
        selectors: {
          "&:hover:not(:disabled)": {
            borderColor: vars.text.primary,
            color: vars.text.primary,
          },
        },
      },
    },
  },
  defaultVariants: {
    selected: false,
  },
});

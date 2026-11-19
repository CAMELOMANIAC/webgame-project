import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

import { vars } from "@/styles/theme.css";

export const layout = style({
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  width: "100%",
});

export const telemetryGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "1px",
  backgroundColor: vars.border.grid,
  border: `1px solid ${vars.border.grid}`,
  borderRadius: vars.radius.control,
  overflow: "hidden",
});

export const telemetryCell = style({
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  padding: "12px 14px",
  backgroundColor: vars.surface.mid,
});

export const telemetryLabel = style({
  fontFamily: vars.font.mono,
  fontSize: "10px",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: vars.text.muted,
});

export const telemetryValue = recipe({
  base: {
    fontFamily: vars.font.mono,
    fontSize: "18px",
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
    color: vars.text.primary,
  },
  variants: {
    tone: {
      default: { color: vars.text.primary },
      positive: { color: vars.color.positive },
      negative: { color: vars.color.negative },
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

export const toolbar = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
});

export const tabGroup = style({
  display: "inline-flex",
  flexWrap: "wrap",
  gap: "6px",
});

export const modeTab = recipe({
  base: {
    padding: "8px 14px",
    borderRadius: vars.radius.control,
    border: `1px solid ${vars.border.grid}`,
    backgroundColor: vars.surface.mid,
    color: vars.text.secondary,
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    transition:
      "border-color 0.12s ease, color 0.12s ease, background-color 0.12s ease",
    ":hover": {
      borderColor: vars.text.primary,
      color: vars.text.primary,
    },
    ":focus-visible": {
      outline: `1px solid ${vars.text.primary}`,
      outlineOffset: "1px",
    },
  },
  variants: {
    active: {
      true: {
        borderColor: vars.text.primary,
        backgroundColor: vars.surface.high,
        color: vars.text.primary,
      },
      false: {},
    },
  },
  defaultVariants: {
    active: false,
  },
});

export const filterTab = recipe({
  base: {
    padding: "6px 10px",
    borderRadius: vars.radius.badge,
    border: `1px solid ${vars.border.subtle}`,
    backgroundColor: vars.surface.low,
    color: vars.text.muted,
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "border-color 0.12s ease, color 0.12s ease",
    ":hover": {
      borderColor: vars.text.primary,
      color: vars.text.primary,
    },
    ":focus-visible": {
      outline: `1px solid ${vars.text.primary}`,
      outlineOffset: "1px",
    },
  },
  variants: {
    active: {
      true: {
        borderColor: vars.text.primary,
        color: vars.text.primary,
        backgroundColor: vars.surface.high,
      },
      false: {},
    },
  },
  defaultVariants: {
    active: false,
  },
});

export const searchInput = style({
  flex: "1 1 180px",
  maxWidth: "240px",
  padding: "7px 10px",
  borderRadius: vars.radius.control,
  border: `1px solid ${vars.border.grid}`,
  backgroundColor: vars.surface.low,
  color: vars.text.primary,
  fontSize: "12px",
  "::placeholder": {
    color: vars.text.muted,
  },
  ":focus": {
    outline: "none",
    borderColor: vars.text.primary,
  },
});

export const tableShell = style({
  display: "flex",
  flexDirection: "column",
  border: `1px solid ${vars.border.grid}`,
  borderRadius: vars.radius.control,
  backgroundColor: vars.surface.mid,
  overflow: "hidden",
});

export const auctionRow = style({
  display: "grid",
  gridTemplateColumns:
    "44px minmax(170px, 1.8fr) minmax(76px, auto) minmax(96px, auto) auto",
  alignItems: "center",
  gap: "12px",
  padding: "10px 14px",
  borderBottom: `1px solid ${vars.border.subtle}`,
  backgroundColor: vars.surface.mid,
  transition: "background-color 0.12s ease",
  ":hover": {
    backgroundColor: vars.surface.high,
  },
  selectors: {
    "&:last-child": {
      borderBottom: "none",
    },
  },
  "@media": {
    "(max-width: 780px)": {
      gridTemplateColumns: "40px minmax(0, 1fr)",
      gap: "8px 10px",
    },
  },
});

export const thumbBox = style({
  width: "40px",
  height: "40px",
  borderRadius: vars.radius.badge,
  border: `1px solid ${vars.border.grid}`,
  backgroundColor: vars.surface.low,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  flexShrink: 0,
});

export const thumbImg = style({
  width: "32px",
  height: "32px",
  objectFit: "contain",
});

export const thumbFallback = style({
  fontFamily: vars.font.mono,
  fontSize: "10px",
  color: vars.text.muted,
});

export const itemInfo = style({
  display: "flex",
  flexDirection: "column",
  gap: "3px",
  minWidth: 0,
});

export const itemTitleRow = style({
  display: "flex",
  alignItems: "center",
  gap: "6px",
  flexWrap: "wrap",
});

export const itemName = style({
  fontSize: "13px",
  fontWeight: 600,
  color: vars.text.primary,
});

export const qtyPill = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  fontVariantNumeric: "tabular-nums",
  color: vars.text.secondary,
});

export const badge = recipe({
  base: {
    fontFamily: vars.font.mono,
    fontSize: "10px",
    padding: "1px 5px",
    borderRadius: vars.radius.badge,
    border: `1px solid ${vars.border.grid}`,
    color: vars.text.secondary,
    backgroundColor: vars.surface.low,
  },
  variants: {
    tone: {
      neutral: {},
      positive: {
        borderColor: vars.border.positive,
        color: vars.color.positive,
        backgroundColor: vars.color.positiveBg,
      },
      negative: {
        borderColor: vars.border.negative,
        color: vars.color.negative,
        backgroundColor: vars.color.negativeBg,
      },
    },
  },
  defaultVariants: {
    tone: "neutral",
  },
});

export const itemMeta = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  fontVariantNumeric: "tabular-nums",
  color: vars.text.muted,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const statCell = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: "2px",
  fontFamily: vars.font.mono,
  fontVariantNumeric: "tabular-nums",
  "@media": {
    "(max-width: 780px)": {
      alignItems: "flex-start",
    },
  },
});

export const statSub = style({
  fontSize: "10px",
  color: vars.text.muted,
});

export const statVal = recipe({
  base: {
    fontSize: "13px",
    fontWeight: 600,
    color: vars.text.primary,
  },
  variants: {
    tone: {
      default: { color: vars.text.primary },
      positive: { color: vars.color.positive },
      negative: { color: vars.color.negative },
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

export const actionCell = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: "6px",
  "@media": {
    "(max-width: 780px)": {
      gridColumn: "1 / -1",
      justifyContent: "flex-start",
    },
  },
});

export const numberInput = style({
  width: "82px",
  height: "28px",
  padding: "0 8px",
  borderRadius: vars.radius.badge,
  border: `1px solid ${vars.border.grid}`,
  backgroundColor: vars.surface.low,
  color: vars.text.primary,
  fontFamily: vars.font.mono,
  fontSize: "12px",
  fontVariantNumeric: "tabular-nums",
  textAlign: "right",
  ":focus": {
    outline: "none",
    borderColor: vars.text.primary,
  },
});

export const qtyStepper = style({
  display: "inline-flex",
  alignItems: "center",
  border: `1px solid ${vars.border.grid}`,
  borderRadius: vars.radius.badge,
  backgroundColor: vars.surface.low,
  overflow: "hidden",
});

export const qtyBtn = style({
  width: "24px",
  height: "28px",
  border: "none",
  backgroundColor: "transparent",
  color: vars.text.secondary,
  fontFamily: vars.font.mono,
  fontSize: "12px",
  cursor: "pointer",
  ":hover": {
    color: vars.text.primary,
    backgroundColor: vars.surface.high,
  },
  ":disabled": {
    color: vars.text.disabled,
    cursor: "not-allowed",
  },
});

export const qtyDisplay = style({
  minWidth: "28px",
  textAlign: "center",
  fontFamily: vars.font.mono,
  fontSize: "12px",
  fontVariantNumeric: "tabular-nums",
  color: vars.text.primary,
  borderLeft: `1px solid ${vars.border.subtle}`,
  borderRight: `1px solid ${vars.border.subtle}`,
  padding: "0 4px",
});

export const secondaryBtn = style({
  height: "28px",
  padding: "0 10px",
  borderRadius: vars.radius.badge,
  border: `1px solid ${vars.border.grid}`,
  backgroundColor: vars.surface.low,
  color: vars.text.secondary,
  fontFamily: vars.font.mono,
  fontSize: "11px",
  fontVariantNumeric: "tabular-nums",
  cursor: "pointer",
  ":hover": {
    borderColor: vars.text.primary,
    color: vars.text.primary,
  },
  ":disabled": {
    color: vars.text.disabled,
    cursor: "not-allowed",
  },
});

export const primaryBtn = style({
  height: "28px",
  minWidth: "66px",
  padding: "0 12px",
  borderRadius: vars.radius.badge,
  border: `1px solid ${vars.color.ctaBg}`,
  backgroundColor: vars.color.ctaBg,
  color: vars.color.ctaFg,
  fontSize: "12px",
  fontWeight: 700,
  cursor: "pointer",
  transition: "background-color 0.12s ease",
  ":hover": {
    backgroundColor: vars.color.ctaHover,
  },
  ":disabled": {
    borderColor: vars.border.grid,
    backgroundColor: vars.surface.low,
    color: vars.text.disabled,
    cursor: "not-allowed",
  },
});

export const emptyState = style({
  padding: "28px 16px",
  textAlign: "center",
  fontSize: "12px",
  color: vars.text.muted,
});

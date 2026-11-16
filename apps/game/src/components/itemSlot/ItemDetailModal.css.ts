import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

import { vars } from "@/styles/theme.css";

export const dialog = style({
  margin: "auto",
  padding: 0,
  width: "min(340px, calc(100vw - 32px))",
  maxHeight: "calc(100dvh - 32px)",
  border: `1px solid ${vars.border.strong}`,
  borderRadius: vars.radius.panel,
  backgroundColor: vars.surface.mid,
  color: vars.text.primary,
  boxShadow: "0 20px 48px rgba(0, 0, 0, 0.65)",
  selectors: {
    "&[open]": {
      display: "flex",
      flexDirection: "column",
    },
    "&:modal": {
      overscrollBehavior: "contain",
    },
    "&::backdrop": {
      backgroundColor: "rgba(9, 9, 11, 0.78)",
      backdropFilter: "blur(6px)",
      overflow: "hidden",
      overscrollBehavior: "contain",
    },
  },
});

export const content = style({
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  padding: "14px",
  overflowY: "auto",
});

export const header = style({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "10px",
});

export const titleGroup = style({
  display: "flex",
  alignItems: "center",
  gap: "10px",
  minWidth: 0,
});

export const iconFrame = style({
  width: "44px",
  height: "44px",
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: vars.radius.control,
  border: `1px solid ${vars.border.subtle}`,
  backgroundColor: vars.surface.low,
});

export const titleMeta = style({
  display: "flex",
  flexDirection: "column",
  gap: "3px",
  minWidth: 0,
});

export const slotMeta = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  color: vars.text.muted,
  fontVariantNumeric: "tabular-nums",
});

export const titleRow = style({
  display: "flex",
  alignItems: "center",
  gap: "6px",
  minWidth: 0,
});

export const title = style({
  margin: 0,
  fontSize: "15px",
  fontWeight: 700,
  letterSpacing: "-0.02em",
  color: vars.text.primary,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const quantityBadge = style({
  flexShrink: 0,
  fontFamily: vars.font.mono,
  fontSize: "11px",
  fontWeight: 700,
  fontVariantNumeric: "tabular-nums",
  padding: "1px 5px",
  borderRadius: vars.radius.badge,
  border: `1px solid ${vars.border.subtle}`,
  backgroundColor: vars.surface.high,
  color: vars.text.secondary,
});

export const closeBtn = style({
  flexShrink: 0,
  width: "28px",
  height: "28px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: vars.radius.control,
  border: `1px solid ${vars.border.subtle}`,
  backgroundColor: vars.surface.low,
  color: vars.text.secondary,
  cursor: "pointer",
  fontSize: "16px",
  transition: "border-color 0.15s ease, color 0.15s ease",
  selectors: {
    "&:hover": {
      borderColor: vars.border.strong,
      color: vars.text.primary,
    },
  },
});

export const tagRow = style({
  display: "flex",
  flexWrap: "wrap",
  gap: "4px",
});

export const tagBadge = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  lineHeight: 1.2,
  padding: "2px 6px",
  borderRadius: vars.radius.badge,
  border: `1px solid ${vars.border.grid}`,
  backgroundColor: vars.surface.high,
  color: vars.text.secondary,
});

export const statsGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "1px",
  backgroundColor: vars.border.grid,
  border: `1px solid ${vars.border.subtle}`,
  borderRadius: vars.radius.control,
  overflow: "hidden",
});

export const statCell = style({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  padding: "7px 8px",
  backgroundColor: vars.surface.low,
});

export const statLabel = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  color: vars.text.muted,
});

export const statValue = style({
  fontFamily: vars.font.mono,
  fontSize: "12px",
  fontWeight: 600,
  color: vars.text.primary,
  fontVariantNumeric: "tabular-nums",
});

export const synergyBox = style({
  display: "flex",
  flexDirection: "column",
  gap: "3px",
  padding: "8px 10px",
  borderRadius: vars.radius.control,
  border: `1px solid ${vars.border.subtle}`,
  backgroundColor: vars.surface.low,
});

export const synergyLabel = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  color: vars.text.muted,
});

export const synergyText = style({
  fontFamily: vars.font.mono,
  fontSize: "12px",
  fontWeight: 600,
  color: vars.text.primary,
  fontVariantNumeric: "tabular-nums",
});

export const description = style({
  margin: 0,
  fontSize: "12px",
  lineHeight: 1.55,
  color: vars.text.secondary,
});

export const sourceBox = style({
  display: "flex",
  flexDirection: "column",
  gap: "3px",
  padding: "8px 10px",
  borderRadius: vars.radius.control,
  border: `1px solid ${vars.border.subtle}`,
  backgroundColor: vars.surface.low,
});

export const sourceLabel = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  color: vars.text.muted,
});

export const sourceText = style({
  fontSize: "12px",
  lineHeight: 1.45,
  color: vars.text.primary,
});

export const actionRow = style({
  display: "flex",
  gap: "8px",
  paddingTop: "4px",
});

export const actionButton = recipe({
  base: {
    flex: 1,
    padding: "9px 12px",
    borderRadius: vars.radius.control,
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background-color 0.15s ease, border-color 0.15s ease",
    selectors: {
      "&:disabled": {
        opacity: 0.4,
        cursor: "not-allowed",
      },
    },
  },
  variants: {
    tone: {
      primary: {
        border: 0,
        backgroundColor: vars.color.ctaBg,
        color: vars.color.ctaFg,
        selectors: {
          "&:hover:not(:disabled)": {
            backgroundColor: vars.color.ctaHover,
          },
        },
      },
      default: {
        border: `1px solid ${vars.border.strong}`,
        backgroundColor: vars.surface.high,
        color: vars.text.primary,
        selectors: {
          "&:hover:not(:disabled)": {
            borderColor: vars.text.primary,
          },
        },
      },
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

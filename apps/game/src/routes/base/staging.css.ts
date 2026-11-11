import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

import { vars } from "@/styles/theme.css";

export const container = style({
  display: "flex",
  flexDirection: "column",
  width: "100%",
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "20px 16px 120px",
  color: vars.text.primary,
  gap: "16px",
});

export const headerArea = style({
  paddingBottom: "16px",
  borderBottom: `1px solid ${vars.border.subtle}`,
  display: "flex",
  flexDirection: "column",
  gap: "12px",
});

export const headerTop = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
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

export const floatingDock = style({
  position: "fixed",
  bottom: "20px",
  left: "16px",
  right: "16px",
  maxWidth: "760px",
  margin: "0 auto",
  zIndex: 40,
  backgroundColor: "rgba(16, 16, 20, 0.94)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255, 255, 255, 0.15)",
  borderRadius: vars.radius.panel,
  boxShadow:
    "0 12px 32px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.05)",
  padding: "10px 14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "14px",
  "@media": {
    "(max-width: 540px)": {
      flexDirection: "column",
      alignItems: "stretch",
      gap: "10px",
      bottom: "12px",
      left: "12px",
      right: "12px",
      padding: "12px",
    },
  },
});

export const dockInfo = style({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  minWidth: 0,
});

export const dockTag = style({
  fontFamily: vars.font.mono,
  fontSize: "10px",
  fontWeight: 600,
  color: vars.text.muted,
  letterSpacing: "0.06em",
  fontVariantNumeric: "tabular-nums",
});

export const dockTitle = style({
  fontSize: "13px",
  fontWeight: 600,
  color: vars.text.primary,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const dockCtaButton = recipe({
  base: {
    minHeight: "46px",
    padding: "0 22px",
    border: 0,
    borderRadius: vars.radius.control,
    backgroundColor: vars.color.ctaBg,
    color: vars.color.ctaFg,
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    whiteSpace: "nowrap",
    flexShrink: 0,
    boxShadow: "0 4px 14px rgba(250, 250, 250, 0.18)",
    transition: "background-color 0.15s ease, transform 0.1s ease",
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
    "@media": {
      "(max-width: 540px)": {
        width: "100%",
        justifyContent: "space-between",
      },
    },
  },
});

export const buttonCode = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  opacity: 0.85,
});

export const summaryCard = style({
  backgroundColor: vars.surface.mid,
  border: `1px solid ${vars.border.subtle}`,
  borderRadius: vars.radius.panel,
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
});

export const summaryHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  paddingBottom: "8px",
  borderBottom: `1px solid ${vars.border.subtle}`,
});

export const summaryTitle = style({
  margin: 0,
  fontSize: "14px",
  fontWeight: 600,
  color: vars.text.primary,
});

export const operatorBanner = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 14px",
  borderRadius: vars.radius.control,
  backgroundColor: vars.surface.low,
  border: `1px solid ${vars.border.subtle}`,
});

export const operatorName = style({
  fontSize: "15px",
  fontWeight: 700,
  color: vars.text.primary,
});

export const operatorStatus = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  color: vars.text.secondary,
});

export const warningBox = style({
  padding: "10px 12px",
  borderRadius: vars.radius.control,
  backgroundColor: vars.color.negativeBg,
  border: `1px solid ${vars.border.negative}`,
  color: vars.color.negative,
  fontSize: "12px",
  lineHeight: 1.4,
});

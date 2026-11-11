import { style } from "@vanilla-extract/css";

import { vars } from "@/styles/theme.css";

export const container = style({
  display: "flex",
  flexDirection: "column",
  width: "100%",
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "20px 16px 148px",
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
  maxWidth: "360px",
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

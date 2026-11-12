import { style } from "@vanilla-extract/css";

import { cornerBrackets, vars } from "@/styles/theme.css";

export const accountBar = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  padding: "8px 16px",
  color: vars.text.secondary,
  fontSize: "12px",
  backgroundColor: vars.surface.low,
  borderBottom: `1px solid ${vars.border.subtle}`,
  fontVariantNumeric: "tabular-nums",
});

export const accountSwitchButton = style({
  color: vars.color.positive,
  background: "transparent",
  border: 0,
  fontSize: "12px",
  fontWeight: 500,
  cursor: "pointer",
  selectors: {
    "&:disabled": {
      opacity: 0.4,
      cursor: "default",
    },
  },
});

export const accountIdentity = style({
  display: "flex",
  alignItems: "center",
  gap: "8px",
});

export const statusDot = style({
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  backgroundColor: vars.color.positive,
});

export const monoCode = style({
  fontFamily: vars.font.mono,
  fontVariantNumeric: "tabular-nums",
  color: vars.text.primary,
});

export const accountPanel = style({
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  width: "min(100%, 480px)",
  padding: "40px 20px",
  margin: "auto",
  color: vars.text.primary,
});

export const panelTitle = style({
  margin: "4px 0 6px",
  fontSize: "22px",
  fontWeight: 700,
  letterSpacing: "-0.02em",
});

export const panelText = style({
  fontSize: "13px",
  color: vars.text.secondary,
  lineHeight: 1.5,
});

export const headerBlock = style({
  paddingBottom: "12px",
  borderBottom: `1px solid ${vars.border.subtle}`,
});

export const telemetryLabel = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  color: vars.text.muted,
  letterSpacing: "0.05em",
});

export const userList = style({
  display: "flex",
  flexDirection: "column",
  gap: "8px",
});

export const userButton = style([
  cornerBrackets({ tone: "positive" }),
  {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    padding: "14px 16px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: vars.radius.control,
    backgroundColor: vars.surface.mid,
    color: vars.text.primary,
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background-color 0.15s ease, border-color 0.15s ease",
    selectors: {
      "&:hover": {
        backgroundColor: vars.surface.high,
        borderColor: vars.border.positive,
      },
    },
  },
]);

export const errorText = style({
  padding: "12px",
  borderRadius: vars.radius.control,
  border: "1px solid rgba(255, 255, 255, 0.12)",
  backgroundColor: vars.color.negativeBg,
  color: vars.color.negative,
  fontSize: "12px",
  lineHeight: 1.5,
});

export const retryButton = style({
  padding: "12px 16px",
  borderRadius: vars.radius.control,
  backgroundColor: vars.color.ctaBg,
  color: vars.color.ctaFg,
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
});

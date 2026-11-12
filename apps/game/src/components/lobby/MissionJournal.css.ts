import { globalStyle, style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

import { vars } from "@/styles/theme.css";

export const journal = style({
  width: "100%",
  padding: "20px 16px 96px",
  color: vars.text.primary,
  display: "flex",
  flexDirection: "column",
  gap: "16px",
});

globalStyle(`${journal} h1`, {
  fontSize: "22px",
  fontWeight: 700,
  letterSpacing: "-0.02em",
  margin: "4px 0 6px",
});

globalStyle(`${journal} h2`, {
  fontSize: "16px",
  fontWeight: 700,
  margin: 0,
  color: vars.text.primary,
});

globalStyle(`${journal} h3`, {
  fontSize: "14px",
  fontWeight: 600,
  margin: "0 0 6px",
  color: vars.text.primary,
});

globalStyle(`${journal} p`, {
  lineHeight: 1.65,
  fontSize: "13px",
  color: vars.text.secondary,
});

export const pageHeader = style({
  paddingBottom: "14px",
  borderBottom: `1px solid ${vars.border.subtle}`,
});

export const telemetryTop = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  fontFamily: vars.font.mono,
  fontSize: "11px",
  color: vars.text.muted,
  marginBottom: "4px",
});

export const alert = style({
  padding: "10px 12px",
  borderRadius: "6px",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  background: "rgba(255, 113, 98, 0.12)",
  color: `${vars.color.negative} !important`,
});

export const panel = style({
  padding: "16px",
  background: vars.surface.mid,
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: "10px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
});

export const missionSection = style([
  panel,
  {
    borderRadius: "8px",
  },
]);

export const sectionTopRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  paddingBottom: "10px",
  borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
});

export const statusBadge = recipe({
  base: {
    fontFamily: vars.font.mono,
    fontSize: "11px",
    fontWeight: 600,
    padding: "3px 8px",
    borderRadius: "4px",
  },
  variants: {
    tone: {
      positive: {
        color: vars.color.positive,
        background: vars.color.positiveBg,
        border: "1px solid rgba(255, 255, 255, 0.12)",
      },
      negative: {
        color: vars.color.negative,
        background: vars.color.negativeBg,
        border: "1px solid rgba(255, 255, 255, 0.12)",
      },
      neutral: {
        color: vars.text.secondary,
        background: "rgba(255, 255, 255, 0.06)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
      },
    },
  },
});

export const codeTag = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  color: vars.text.muted,
  fontVariantNumeric: "tabular-nums",
});

export const metaGrid = style({
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "1px",
  background: vars.border.grid,
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: "6px",
  overflow: "hidden",
});

export const metaCell = style({
  background: vars.surface.low,
  padding: "10px 12px",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
});

globalStyle(`${metaCell} span`, {
  fontFamily: vars.font.mono,
  fontSize: "11px",
  color: vars.text.muted,
});

globalStyle(`${metaCell} strong`, {
  fontSize: "12px",
  fontWeight: 600,
  color: vars.text.primary,
  fontVariantNumeric: "tabular-nums",
});

export const noticeText = recipe({
  base: {
    padding: "10px 12px",
    borderRadius: "6px",
    fontSize: "12px !important",
  },
  variants: {
    tone: {
      positive: {
        color: `${vars.color.positive} !important`,
        background: "rgba(133, 173, 255, 0.1)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
      },
      negative: {
        color: `${vars.color.negative} !important`,
        background: "rgba(255, 113, 98, 0.12)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
      },
    },
  },
});

export const actionButton = style({
  width: "100%",
  padding: "12px 14px",
  borderRadius: "6px",
  border: 0,
  background: vars.color.ctaBg,
  color: vars.color.ctaFg,
  fontSize: "13px",
  fontWeight: 600,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  cursor: "pointer",
  transition: "background-color 0.15s ease",
  selectors: {
    "&:hover:not(:disabled)": {
      background: vars.color.ctaHover,
    },
  },
  ":disabled": {
    opacity: 0.4,
    cursor: "default",
  },
});

export const buttonCode = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
});

export const navLinks = style({
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  paddingTop: "8px",
  borderTop: "1px solid rgba(255, 255, 255, 0.06)",
});

globalStyle(`${navLinks} a`, {
  color: vars.color.positive,
  fontSize: "12px",
  fontWeight: 500,
});

export const contactRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  fontSize: "13px",
  color: "#d4d4d8",
});

export const article = style({
  padding: "12px",
  borderRadius: "6px",
  background: vars.surface.low,
  border: "1px solid rgba(255, 255, 255, 0.06)",
});

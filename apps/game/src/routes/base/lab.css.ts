import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

import { cornerBrackets, vars } from "@/styles/theme.css";

export const topBar = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  padding: "12px 14px",
  backgroundColor: vars.surface.mid,
  border: `1px solid ${vars.border.subtle}`,
  borderRadius: vars.radius.panel,
  marginBottom: "16px",
});

export const npcMeta = style({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
});

export const npcName = style({
  margin: 0,
  fontSize: "14px",
  fontWeight: 700,
  color: vars.text.primary,
});

export const npcSubtitle = style({
  margin: 0,
  fontSize: "12px",
  color: vars.text.secondary,
});

export const resourceRow = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "8px",
});

export const resourceChip = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "5px 10px",
  borderRadius: vars.radius.control,
  border: `1px solid ${vars.border.subtle}`,
  backgroundColor: vars.surface.low,
  fontFamily: vars.font.mono,
  fontSize: "12px",
  fontWeight: 600,
  fontVariantNumeric: "tabular-nums",
  color: vars.text.primary,
});

export const resourceMuted = style({
  color: vars.text.muted,
  fontWeight: 500,
});

export const workspace = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.35fr) minmax(280px, 1fr)",
  gap: "16px",
  alignItems: "start",
  "@media": {
    "(max-width: 820px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
});

export const panel = style({
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  padding: "14px",
  backgroundColor: vars.surface.mid,
  border: `1px solid ${vars.border.subtle}`,
  borderRadius: vars.radius.panel,
});

export const panelHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
});

export const panelTitle = style({
  margin: 0,
  fontSize: "14px",
  fontWeight: 600,
  color: vars.text.primary,
});

export const capCounters = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  fontWeight: 600,
  fontVariantNumeric: "tabular-nums",
  color: vars.text.secondary,
});

export const slotGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "8px",
  "@media": {
    "(max-width: 560px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
});

export const slotCard = recipe({
  base: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: "10px 11px",
    borderRadius: vars.radius.control,
    backgroundColor: vars.surface.low,
    border: `1px solid ${vars.border.subtle}`,
    color: vars.text.primary,
    textAlign: "left",
    cursor: "pointer",
    transition: "background-color 0.14s ease, border-color 0.14s ease",
    selectors: {
      "&:hover:not(:disabled)": {
        backgroundColor: vars.surface.high,
        borderColor: "rgba(250, 250, 250, 0.4)",
      },
      "&:focus-visible": {
        outline: `2px solid ${vars.text.primary}`,
        outlineOffset: "2px",
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
          backgroundColor: vars.surface.high,
          borderColor: vars.text.primary,
        },
      ],
      false: {},
    },
  },
  defaultVariants: {
    selected: false,
  },
});

export const slotHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "6px",
});

export const slotIndex = style({
  fontFamily: vars.font.mono,
  fontSize: "10px",
  fontWeight: 600,
  fontVariantNumeric: "tabular-nums",
  color: vars.text.muted,
});

export const badgeRow = style({
  display: "flex",
  alignItems: "center",
  gap: "4px",
});

export const gradeBadge = recipe({
  base: {
    display: "inline-flex",
    alignItems: "center",
    padding: "1px 5px",
    borderRadius: "3px",
    fontFamily: vars.font.mono,
    fontSize: "10px",
    fontWeight: 700,
  },
  variants: {
    grade: {
      COMMON: {
        border: `1px solid ${vars.border.subtle}`,
        color: vars.text.secondary,
        backgroundColor: "rgba(255, 255, 255, 0.04)",
      },
      RARE: {
        border: "1px solid rgba(250, 250, 250, 0.35)",
        color: vars.text.primary,
        backgroundColor: "rgba(255, 255, 255, 0.08)",
      },
      EPIC: {
        border: `1px solid ${vars.color.positive}`,
        color: vars.color.positive,
        backgroundColor: vars.color.positiveBg,
      },
    },
  },
});

export const uniqueBadge = style({
  display: "inline-flex",
  alignItems: "center",
  padding: "1px 5px",
  borderRadius: "3px",
  border: "1px solid rgba(250, 250, 250, 0.25)",
  backgroundColor: "rgba(255, 255, 255, 0.06)",
  color: vars.text.primary,
  fontFamily: vars.font.mono,
  fontSize: "10px",
  fontWeight: 600,
});

export const geneName = style({
  fontSize: "13px",
  fontWeight: 600,
  color: vars.text.primary,
});

export const geneSummary = style({
  margin: 0,
  fontSize: "11px",
  lineHeight: 1.4,
  color: vars.text.secondary,
});

export const inspectorBox = style({
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  padding: "12px",
  borderRadius: vars.radius.control,
  border: `1px solid ${vars.border.subtle}`,
  backgroundColor: vars.surface.low,
});

export const fieldLabel = style({
  fontSize: "11px",
  fontWeight: 600,
  color: vars.text.secondary,
  marginBottom: "4px",
  display: "block",
});

export const ampouleSelect = style({
  width: "100%",
  padding: "8px 10px",
  borderRadius: vars.radius.control,
  border: `1px solid ${vars.border.subtle}`,
  backgroundColor: vars.surface.base,
  color: vars.text.primary,
  fontFamily: vars.font.sans,
  fontSize: "12px",
  selectors: {
    "&:focus-visible": {
      outline: `2px solid ${vars.text.primary}`,
      outlineOffset: "1px",
    },
  },
});

export const costRow = style({
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  fontFamily: vars.font.mono,
  fontSize: "12px",
  fontVariantNumeric: "tabular-nums",
  color: vars.text.secondary,
});

export const primaryCta = style({
  width: "100%",
  padding: "11px 14px",
  borderRadius: vars.radius.control,
  border: 0,
  backgroundColor: vars.color.ctaBg,
  color: vars.color.ctaFg,
  fontSize: "13px",
  fontWeight: 700,
  cursor: "pointer",
  transition: "background-color 0.14s ease",
  selectors: {
    "&:hover:not(:disabled)": {
      backgroundColor: vars.color.ctaHover,
    },
    "&:focus-visible": {
      outline: `2px solid ${vars.text.primary}`,
      outlineOffset: "2px",
    },
    "&:disabled": {
      opacity: 0.4,
      cursor: "default",
    },
  },
});

export const secondaryBtn = style({
  width: "100%",
  padding: "9px 12px",
  borderRadius: vars.radius.control,
  border: `1px solid ${vars.border.subtle}`,
  backgroundColor: vars.surface.high,
  color: vars.text.primary,
  fontSize: "12px",
  fontWeight: 600,
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
});

export const candidateList = style({
  display: "flex",
  flexDirection: "column",
  gap: "8px",
});

export const candidateCard = style({
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  padding: "11px 12px",
  borderRadius: vars.radius.control,
  border: "1px solid rgba(250, 250, 250, 0.24)",
  backgroundColor: vars.surface.high,
});

export const statsSummary = style({
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  fontFamily: vars.font.mono,
  fontSize: "11px",
  fontVariantNumeric: "tabular-nums",
  color: vars.text.secondary,
});

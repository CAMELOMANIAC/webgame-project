import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

import { cornerBrackets, vars } from "@/styles/theme.css";

export const collection = style({
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  marginBottom: "20px",
  padding: "14px",
  backgroundColor: vars.surface.mid,
  border: `1px solid ${vars.border.subtle}`,
  borderRadius: vars.radius.panel,
});

export const collectionHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
});

export const title = style({
  margin: 0,
  fontSize: "14px",
  fontWeight: 600,
  color: vars.text.primary,
  fontVariantNumeric: "tabular-nums",
});

export const rosterCode = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  color: vars.text.muted,
  fontVariantNumeric: "tabular-nums",
});

export const description = style({
  margin: 0,
  color: vars.text.secondary,
  fontSize: "12px",
  lineHeight: 1.5,
});

export const alert = style({
  margin: 0,
  padding: "8px 10px",
  borderRadius: vars.radius.control,
  border: `1px solid ${vars.border.negative}`,
  backgroundColor: vars.color.negativeBg,
  color: vars.color.negative,
  fontSize: "12px",
});

export const list = style({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
  gap: "8px",
});

export const characterButton = recipe({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    padding: "12px",
    borderRadius: vars.radius.control,
    color: vars.text.primary,
    cursor: "pointer",
    textAlign: "left",
    transition: "background-color 0.15s ease, border-color 0.15s ease",
    selectors: {
      "&:hover:not(:disabled)": {
        backgroundColor: vars.surface.high,
        borderColor: vars.border.strong,
      },
    },
  },
  variants: {
    state: {
      raiding: [
        cornerBrackets({ tone: "negative" }),
        {
          border: `1px solid ${vars.border.negative}`,
          backgroundColor: vars.surface.selected,
          selectors: {
            "&:disabled": {
              cursor: "default",
              opacity: 1,
            },
          },
        },
      ],
      selected: [
        cornerBrackets({ tone: "positive" }),
        {
          border: `1px solid ${vars.border.positive}`,
          backgroundColor: vars.surface.selected,
          selectors: {
            "&:disabled": {
              cursor: "default",
              opacity: 1,
            },
          },
        },
      ],
      idle: [
        cornerBrackets({ tone: "none" }),
        {
          border: `1px solid ${vars.border.subtle}`,
          backgroundColor: vars.surface.low,
          selectors: {
            "&:disabled": {
              cursor: "default",
              opacity: 0.6,
            },
          },
        },
      ],
    },
  },
  defaultVariants: {
    state: "idle",
  },
});

export const cardTopRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "6px",
  width: "100%",
});

export const cardName = style({
  fontSize: "13px",
  fontWeight: 600,
  color: vars.text.primary,
});

export const stateTag = recipe({
  base: {
    fontFamily: vars.font.mono,
    fontSize: "11px",
    fontWeight: 600,
    padding: "2px 6px",
    borderRadius: vars.radius.badge,
  },
  variants: {
    state: {
      raiding: {
        color: vars.color.negative,
        backgroundColor: vars.color.negativeBg,
      },
      selected: {
        color: vars.color.positive,
        backgroundColor: vars.color.positiveBg,
      },
      idle: {
        color: vars.text.muted,
        backgroundColor: "rgba(255, 255, 255, 0.04)",
      },
    },
  },
  defaultVariants: {
    state: "idle",
  },
});

export const metaRow = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  color: vars.text.muted,
  fontVariantNumeric: "tabular-nums",
});

export const statRow = style({
  fontFamily: vars.font.mono,
  fontSize: "12px",
  fontWeight: 500,
  color: "#d4d4d8",
  fontVariantNumeric: "tabular-nums",
  paddingTop: "6px",
  borderTop: "1px solid rgba(255, 255, 255, 0.05)",
});

export const details = style({
  marginTop: "4px",
  paddingTop: "10px",
  borderTop: "1px solid rgba(255, 255, 255, 0.06)",
});

export const summary = style({
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 500,
  color: vars.color.positive,
  marginBottom: "6px",
});

export const variantActions = style({
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
  marginTop: "8px",
});

export const variantButton = style({
  padding: "8px 12px",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: vars.radius.control,
  backgroundColor: vars.surface.high,
  color: vars.text.primary,
  fontSize: "12px",
  fontWeight: 500,
  cursor: "pointer",
  selectors: {
    "&:disabled": {
      opacity: 0.45,
      cursor: "default",
    },
  },
});

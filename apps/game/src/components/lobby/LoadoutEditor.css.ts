import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

import { cornerBrackets, vars } from "@/styles/theme.css";

export const equipmentRow = style({
  display: "flex",
  alignItems: "stretch",
  gap: "12px",
  paddingTop: "4px",
  "@media": {
    "(max-width: 359px)": {
      flexDirection: "column",
    },
  },
});

export const equipmentActions = style({
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  gap: "8px",
});

export const equipmentActionButton = style({
  flex: 1,
  minHeight: "44px",
  padding: "8px 12px",
  borderRadius: vars.radius.control,
  border: `1px solid ${vars.border.strong}`,
  backgroundColor: vars.surface.low,
  color: vars.text.primary,
  fontSize: "12px",
  fontWeight: 600,
  lineHeight: 1.25,
  textAlign: "center",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  cursor: "pointer",
  transition: "background-color 0.15s ease, border-color 0.15s ease",
  selectors: {
    "&:hover:not(:disabled)": {
      backgroundColor: vars.surface.high,
      borderColor: vars.text.primary,
    },
    "&:focus-visible": {
      outline: "2px solid rgba(250, 250, 250, 0.72)",
      outlineOffset: "2px",
    },
    "&:disabled": {
      opacity: 0.4,
      cursor: "default",
      borderColor: vars.border.subtle,
    },
  },
});

export const equipmentStrip = style({
  padding: "4px 0 0",
  flexWrap: "wrap",
  justifyContent: "flex-start",
  gap: "8px",
  "@media": {
    "(max-width: 440px)": {
      gap: "6px",
    },
  },
});

export const panelDropZone = recipe({
  base: {
    background: vars.surface.mid,
    border: `1px solid ${vars.border.subtle}`,
    borderRadius: "10px",
    padding: "16px",
    transition: "border-color 0.15s ease, background-color 0.15s ease",
  },
  variants: {
    over: {
      true: {
        borderColor: vars.text.primary,
        backgroundColor: vars.surface.high,
      },
      false: {},
    },
    ready: {
      true: {
        borderColor: vars.border.strong,
      },
      false: {},
    },
  },
  defaultVariants: {
    over: false,
    ready: false,
  },
});

export const slotGrid = style([equipmentStrip, { display: "flex" }]);

export const emptyDropArea = recipe({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "84px",
    padding: "16px",
    borderRadius: vars.radius.control,
    border: "1px dashed rgba(255, 255, 255, 0.14)",
    backgroundColor: vars.surface.low,
    color: vars.text.muted,
    fontSize: "12px",
    textAlign: "center",
    lineHeight: 1.5,
    transition: "border-color 0.15s ease, background-color 0.15s ease",
  },
  variants: {
    over: {
      true: {
        borderColor: vars.text.primary,
        backgroundColor: vars.surface.high,
        color: vars.text.primary,
      },
      false: {},
    },
  },
  defaultVariants: {
    over: false,
  },
});

export const slotOverlay = style([
  cornerBrackets({ tone: "default" }),
  {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    width: "72px",
    aspectRatio: "1 / 1",
    padding: "8px",
    border: `1px solid ${vars.border.strong}`,
    borderRadius: vars.radius.control,
    color: vars.text.primary,
    fontSize: "12px",
    fontWeight: 600,
    touchAction: "none",
    cursor: "grabbing",
    backgroundColor: "rgba(16, 16, 20, 0.94)",
    backdropFilter: "blur(8px)",
    boxShadow: "0 12px 24px rgba(0, 0, 0, 0.45)",
    pointerEvents: "none",
    zIndex: 1000,
  },
]);

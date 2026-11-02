import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

import { vars } from "@/styles/theme.css";

export const canvasContainer = style({
  width: "100%",
  height: "100%",
  position: "relative",
  backgroundColor: vars.surface.base,
  backgroundImage: `
    linear-gradient(to right, rgba(255, 255, 255, 0.025) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.025) 1px, transparent 1px)
  `,
  backgroundSize: "24px 24px",
  overflow: "hidden",
});

export const infoPanel = style({
  position: "absolute",
  top: "24px",
  left: "24px",
  zIndex: 10,
  width: "250px",
  padding: "14px",
  background: vars.surface.hud,
  backdropFilter: "blur(12px)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: "6px",
  fontFamily: vars.font.sans,
  color: vars.text.primary,
  pointerEvents: "auto",
});

export const metricRow = style({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "6px",
  fontSize: "11px",
});

export const metricLabel = style({
  color: vars.text.muted,
});

export const metricValue = style({
  fontWeight: 600,
  color: vars.text.primary,
  fontFamily: vars.font.mono,
  fontVariantNumeric: "tabular-nums",
});

export const expandableHeader = style({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: "10px",
  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
  paddingTop: "10px",
  cursor: "pointer",
  userSelect: "none",
});

export const sectionLabel = style({
  color: vars.text.primary,
  fontWeight: 600,
  fontSize: "11px",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
});

export const expandIcon = recipe({
  base: {
    fontSize: "10px",
    color: vars.color.positive,
    transition: "transform 0.2s ease",
  },
  variants: {
    expanded: {
      true: {
        transform: "rotate(180deg)",
      },
      false: {
        transform: "rotate(0deg)",
      },
    },
  },
});

export const expandableContent = recipe({
  base: {
    overflow: "hidden",
    transition: "max-height 0.25s ease-out",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  variants: {
    expanded: {
      true: {
        maxHeight: "200px",
        marginTop: "10px",
      },
      false: {
        maxHeight: "0px",
        marginTop: "0px",
      },
    },
  },
});

export const toggleButton = recipe({
  base: {
    padding: "4px 10px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s ease",
    fontFamily: vars.font.mono,
  },
  variants: {
    active: {
      true: {
        background: "rgba(133, 173, 255, 0.14)",
        border: `1px solid ${vars.border.positive}`,
        color: vars.color.positive,
        ":hover": {
          background: "rgba(133, 173, 255, 0.2)",
        },
      },
      false: {
        background: "rgba(255, 255, 255, 0.04)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        color: vars.text.secondary,
        ":hover": {
          background: "rgba(255, 255, 255, 0.08)",
        },
      },
    },
  },
});

export const hoverDetail = style({
  marginTop: "10px",
  paddingTop: "8px",
  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
});

export const controlHint = style({
  marginTop: "10px",
  fontSize: "11px",
  color: vars.color.positive,
  textAlign: "center",
});

export const navigationPanel = style({
  position: "absolute",
  bottom: "24px",
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 10,
  width: "calc(100% - 32px)",
  maxWidth: "500px",
  padding: "12px 16px",
  background: "rgba(16, 16, 19, 0.92)",
  backdropFilter: "blur(12px)",
  border: "1px solid rgba(255, 255, 255, 0.14)",
  borderRadius: "6px",
  fontFamily: vars.font.sans,
  color: vars.text.primary,
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  pointerEvents: "auto",
  "@media": {
    "(min-width: 600px)": {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "16px",
    },
  },
});

export const navInfoArea = style({
  display: "flex",
  flexDirection: "column",
  flex: 1,
});

export const navButtonArea = style({
  display: "flex",
  gap: "8px",
  width: "100%",
  "@media": {
    "(min-width: 600px)": {
      width: "auto",
      minWidth: "220px",
    },
  },
});

export const navButton = recipe({
  base: {
    flex: 1,
    padding: "8px 12px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background-color 0.15s ease",
    fontFamily: vars.font.mono,
    textTransform: "uppercase",
    fontVariantNumeric: "tabular-nums",
    ":disabled": {
      opacity: 0.4,
      cursor: "not-allowed",
    },
  },
  variants: {
    primary: {
      true: {
        background: vars.color.ctaBg,
        border: "1px solid transparent",
        color: vars.color.ctaFg,
        selectors: {
          "&:hover:not(:disabled)": {
            background: vars.color.ctaHover,
          },
        },
      },
      false: {
        background: "rgba(255, 255, 255, 0.06)",
        border: "1px solid rgba(255, 255, 255, 0.14)",
        color: vars.text.secondary,
        selectors: {
          "&:hover:not(:disabled)": {
            background: "rgba(255, 255, 255, 0.12)",
            color: vars.text.primary,
          },
        },
      },
    },
  },
  defaultVariants: {
    primary: false,
  },
});

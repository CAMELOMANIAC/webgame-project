import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

import { cornerBrackets, vars } from "@/styles/theme.css";

export const cardContainer = recipe({
  base: {
    backgroundColor: vars.surface.mid,
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: vars.radius.card,
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    position: "relative",
  },
  variants: {
    raiding: {
      true: cornerBrackets({ tone: "negative" }),
      false: cornerBrackets({ tone: "positive" }),
    },
  },
  defaultVariants: {
    raiding: false,
  },
});

export const headerRow = style({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",
  paddingBottom: "12px",
  borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
});

export const telemetryCode = style({
  display: "block",
  fontFamily: vars.font.mono,
  fontSize: "11px",
  color: vars.text.muted,
  fontVariantNumeric: "tabular-nums",
  marginBottom: "2px",
});

export const nickname = style({
  fontSize: "18px",
  fontWeight: 700,
  color: vars.text.primary,
  margin: 0,
  letterSpacing: "-0.02em",
});

export const statusBadge = recipe({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    fontFamily: vars.font.mono,
    fontSize: "11px",
    fontWeight: 600,
    padding: "4px 8px",
    borderRadius: vars.radius.badge,
  },
  variants: {
    raiding: {
      true: {
        backgroundColor: vars.color.negativeBg,
        color: vars.color.negative,
        border: `1px solid ${vars.border.negative}`,
      },
      false: {
        backgroundColor: vars.color.positiveBg,
        color: vars.color.positive,
        border: `1px solid ${vars.border.positive}`,
      },
    },
  },
  defaultVariants: {
    raiding: false,
  },
});

export const statusDot = recipe({
  base: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
  },
  variants: {
    raiding: {
      true: {
        backgroundColor: vars.color.negative,
      },
      false: {
        backgroundColor: vars.color.positive,
      },
    },
  },
  defaultVariants: {
    raiding: false,
  },
});

export const telemetryGrid = style({
  width: "100%",
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "1px",
  backgroundColor: vars.border.grid,
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: vars.radius.control,
  overflow: "hidden",
});

export const gridCell = style({
  backgroundColor: vars.surface.low,
  padding: "10px",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
});

export const cellHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "4px",
});

export const statLabel = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  fontWeight: 500,
  color: vars.text.muted,
  margin: 0,
});

export const metricDot = recipe({
  base: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
  },
  variants: {
    tone: {
      positive: { backgroundColor: vars.color.positive },
      negative: { backgroundColor: vars.color.negative },
      neutral: { backgroundColor: vars.text.muted },
    },
  },
  defaultVariants: {
    tone: "neutral",
  },
});

export const statValue = recipe({
  base: {
    fontFamily: vars.font.mono,
    fontSize: "13px",
    fontWeight: 600,
    fontVariantNumeric: "tabular-nums",
    margin: 0,
  },
  variants: {
    critical: {
      true: { color: vars.color.negative },
      false: { color: vars.text.primary },
    },
  },
  defaultVariants: {
    critical: false,
  },
});

export const actionButton = recipe({
  base: {
    width: "100%",
    height: "44px",
    padding: "0 14px",
    borderRadius: vars.radius.control,
    fontSize: "13px",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
    selectors: {
      "&:disabled": {
        opacity: 0.4,
        cursor: "default",
      },
    },
  },
  variants: {
    raiding: {
      true: {
        color: vars.text.primary,
        border: "1px solid rgba(255, 113, 98, 0.45)",
        backgroundColor: "rgba(255, 113, 98, 0.18)",
        selectors: {
          "&:hover:not(:disabled)": {
            backgroundColor: "rgba(255, 113, 98, 0.26)",
          },
        },
      },
      false: {
        color: vars.color.ctaFg,
        border: "1px solid transparent",
        backgroundColor: vars.color.ctaBg,
        selectors: {
          "&:hover:not(:disabled)": {
            backgroundColor: vars.color.ctaHover,
          },
        },
      },
    },
  },
  defaultVariants: {
    raiding: false,
  },
});

export const buttonCode = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  fontWeight: 600,
  fontVariantNumeric: "tabular-nums",
  opacity: 0.85,
});

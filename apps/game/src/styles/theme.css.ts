import { createGlobalTheme, style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

export const vars = createGlobalTheme(":root", {
  font: {
    sans: '"Pretendard Variable", "Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    mono: '"JetBrains Mono", "SFMono-Regular", Consolas, ui-monospace, monospace',
  },
  surface: {
    base: "#09090b",
    low: "#0c0c0f",
    mid: "#101013",
    high: "#141418",
    selected: "#13151c",
    hud: "rgba(16, 16, 19, 0.9)",
  },
  border: {
    subtle: "rgba(255, 255, 255, 0.07)",
    grid: "#27272a",
    strong: "rgba(255, 255, 255, 0.16)",
    positive: "rgba(133, 173, 255, 0.35)",
    negative: "rgba(255, 113, 98, 0.35)",
  },
  text: {
    primary: "#fafafa",
    secondary: "#a1a1aa",
    muted: "#71717a",
    disabled: "#52525b",
  },
  color: {
    positive: "#85adff",
    positiveBg: "rgba(133, 173, 255, 0.12)",
    negative: "#ff7162",
    negativeBg: "rgba(255, 113, 98, 0.14)",
    ctaBg: "#fafafa",
    ctaHover: "#e4e4e7",
    ctaFg: "#09090b",
  },
  radius: {
    panel: "10px",
    card: "8px",
    control: "6px",
    badge: "4px",
  },
});

export type TacticalTone = "default" | "positive" | "negative" | "none";

export const cornerBrackets = recipe({
  base: {
    position: "relative",
    selectors: {
      "&::before, &::after": {
        content: '""',
        position: "absolute",
        width: "6px",
        height: "6px",
        pointerEvents: "none",
        zIndex: 2,
      },
      "&::before": {
        top: "-1px",
        left: "-1px",
      },
      "&::after": {
        right: "-1px",
        bottom: "-1px",
      },
    },
  },
  variants: {
    tone: {
      default: {
        selectors: {
          "&::before": {
            borderTop: `1.5px solid ${vars.text.primary}`,
            borderLeft: `1.5px solid ${vars.text.primary}`,
          },
          "&::after": {
            borderRight: `1.5px solid ${vars.text.primary}`,
            borderBottom: `1.5px solid ${vars.text.primary}`,
          },
        },
      },
      positive: {
        selectors: {
          "&::before": {
            borderTop: `1.5px solid ${vars.color.positive}`,
            borderLeft: `1.5px solid ${vars.color.positive}`,
          },
          "&::after": {
            borderRight: `1.5px solid ${vars.color.positive}`,
            borderBottom: `1.5px solid ${vars.color.positive}`,
          },
        },
      },
      negative: {
        selectors: {
          "&::before": {
            borderTop: `1.5px solid ${vars.color.negative}`,
            borderLeft: `1.5px solid ${vars.color.negative}`,
          },
          "&::after": {
            borderRight: `1.5px solid ${vars.color.negative}`,
            borderBottom: `1.5px solid ${vars.color.negative}`,
          },
        },
      },
      none: {
        selectors: {
          "&::before, &::after": {
            display: "none",
          },
        },
      },
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

export const page = style({
  display: "flex",
  flexDirection: "column",
  flexGrow: 1,
  alignItems: "flex-start",
  justifyContent: "flex-start",
  position: "relative",
  width: "100%",
  height: "100%",
  backgroundColor: vars.surface.base,
});

export const inheritMotionDiv = style({
  width: "100%",
});

export const fieldWidget = recipe({
  base: {
    display: "flex",
    position: "relative",
    width: "100%",
    height: "100%",
    backgroundColor: vars.surface.hud,
    boxSizing: "border-box",
    flexDirection: "column",
    justifyContent: "center",
    padding: "14px 16px",
    backdropFilter: "blur(12px)",
    borderRadius: vars.radius.control,
    color: vars.text.primary,
  },
  variants: {
    tone: {
      default: [
        cornerBrackets({ tone: "default" }),
        {
          border: "1px solid rgba(255, 255, 255, 0.12)",
        },
      ],
      positive: [
        cornerBrackets({ tone: "positive" }),
        {
          border: `1px solid ${vars.border.positive}`,
        },
      ],
      negative: [
        cornerBrackets({ tone: "negative" }),
        {
          border: `1px solid ${vars.border.negative}`,
        },
      ],
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

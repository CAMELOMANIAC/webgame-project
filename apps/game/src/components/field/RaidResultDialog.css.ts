import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

import { vars } from "@/styles/theme.css";

export const dialog = style({
  position: "fixed",
  inset: 0,
  margin: "auto",
  width: "min(400px, calc(100% - 32px))",
  boxSizing: "border-box",
  padding: "24px",
  border: `1px solid ${vars.border.strong}`,
  borderRadius: vars.radius.panel,
  background: vars.surface.mid,
  color: vars.text.primary,
  fontFamily: vars.font.sans,
  selectors: {
    "&::backdrop": {
      background: vars.surface.hud,
    },
  },
});

export const eyebrow = style({
  margin: 0,
  color: vars.text.secondary,
  fontFamily: vars.font.mono,
  fontSize: "11px",
  letterSpacing: "0.08em",
});

export const title = recipe({
  base: {
    margin: "8px 0",
    fontSize: "24px",
    lineHeight: 1.2,
  },
  variants: {
    tone: {
      positive: { color: vars.color.positive },
      negative: { color: vars.color.negative },
    },
  },
});

export const description = style({
  margin: "0 0 20px",
  color: vars.text.secondary,
  fontSize: "14px",
  lineHeight: 1.5,
});

export const returnButton = style({
  width: "100%",
  minHeight: "44px",
  padding: "10px 12px",
  border: 0,
  borderRadius: vars.radius.control,
  background: vars.color.ctaBg,
  color: vars.color.ctaFg,
  cursor: "pointer",
  fontWeight: 700,
  selectors: {
    "&:hover": { background: vars.color.ctaHover },
    "&:focus-visible": {
      outline: `2px solid ${vars.color.positive}`,
      outlineOffset: "3px",
    },
  },
});

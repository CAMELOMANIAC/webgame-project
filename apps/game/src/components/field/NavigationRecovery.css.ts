import { style } from "@vanilla-extract/css";

import { vars } from "@/styles/theme.css";

export const recovery = style({
  position: "absolute",
  inset: "20px 16px auto",
  zIndex: 1000,
  padding: "16px",
  borderRadius: vars.radius.card,
  backgroundColor: vars.surface.mid,
  border: "1px solid rgba(255, 255, 255, 0.12)",
  color: vars.text.primary,
});

export const title = style({
  fontSize: "14px",
  fontWeight: 700,
  color: vars.text.primary,
});

export const description = style({
  fontSize: "12px",
  color: vars.text.secondary,
  lineHeight: 1.5,
  margin: "8px 0 12px",
});

export const button = style({
  padding: "9px 14px",
  marginRight: "8px",
  border: 0,
  borderRadius: vars.radius.control,
  backgroundColor: vars.color.ctaBg,
  color: vars.color.ctaFg,
  fontSize: "12px",
  fontWeight: 600,
  cursor: "pointer",
  selectors: {
    "&:disabled": {
      opacity: 0.5,
      cursor: "default",
    },
  },
});

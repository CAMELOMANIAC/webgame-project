import { style } from "@vanilla-extract/css";

import { vars } from "@/styles/theme.css";

export const container = style({
  display: "flex",
  position: "absolute",
});

export const unit = style({
  width: "10px",
  height: "10px",
  backgroundColor: vars.color.negative,
  borderRadius: "50%",
});

export const nameLabel = style({
  position: "absolute",
  fontFamily: vars.font.mono,
  fontSize: "10px",
  borderRadius: vars.radius.badge,
  top: "16px",
  left: "50%",
  transform: "translateX(-50%)",
  fontWeight: 500,
  padding: "1px 4px",
  color: vars.color.negative,
  backgroundColor: vars.surface.base,
  border: "1px solid rgba(255, 255, 255, 0.12)",
  whiteSpace: "nowrap",
});

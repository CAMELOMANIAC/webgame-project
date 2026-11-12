import { style } from "@vanilla-extract/css";

export const topLayout = style({
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-start",
  flex: 1,
  width: "100%",
  height: "100%",
  minHeight: 0,
  gap: "12px",
  padding: "16px 16px 12px",
});

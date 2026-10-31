import { style } from "@vanilla-extract/css";

export const container = style({
  width: "100%",
  display: "flex",
  flexWrap: "nowrap",
  flexDirection: "row",
  justifyContent: "space-between",
  gap: "6px",
  padding: "10px 16px 16px",
});

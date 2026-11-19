import { style } from "@vanilla-extract/css";

export const container = style({
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  willChange: "transform",
});

export const mapLayer = style({
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  transformOrigin: "0 0",
  willChange: "transform",
});

import { style } from "@vanilla-extract/css";

import { fieldWidget, vars } from "@/styles/theme.css";

import portrait from "../../assets/portrait.png";

export const combatWidget = style([
  fieldWidget({ tone: "default" }),
  {
    gap: "10px",
    padding: "14px",
  },
]);

export const headerRow = style({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingBottom: "8px",
  borderBottom: `1px solid ${vars.border.subtle}`,
});

export const subTitle = style({
  fontSize: "13px",
  fontWeight: 700,
  color: vars.text.primary,
  margin: 0,
});

export const actionLogList = style({
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "flex",
  flexDirection: "row",
  gap: "6px",
  width: "100%",
  overflowX: "auto",
});

export const actionLogItem = style({
  display: "flex",
  flexDirection: "column",
  position: "relative",
  width: "96px",
  height: "44px",
  flex: "none",
  backgroundColor: vars.surface.low,
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderLeft: `2px solid ${vars.color.negative}`,
  borderRadius: vars.radius.badge,
  overflow: "hidden",
});

export const actionLogPortrait = style({
  width: "46px",
  height: "46px",
  backgroundImage: `url(${portrait})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  position: "relative",
  left: "-6px",
  flexShrink: 0,
  selectors: {
    "&::after": {
      content: '""',
      position: "absolute",
      inset: 0,
      background: `linear-gradient(to right, rgba(12, 12, 15, 0) 0%, ${vars.surface.low} 100%)`,
    },
  },
});

export const actionLogText = style({
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "flex-end",
  paddingRight: "8px",
  paddingLeft: "32px",
  gap: "2px",
  overflow: "hidden",
});

export const actionLogType = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  fontWeight: 600,
  color: vars.text.primary,
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const actionLogActor = style({
  fontSize: "11px",
  fontWeight: 500,
  color: vars.text.secondary,
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

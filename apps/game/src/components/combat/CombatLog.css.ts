import { style } from "@vanilla-extract/css";

import { fieldWidget, vars } from "@/styles/theme.css";

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

export const titleGroup = style({
  display: "flex",
  alignItems: "center",
  gap: "6px",
});

export const hostileDot = style({
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  backgroundColor: vars.color.negative,
});

export const subTitle = style({
  fontSize: "13px",
  fontWeight: 700,
  color: vars.text.primary,
  margin: 0,
});

export const statusBadge = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  fontWeight: 600,
  padding: "2px 6px",
  borderRadius: vars.radius.badge,
  backgroundColor: vars.color.negativeBg,
  border: "1px solid rgba(255, 255, 255, 0.12)",
  color: vars.color.negative,
});

export const encounter = style({
  color: vars.text.primary,
  fontSize: "12px",
  margin: 0,
});

export const encounterName = style({
  fontWeight: 600,
  color: vars.color.positive,
});

export const encounterMeta = style({
  display: "block",
  fontFamily: vars.font.mono,
  fontSize: "11px",
  color: vars.text.secondary,
  lineHeight: 1.45,
  marginTop: "3px",
  fontVariantNumeric: "tabular-nums",
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
  justifyContent: "center",
  alignItems: "flex-start",
  minWidth: "84px",
  padding: "6px 8px",
  gap: "2px",
  flex: "none",
  backgroundColor: vars.surface.low,
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderLeft: `2px solid ${vars.color.negative}`,
  borderRadius: vars.radius.badge,
});

export const actionLogType = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  fontWeight: 600,
  color: vars.text.primary,
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

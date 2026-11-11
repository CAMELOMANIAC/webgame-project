import { createContainer, keyframes, style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

import { vars } from "@/styles/theme.css";

const lobbyContainerName = createContainer();

export const lobbyContainer = style({
  display: "flex",
  flexDirection: "column",
  width: "100%",
  maxWidth: "1200px",
  minWidth: 0,
  containerType: "inline-size",
  containerName: lobbyContainerName,
  color: vars.text.primary,
  margin: "0 auto",
  padding: "20px 16px 92px",
});

export const headerArea = style({
  marginBottom: "20px",
  paddingBottom: "16px",
  borderBottom: `1px solid ${vars.border.subtle}`,
});

export const headerTop = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "4px",
});

export const subTitle = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  fontWeight: 500,
  color: vars.text.muted,
  letterSpacing: "0.05em",
  fontVariantNumeric: "tabular-nums",
});

export const mainTitle = style({
  fontSize: "22px",
  fontWeight: 700,
  color: vars.text.primary,
  letterSpacing: "-0.02em",
  margin: "0 0 6px",
});

export const leadText = style({
  fontSize: "12px",
  color: vars.text.secondary,
  lineHeight: 1.5,
  margin: "0 0 12px",
});

export const missionLink = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 12px",
  borderRadius: vars.radius.control,
  background: vars.surface.mid,
  border: `1px solid ${vars.border.subtle}`,
  color: vars.text.primary,
  fontSize: "12px",
  fontWeight: 600,
  transition: "background-color 0.15s ease, border-color 0.15s ease",
  ":hover": {
    background: vars.surface.high,
    borderColor: vars.border.strong,
  },
});

export const linkCode = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  color: vars.text.muted,
});

export const banner = recipe({
  base: {
    marginBottom: "16px",
    padding: "10px 12px",
    borderRadius: "6px",
    fontSize: "12px",
    lineHeight: 1.5,
  },
  variants: {
    tone: {
      positive: {
        color: vars.color.positive,
        background: "rgba(133, 173, 255, 0.1)",
        border: "1px solid rgba(133, 173, 255, 0.28)",
      },
      negative: {
        color: vars.color.negative,
        background: "rgba(255, 113, 98, 0.12)",
        border: "1px solid rgba(255, 113, 98, 0.3)",
      },
      neutral: {
        color: vars.text.secondary,
        background: vars.surface.mid,
        border: `1px solid ${vars.border.subtle}`,
      },
    },
  },
});

export const mainGrid = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: "16px",
  alignItems: "start",
  "@container": {
    [`${lobbyContainerName} (min-width: 760px)`]: {
      gridTemplateColumns: "minmax(0, 340px) minmax(0, 1fr)",
    },
  },
});

export const inventoryStashArea = style({
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  minWidth: 0,
});

export const sectionPanel = style({
  background: vars.surface.mid,
  border: `1px solid ${vars.border.subtle}`,
  borderRadius: "10px",
  padding: "16px",
});

export const sectionHeader = style({
  fontSize: "14px",
  fontWeight: 600,
  color: vars.text.primary,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  margin: "0 0 12px",
  paddingBottom: "10px",
  borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
});

export const sectionCode = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  fontWeight: 500,
  color: vars.text.muted,
  fontVariantNumeric: "tabular-nums",
});

export const itemGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 104px), 1fr))",
  gap: "8px",
});

export const slotActions = style({
  display: "flex",
  flexDirection: "column",
  gap: "4px",
});

export const smallAction = style({
  padding: "7px 10px",
  border: "1px solid rgba(255, 255, 255, 0.14)",
  borderRadius: "6px",
  background: "#18181b",
  color: vars.text.primary,
  fontSize: "11px",
  fontWeight: 600,
  cursor: "pointer",
  transition: "background-color 0.15s ease",
  selectors: {
    "&:hover:not(:disabled)": {
      background: "#27272a",
    },
  },
  ":disabled": {
    opacity: 0.4,
    cursor: "default",
  },
});

export const itemName = style({
  fontSize: "12px",
  fontWeight: 600,
  color: vars.text.primary,
  margin: "4px 0 2px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
});

export const itemDetails = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  color: vars.text.secondary,
  fontVariantNumeric: "tabular-nums",
});

export const quantityBadge = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  color: vars.color.positive,
  fontWeight: 600,
  fontVariantNumeric: "tabular-nums",
});

export const emptySlot = style({
  border: "1px solid rgba(255, 255, 255, 0.06)",
  background: vars.surface.low,
  borderRadius: "6px",
  minHeight: "78px",
  width: "100%",
  padding: "10px",
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  justifyContent: "space-between",
});

export const emptySlotCode = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  color: vars.text.disabled,
});

export const emptySlotIndex = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  fontWeight: 500,
  color: vars.text.disabled,
  fontVariantNumeric: "tabular-nums",
});

export const emptyMessage = style({
  gridColumn: "1 / -1",
  textAlign: "center",
  fontSize: "12px",
  color: vars.text.muted,
  padding: "24px 0",
});

export const loadingContainer = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  height: "60vh",
});

export const loadingText = style({
  fontFamily: vars.font.mono,
  fontSize: "12px",
  fontWeight: 500,
  color: vars.text.secondary,
  marginTop: "16px",
});

const spinKeyframes = keyframes({
  to: {
    transform: "rotate(360deg)",
  },
});

export const loadingSpinner = style({
  width: "28px",
  height: "28px",
  border: "2px solid rgba(255, 255, 255, 0.12)",
  borderTopColor: vars.text.primary,
  borderRadius: "50%",
  animation: `${spinKeyframes} 0.9s linear infinite`,
});

export const scrollPage = style({
  overflowY: "auto",
  paddingBottom: 0,
});

export const previewItem = style({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "8px",
  padding: "8px",
  background: vars.surface.low,
  border: `1px solid ${vars.border.subtle}`,
  borderRadius: vars.radius.control,
});

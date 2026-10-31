import { createContainer, keyframes, style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

import { cornerBrackets, vars } from "@/styles/theme.css";

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
  padding: "20px 16px",
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
  borderRadius: "6px",
  background: "rgba(133, 173, 255, 0.08)",
  border: "1px solid rgba(133, 173, 255, 0.28)",
  color: vars.color.positive,
  fontSize: "12px",
  fontWeight: 600,
  transition: "background-color 0.15s ease",
  ":hover": {
    background: "rgba(133, 173, 255, 0.14)",
  },
});

export const linkCode = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
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
    },
  },
});

export const supplyButton = style({
  width: "100%",
  marginBottom: "16px",
  padding: "12px 14px",
  borderRadius: "6px",
  border: `1px solid ${vars.border.positive}`,
  background: vars.color.positiveBg,
  color: vars.color.positive,
  fontSize: "12px",
  fontWeight: 600,
  cursor: "pointer",
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

export const itemSlotButton = recipe({
  base: {
    background: vars.surface.high,
    border: `1px solid ${vars.border.strong}`,
    borderRadius: "6px",
    padding: "10px",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "space-between",
    textAlign: "left",
    cursor: "pointer",
    position: "relative",
    minHeight: "78px",
    width: "100%",
    transition: "background-color 0.15s ease, border-color 0.15s ease",
    selectors: {
      "&:hover:not(:disabled)": {
        background: "#18181d",
        borderColor: "rgba(133, 173, 255, 0.4)",
      },
    },
    ":disabled": {
      opacity: 0.4,
      cursor: "default",
    },
  },
  variants: {
    equipped: {
      true: cornerBrackets({ tone: "default" }),
      false: {},
    },
  },
  defaultVariants: {
    equipped: false,
  },
});

export const slotTopMeta = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  fontFamily: vars.font.mono,
  fontSize: "11px",
  color: vars.text.muted,
  fontVariantNumeric: "tabular-nums",
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

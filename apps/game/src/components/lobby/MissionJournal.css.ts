import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

import { vars } from "@/styles/theme.css";

export const shell = style({
  display: "flex",
  flexDirection: "column",
  flex: 1,
  width: "100%",
  height: "100%",
  minHeight: 0,
  overflow: "hidden",
  color: vars.text.primary,
  background: vars.surface.base,
});

export const topBar = style({
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  padding: "12px 16px",
  background: vars.surface.mid,
  borderBottom: `1px solid ${vars.border.subtle}`,
});

export const titleGroup = style({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  minWidth: 0,
});

export const pageTitle = style({
  margin: 0,
  fontSize: "16px",
  fontWeight: 700,
  letterSpacing: "-0.02em",
  color: vars.text.primary,
});

export const unreadCountBadge = style({
  fontFamily: vars.font.mono,
  fontVariantNumeric: "tabular-nums",
  fontSize: "11px",
  fontWeight: 600,
  padding: "2px 6px",
  borderRadius: vars.radius.badge,
  color: vars.color.negative,
  background: vars.color.negativeBg,
  border: `1px solid ${vars.border.negative}`,
});

export const tabGroup = style({
  display: "flex",
  padding: "2px",
  borderRadius: vars.radius.control,
  background: vars.surface.base,
  border: `1px solid ${vars.border.subtle}`,
});

export const tabButton = recipe({
  base: {
    padding: "4px 10px",
    borderRadius: vars.radius.badge,
    border: 0,
    background: "transparent",
    fontSize: "12px",
    cursor: "pointer",
    transition: "background-color 0.15s ease, color 0.15s ease",
    selectors: {
      "&:focus-visible": {
        outline: `2px solid ${vars.text.primary}`,
        outlineOffset: "1px",
      },
    },
  },
  variants: {
    active: {
      true: {
        background: vars.surface.high,
        color: vars.text.primary,
        fontWeight: 600,
      },
      false: {
        color: vars.text.muted,
        fontWeight: 500,
        selectors: {
          "&:hover": {
            color: vars.text.secondary,
          },
        },
      },
    },
  },
});

export const pendingBanner = style({
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  padding: "8px 16px",
  background: vars.color.negativeBg,
  borderBottom: `1px solid ${vars.border.negative}`,
  color: vars.color.negative,
  fontSize: "12px",
  fontWeight: 600,
  textDecoration: "none",
});

export const scrollBody = style({
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
});

export const npcList = style({
  display: "flex",
  flexDirection: "column",
});

export const npcRow = recipe({
  base: {
    width: "100%",
    textAlign: "left",
    padding: "14px 16px",
    border: 0,
    borderBottom: `1px solid ${vars.border.subtle}`,
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    cursor: "pointer",
    transition: "background-color 0.12s ease",
    selectors: {
      "&:hover": {
        background: vars.surface.high,
      },
      "&:focus-visible": {
        outline: `2px solid ${vars.text.primary}`,
        outlineOffset: "-2px",
      },
    },
  },
  variants: {
    unread: {
      true: {
        background: vars.surface.mid,
      },
      false: {
        background: vars.surface.base,
      },
    },
  },
});

export const npcRowTop = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
});

export const npcIdentity = style({
  display: "flex",
  alignItems: "baseline",
  gap: "8px",
  minWidth: 0,
});

export const npcName = recipe({
  base: {
    fontSize: "14px",
    fontWeight: 600,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  variants: {
    idle: {
      true: { color: vars.text.secondary },
      false: { color: vars.text.primary },
    },
  },
});

export const npcRole = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
  color: vars.text.muted,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const npcRowBadges = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  flexShrink: 0,
});

export const unreadDot = style({
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  backgroundColor: vars.color.negative,
  flexShrink: 0,
});

export const npcPreview = recipe({
  base: {
    margin: 0,
    fontSize: "13px",
    lineHeight: 1.45,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  variants: {
    emphasis: {
      unread: { color: vars.text.primary },
      normal: { color: vars.text.secondary },
      idle: { color: vars.text.disabled },
    },
  },
});

export const statusBadge = recipe({
  base: {
    fontFamily: vars.font.mono,
    fontSize: "11px",
    fontWeight: 600,
    padding: "2px 7px",
    borderRadius: vars.radius.badge,
    flexShrink: 0,
  },
  variants: {
    tone: {
      positive: {
        color: vars.color.positive,
        background: vars.color.positiveBg,
        border: `1px solid ${vars.border.positive}`,
      },
      negative: {
        color: vars.color.negative,
        background: vars.color.negativeBg,
        border: `1px solid ${vars.border.negative}`,
      },
      neutral: {
        color: vars.text.secondary,
        background: "rgba(255, 255, 255, 0.06)",
        border: `1px solid ${vars.border.subtle}`,
      },
    },
  },
});

// Depth 2: 채팅방 헤더 & 미니 목표 바
export const chatHeaderLeft = style({
  display: "flex",
  alignItems: "center",
  gap: "10px",
  minWidth: 0,
});

export const backButton = style({
  flexShrink: 0,
  padding: "5px 9px",
  borderRadius: vars.radius.control,
  border: `1px solid ${vars.border.strong}`,
  background: vars.surface.high,
  color: vars.text.primary,
  fontSize: "13px",
  fontWeight: 600,
  lineHeight: 1,
  cursor: "pointer",
  selectors: {
    "&:hover": {
      borderColor: vars.text.primary,
    },
    "&:focus-visible": {
      outline: `2px solid ${vars.text.primary}`,
      outlineOffset: "2px",
    },
  },
});

export const chatHeaderMeta = style({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  minWidth: 0,
});

export const questSwitcher = style({
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  gap: "6px",
  padding: "8px 16px",
  overflowX: "auto",
  background: vars.surface.low,
  borderBottom: `1px solid ${vars.border.subtle}`,
});

export const questChip = recipe({
  base: {
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 9px",
    borderRadius: vars.radius.badge,
    border: `1px solid ${vars.border.subtle}`,
    background: vars.surface.base,
    fontFamily: vars.font.mono,
    fontVariantNumeric: "tabular-nums",
    fontSize: "11px",
    color: vars.text.muted,
    cursor: "pointer",
    selectors: {
      "&:hover": {
        borderColor: vars.text.primary,
        color: vars.text.primary,
      },
    },
  },
  variants: {
    active: {
      true: {
        borderColor: vars.text.primary,
        background: vars.surface.high,
        color: vars.text.primary,
        fontWeight: 600,
      },
      false: {},
    },
  },
});

export const goalStrip = style({
  flexShrink: 0,
  background: vars.surface.low,
  borderBottom: `1px solid ${vars.border.subtle}`,
});

export const goalToggle = style({
  width: "100%",
  padding: "8px 16px",
  border: 0,
  background: "transparent",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  textAlign: "left",
  cursor: "pointer",
});

export const goalSummary = style({
  fontFamily: vars.font.mono,
  fontVariantNumeric: "tabular-nums",
  fontSize: "12px",
  color: vars.text.secondary,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const goalSummaryStrong = style({
  color: vars.text.primary,
  fontWeight: 600,
});

export const goalChevron = style({
  flexShrink: 0,
  fontFamily: vars.font.mono,
  fontSize: "11px",
  color: vars.text.muted,
});

export const goalDetails = style({
  padding: "8px 16px 12px",
  borderTop: `1px solid ${vars.border.subtle}`,
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  fontSize: "12px",
  lineHeight: 1.5,
});

export const goalDetailRow = style({
  display: "flex",
  gap: "8px",
});

export const goalDetailLabel = style({
  flexShrink: 0,
  fontFamily: vars.font.mono,
  fontSize: "11px",
  color: vars.text.muted,
});

export const goalDetailValue = style({
  color: vars.text.primary,
  wordBreak: "keep-all",
});

// 기록 탭
export const recordsContainer = style({
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
});

export const recordCard = style({
  padding: "14px",
  borderRadius: vars.radius.card,
  background: vars.surface.mid,
  border: `1px solid ${vars.border.subtle}`,
  display: "flex",
  flexDirection: "column",
  gap: "8px",
});

export const recordHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
});

export const recordTitle = style({
  margin: 0,
  fontSize: "14px",
  fontWeight: 600,
  color: vars.text.primary,
});

export const codeTag = style({
  fontFamily: vars.font.mono,
  fontVariantNumeric: "tabular-nums",
  fontSize: "11px",
  color: vars.text.muted,
  flexShrink: 0,
});

export const recordBody = style({
  margin: 0,
  fontSize: "13px",
  lineHeight: 1.65,
  color: vars.text.secondary,
  wordBreak: "keep-all",
});

export const emptyState = style({
  padding: "28px 16px",
  textAlign: "center",
  fontSize: "13px",
  color: vars.text.muted,
});

export const retryButton = style({
  alignSelf: "center",
  padding: "10px 16px",
  borderRadius: vars.radius.control,
  border: 0,
  background: vars.color.ctaBg,
  color: vars.color.ctaFg,
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
  selectors: {
    "&:hover": {
      background: vars.color.ctaHover,
    },
  },
});

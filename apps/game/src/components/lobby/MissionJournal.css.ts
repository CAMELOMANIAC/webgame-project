import { createContainer, style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

import { vars } from "@/styles/theme.css";

const journalContainerName = createContainer();

export const journalContainer = style({
  display: "flex",
  flexDirection: "column",
  width: "100%",
  maxWidth: "1200px",
  minWidth: 0,
  containerType: "inline-size",
  containerName: journalContainerName,
  color: vars.text.primary,
  margin: "0 auto",
  padding: "20px 16px 92px",
});

export const chatPageRoot = style({
  overflow: "hidden",
  paddingBottom: "84px",
});

export const chatPageContainer = style({
  display: "flex",
  flexDirection: "column",
  width: "100%",
  maxWidth: "1200px",
  height: "100%",
  minWidth: 0,
  minHeight: 0,
  gap: "12px",
  color: vars.text.primary,
  margin: "0 auto",
  padding: "0 16px",
});

export const headerTopRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  marginBottom: "4px",
});

export const headerTitleRow = style({
  display: "flex",
  alignItems: "center",
  gap: "10px",
});

export const unreadCountBadge = style({
  fontFamily: vars.font.mono,
  fontVariantNumeric: "tabular-nums",
  fontSize: "11px",
  fontWeight: 600,
  padding: "2px 7px",
  borderRadius: vars.radius.badge,
  color: vars.color.negative,
  background: vars.color.negativeBg,
  border: `1px solid ${vars.border.negative}`,
  marginBottom: "6px",
});

export const pendingBanner = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  marginBottom: "16px",
  padding: "10px 14px",
  borderRadius: vars.radius.control,
  background: vars.color.negativeBg,
  border: `1px solid ${vars.border.negative}`,
  color: vars.color.negative,
  fontSize: "12px",
  fontWeight: 600,
  textDecoration: "none",
  transition: "border-color 0.12s ease",
  selectors: {
    "&:hover": {
      borderColor: vars.text.primary,
    },
  },
});

export const pendingBannerAction = style({
  fontFamily: vars.font.mono,
  fontSize: "11px",
});

export const toolbar = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: "10px",
  marginBottom: "16px",
});

export const tabGroup = style({
  position: "relative",
  display: "inline-grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  alignItems: "center",
  gap: 0,
  padding: "3px",
  borderRadius: vars.radius.control,
  backgroundColor: vars.surface.low,
  border: `1px solid ${vars.border.grid}`,
});

export const toggleThumb = recipe({
  base: {
    position: "absolute",
    top: "3px",
    bottom: "3px",
    left: "3px",
    width: "calc(50% - 3px)",
    borderRadius: vars.radius.badge,
    backgroundColor: vars.surface.high,
    border: `1px solid ${vars.border.strong}`,
    pointerEvents: "none",
    transition: "transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)",
  },
  variants: {
    position: {
      left: {
        transform: "translateX(0)",
      },
      right: {
        transform: "translateX(100%)",
      },
    },
  },
  defaultVariants: {
    position: "left",
  },
});

export const modeTab = recipe({
  base: {
    position: "relative",
    zIndex: 1,
    padding: "6px 12px",
    borderRadius: vars.radius.badge,
    border: "none",
    backgroundColor: "transparent",
    color: vars.text.muted,
    fontSize: "12px",
    fontWeight: 600,
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
    textAlign: "center",
    cursor: "pointer",
    transition: "color 0.16s ease",
    ":hover": {
      color: vars.text.primary,
    },
    ":focus-visible": {
      outline: `2px solid ${vars.text.primary}`,
      outlineOffset: "1px",
    },
  },
  variants: {
    active: {
      true: {
        color: vars.text.primary,
      },
      false: {},
    },
  },
  defaultVariants: {
    active: false,
  },
});

export const panelBox = style({
  background: vars.surface.mid,
  border: `1px solid ${vars.border.subtle}`,
  borderRadius: vars.radius.panel,
  padding: "16px",
});

export const npcCardList = style({
  display: "flex",
  flexDirection: "column",
  borderRadius: vars.radius.panel,
  border: `1px solid ${vars.border.subtle}`,
  background: vars.surface.mid,
  overflow: "hidden",
});

export const npcCard = recipe({
  base: {
    position: "relative",
    overflow: "hidden",
    width: "100%",
    textAlign: "left",
    padding: "14px 16px",
    borderRadius: 0,
    border: "none",
    borderBottom: `1px solid ${vars.border.subtle}`,
    background: "transparent",
    color: vars.text.primary,
    cursor: "pointer",
    transition: "background-color 0.15s ease",
    selectors: {
      "&:last-child": {
        borderBottom: "none",
      },
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
      true: {},
      false: {},
    },
  },
  defaultVariants: {
    unread: false,
  },
});

export const npcPortraitWrap = style({
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  width: "96px",
  zIndex: 0,
  pointerEvents: "none",
  overflow: "hidden",
  WebkitMaskImage:
    "linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.72) 45%, #000 100%)",
  maskImage:
    "linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.72) 45%, #000 100%)",
});

export const npcPortraitImage = style({
  width: "100%",
  height: "100%",
  objectFit: "cover",
  objectPosition: "top center",
  display: "block",
  opacity: 0.34,
});

export const npcCardBody = recipe({
  base: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    minWidth: 0,
  },
  variants: {
    withPortrait: {
      true: {
        paddingRight: "56px",
      },
      false: {},
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
  flexDirection: "column",
  gap: "2px",
  minWidth: 0,
});

export const npcName = recipe({
  base: {
    fontSize: "14px",
    fontWeight: 700,
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

export const npcRowBadges = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
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
    fontSize: "12px",
    lineHeight: 1.5,
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

// 채팅방 패널
export const chatPane = style({
  display: "flex",
  flexDirection: "column",
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  background: vars.surface.mid,
  border: `1px solid ${vars.border.subtle}`,
  borderRadius: vars.radius.panel,
  overflow: "hidden",
});

export const chatHeader = style({
  position: "sticky",
  top: 0,
  zIndex: 20,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  margin: "0 -16px",
  padding: "16px 16px 14px",
  backgroundColor: "rgba(9, 9, 11, 0.92)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  borderBottom: `1px solid ${vars.border.subtle}`,
});

export const chatHeaderLeft = style({
  display: "flex",
  alignItems: "center",
  gap: "12px",
  minWidth: 0,
});

export const backButton = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "36px",
  height: "36px",
  border: `1px solid ${vars.border.strong}`,
  borderRadius: vars.radius.control,
  background: vars.surface.mid,
  color: vars.text.primary,
  fontSize: "16px",
  cursor: "pointer",
  transition: "background-color 0.15s ease, border-color 0.15s ease",
  flexShrink: 0,
  selectors: {
    "&:hover": {
      background: vars.surface.high,
      borderColor: vars.border.subtle,
    },
    "&:focus-visible": {
      outline: `2px solid ${vars.text.primary}`,
      outlineOffset: "2px",
    },
  },
});

export const backArrow = style({
  lineHeight: 1,
});

export const chatHeaderPortraitWrap = style({
  width: "38px",
  height: "38px",
  borderRadius: vars.radius.control,
  border: `1px solid ${vars.border.strong}`,
  background: vars.surface.low,
  overflow: "hidden",
  flexShrink: 0,
});

export const chatHeaderPortraitImage = style({
  width: "100%",
  height: "100%",
  objectFit: "cover",
  objectPosition: "top center",
  display: "block",
});

export const chatHeaderTitle = style({
  margin: 0,
  fontSize: "22px",
  fontWeight: 700,
  letterSpacing: "-0.02em",
  color: vars.text.primary,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const chatEmptyWrap = style({
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: vars.surface.base,
});

// 진행 중 임무 탭
export const recordsGrid = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: "12px",
  "@container": {
    [`${journalContainerName} (min-width: 760px)`]: {
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    },
  },
});

export const recordCard = style({
  width: "100%",
  padding: "16px",
  borderRadius: vars.radius.panel,
  background: vars.surface.mid,
  border: `1px solid ${vars.border.subtle}`,
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  textAlign: "left",
  cursor: "pointer",
  transition: "background-color 0.15s ease, border-color 0.15s ease",
  selectors: {
    "&:hover": {
      background: vars.surface.high,
      borderColor: vars.text.primary,
    },
    "&:focus-visible": {
      outline: `2px solid ${vars.text.primary}`,
      outlineOffset: "2px",
    },
  },
});

export const missionMetaList = style({
  display: "flex",
  flexWrap: "wrap",
  gap: "6px 14px",
  paddingTop: "8px",
  borderTop: `1px solid ${vars.border.subtle}`,
  fontFamily: vars.font.mono,
  fontVariantNumeric: "tabular-nums",
  fontSize: "11px",
  color: vars.text.muted,
});

export const missionMetaStrong = style({
  color: vars.text.secondary,
});

export const recordHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  paddingBottom: "8px",
  borderBottom: `1px solid ${vars.border.subtle}`,
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
  margin: 0,
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

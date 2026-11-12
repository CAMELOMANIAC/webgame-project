import { style } from "@vanilla-extract/css";

import { cornerBrackets, vars } from "@/styles/theme.css";

export const pageTransition = style({
  transition: "padding-bottom 450ms cubic-bezier(0.4, 0, 0.2, 1)",
  "@media": {
    "(prefers-reduced-motion: reduce)": { transition: "none" },
  },
});

export const fieldPanels = style({
  display: "grid",
  gridTemplateRows: "minmax(0, 1fr) auto minmax(0, 0fr)",
  flex: 1,
  minHeight: 0,
  width: "100%",
  pointerEvents: "none",
  transition: "grid-template-rows 450ms cubic-bezier(0.4, 0, 0.2, 1)",
  selectors: {
    '&[data-backpack="true"]': {
      gridTemplateRows: "minmax(0, 0fr) auto minmax(0, 1fr)",
    },
  },
  "@media": {
    "(prefers-reduced-motion: reduce)": { transition: "none" },
  },
});

export const fieldHeader = style({
  gridRow: 1,
  minHeight: 0,
  position: "relative",
});

export const fieldInfo = style({
  gridRow: 2,
  pointerEvents: "auto",
});

export const backpackPanel = style({
  gridRow: 3,
  minHeight: 0,
  pointerEvents: "auto",
});

export const slotOverlay = style([
  cornerBrackets({ tone: "positive" }),
  {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    width: "72px",
    aspectRatio: "1 / 1",
    padding: "8px",
    border: "1px solid rgba(133, 173, 255, 0.45)",
    borderRadius: "6px",
    color: vars.text.primary,
    fontSize: "12px",
    fontWeight: 600,
    touchAction: "none",
    cursor: "grabbing",
    backgroundColor: "rgba(16, 16, 19, 0.94)",
    backdropFilter: "blur(8px)",
    boxShadow: "0 12px 24px rgba(0, 0, 0, 0.45)",
    pointerEvents: "none",
    zIndex: 1000,
  },
]);

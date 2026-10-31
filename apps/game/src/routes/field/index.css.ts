import { style } from "@vanilla-extract/css";

import { cornerBrackets, vars } from "@/styles/theme.css";

export const slotOverlay = style([
  cornerBrackets({ tone: "positive" }),
  {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    position: "absolute",
    width: "82px",
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
    zIndex: 1000,
  },
]);

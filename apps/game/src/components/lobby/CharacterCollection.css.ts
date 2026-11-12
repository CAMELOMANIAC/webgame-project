import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

import { cornerBrackets, vars } from "@/styles/theme.css";

export const collection = style({
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  marginBottom: "20px",
  padding: "14px",
  backgroundColor: vars.surface.mid,
  border: `1px solid ${vars.border.subtle}`,
  borderRadius: vars.radius.panel,
});

export const collectionHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
});

export const title = style({
  margin: 0,
  fontSize: "14px",
  fontWeight: 600,
  color: vars.text.primary,
  fontVariantNumeric: "tabular-nums",
});

export const description = style({
  margin: 0,
  color: vars.text.secondary,
  fontSize: "12px",
  lineHeight: 1.5,
});

export const alert = style({
  margin: 0,
  padding: "8px 10px",
  borderRadius: vars.radius.control,
  border: `1px solid ${vars.border.negative}`,
  backgroundColor: vars.color.negativeBg,
  color: vars.color.negative,
  fontSize: "12px",
});

export const list = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: "8px",
});

export const characterButton = recipe({
  base: {
    position: "relative",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    padding: "12px",
    borderRadius: vars.radius.control,
    color: vars.text.primary,
    cursor: "pointer",
    textAlign: "left",
    transition:
      "min-height 0.2s ease, background-color 0.15s ease, border-color 0.15s ease",
    "@media": {
      "(prefers-reduced-motion: reduce)": {
        transition: "none",
      },
    },
    selectors: {
      "&:focus-visible": {
        outline: "2px solid rgba(250, 250, 250, 0.72)",
        outlineOffset: "2px",
      },
    },
  },
  variants: {
    readOnly: {
      true: { cursor: "default" },
      false: {
        selectors: {
          "&:hover:not(:disabled)": {
            backgroundColor: vars.surface.high,
            borderColor: "rgba(250, 250, 250, 0.24)",
          },
        },
      },
    },
    state: {
      raiding: [
        cornerBrackets({ tone: "none" }),
        {
          minHeight: "68px",
          justifyContent: "center",
          border: "1px solid rgba(255, 255, 255, 0.14)",
          backgroundColor: vars.surface.low,
          selectors: {
            "&:disabled": {
              cursor: "default",
              opacity: 0.72,
            },
          },
        },
      ],
      selected: [
        cornerBrackets({ tone: "default" }),
        {
          minHeight: "120px",
          justifyContent: "space-between",
          border: "1px solid rgba(250, 250, 250, 0.36)",
          backgroundColor: vars.surface.high,
          selectors: {
            "&:disabled": {
              cursor: "default",
              opacity: 1,
            },
          },
        },
      ],
      idle: [
        cornerBrackets({ tone: "none" }),
        {
          minHeight: "68px",
          justifyContent: "center",
          border: `1px solid ${vars.border.subtle}`,
          backgroundColor: vars.surface.low,
          selectors: {
            "&:disabled": {
              cursor: "default",
              opacity: 0.55,
            },
          },
        },
      ],
    },
  },
  compoundVariants: [
    {
      variants: { readOnly: true, state: "selected" },
      style: cornerBrackets({ tone: "none" }),
    },
  ],
  defaultVariants: {
    state: "idle",
    readOnly: false,
  },
});

export const cardContent = recipe({
  base: {
    position: "relative",
    zIndex: 1,
    flex: 1,
    display: "grid",
    width: "100%",
    height: "100%",
    paddingRight: "62px",
    alignItems: "center",
  },
  variants: {
    readOnly: {
      true: {},
      false: {},
    },
    expanded: {
      true: {},
      false: {},
    },
  },
  compoundVariants: [
    {
      variants: { expanded: false, readOnly: false },
      style: {
        gridTemplateColumns: "auto minmax(0, 1fr)",
        gridTemplateRows: "auto auto",
        gridTemplateAreas: '"radio name" "radio stats"',
        columnGap: "8px",
        rowGap: "4px",
        alignContent: "center",
      },
    },
    {
      variants: { expanded: false, readOnly: true },
      style: {
        gridTemplateColumns: "minmax(0, 1fr)",
        gridTemplateRows: "auto auto",
        gridTemplateAreas: '"name" "stats"',
        rowGap: "4px",
        alignContent: "center",
      },
    },
    {
      variants: { expanded: true, readOnly: false },
      style: {
        gridTemplateColumns: "auto minmax(0, 1fr)",
        gridTemplateRows: "auto 1fr",
        gridTemplateAreas: '"radio name" "stats stats"',
        columnGap: "7px",
        rowGap: "12px",
        alignContent: "space-between",
      },
    },
    {
      variants: { expanded: true, readOnly: true },
      style: {
        gridTemplateColumns: "minmax(0, 1fr)",
        gridTemplateRows: "auto 1fr",
        gridTemplateAreas: '"name" "stats"',
        rowGap: "12px",
        alignContent: "space-between",
      },
    },
  ],
  defaultVariants: {
    expanded: false,
    readOnly: false,
  },
});

export const radioIndicator = recipe({
  base: {
    gridArea: "radio",
    alignSelf: "center",
    position: "relative",
    width: "16px",
    height: "16px",
    borderRadius: "9999px",
    flexShrink: 0,
    boxSizing: "border-box",
    transition: "border-color 0.15s ease, background-color 0.15s ease",
  },
  variants: {
    expanded: {
      true: {
        marginRight: 0,
      },
      false: {
        marginRight: "4px",
      },
    },
    state: {
      selected: {
        border: `1.5px solid ${vars.text.primary}`,
        backgroundColor: "rgba(250, 250, 250, 0.12)",
        selectors: {
          "&::after": {
            content: '""',
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "7px",
            height: "7px",
            borderRadius: "9999px",
            backgroundColor: vars.text.primary,
            transform: "translate(-50%, -50%)",
          },
        },
      },
      idle: {
        border: "1.5px solid rgba(255, 255, 255, 0.24)",
        backgroundColor: "transparent",
      },
      raiding: {
        border: "1.5px solid rgba(255, 255, 255, 0.14)",
        backgroundColor: "transparent",
        selectors: {
          "&::after": {
            content: '""',
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "8px",
            height: "1.5px",
            backgroundColor: vars.text.muted,
            transform: "translate(-50%, -50%)",
          },
        },
      },
    },
  },
  defaultVariants: {
    expanded: false,
    state: "idle",
  },
});

export const cardName = style({
  gridArea: "name",
  fontSize: "13px",
  fontWeight: 600,
  color: vars.text.primary,
  minWidth: 0,
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const statBlock = recipe({
  base: {
    gridArea: "stats",
    display: "flex",
    fontFamily: vars.font.mono,
    fontSize: "11px",
    fontWeight: 500,
    fontVariantNumeric: "tabular-nums",
  },
  variants: {
    expanded: {
      true: {
        flexDirection: "column",
        gap: "2px",
        alignSelf: "end",
        marginTop: "6px",
        color: "#d4d4d8",
      },
      false: {
        flexDirection: "row",
        alignItems: "center",
        gap: "6px",
        flexWrap: "wrap",
        color: vars.text.secondary,
      },
    },
  },
  defaultVariants: {
    expanded: false,
  },
});

export const statDivider = recipe({
  base: {
    color: vars.text.muted,
  },
  variants: {
    expanded: {
      true: { display: "none" },
      false: { display: "inline" },
    },
  },
  defaultVariants: {
    expanded: false,
  },
});

export const statWeight = style({
  color: vars.text.muted,
});

export const portraitLayer = style({
  position: "absolute",
  inset: 0,
  borderRadius: vars.radius.control,
  overflow: "hidden",
  pointerEvents: "none",
});

export const portraitWrap = recipe({
  base: {
    position: "absolute",
    top: "4px",
    bottom: "0",
    overflow: "hidden",
    WebkitMaskImage:
      "linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.85) 38%, #000 58%)",
    maskImage:
      "linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.85) 38%, #000 58%)",
    transition: "width 0.2s ease, right 0.2s ease",
    "@media": {
      "(prefers-reduced-motion: reduce)": {
        transition: "none",
      },
    },
  },
  variants: {
    expanded: {
      true: {
        width: "92px",
        right: "-6px",
      },
      false: {
        width: "76px",
        right: "0px",
      },
    },
  },
  defaultVariants: {
    expanded: false,
  },
});

export const portraitImage = recipe({
  base: {
    width: "100%",
    height: "100%",
    display: "block",
    objectFit: "cover",
    objectPosition: "top center",
    userSelect: "none",
    transition: "opacity 0.15s ease, filter 0.15s ease",
  },
  variants: {
    state: {
      selected: {
        opacity: 0.92,
      },
      idle: {
        opacity: 0.38,
        filter: "grayscale(45%)",
      },
      raiding: {
        opacity: 0.3,
        filter: "grayscale(65%)",
      },
    },
  },
  defaultVariants: {
    state: "idle",
  },
});

export const variantButton = style({
  padding: "8px 12px",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: vars.radius.control,
  backgroundColor: vars.surface.high,
  color: vars.text.primary,
  fontSize: "12px",
  fontWeight: 500,
  cursor: "pointer",
  selectors: {
    "&:disabled": {
      opacity: 0.45,
      cursor: "default",
    },
  },
});

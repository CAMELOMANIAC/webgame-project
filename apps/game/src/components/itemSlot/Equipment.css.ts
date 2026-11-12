import { recipe } from "@vanilla-extract/recipes";

export const container = recipe({
  base: {
    gap: "6px",
  },
  variants: {
    layout: {
      row: {
        width: "100%",
        display: "flex",
        flexWrap: "nowrap",
        flexDirection: "row",
        justifyContent: "space-between",
        padding: "10px 16px 16px",
      },
      grid: {
        width: "fit-content",
        display: "grid",
        gridTemplateColumns: "repeat(3, 52px)",
        padding: 0,
        flexShrink: 0,
      },
    },
  },
  defaultVariants: {
    layout: "row",
  },
});

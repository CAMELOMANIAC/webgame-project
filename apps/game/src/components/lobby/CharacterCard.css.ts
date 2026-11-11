import { style } from "@vanilla-extract/css";

import { vars } from "@/styles/theme.css";

// 카드 자체가 거대한 흰색 버튼으로 동작
export const cardButton = style({
  width: "100%",
  minHeight: "170px",
  backgroundColor: vars.color.ctaBg,
  color: vars.color.ctaFg,
  border: 0,
  borderRadius: "10px",
  padding: "20px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  gap: "14px",
  cursor: "pointer",
  textAlign: "left",
  fontFamily: vars.font.sans,
  boxSizing: "border-box",
  transition: "background-color 0.15s ease, transform 0.1s ease",
  ":hover": {
    backgroundColor: vars.color.ctaHover,
  },
  ":focus-visible": {
    outline: `2px solid ${vars.color.positive}`,
    outlineOffset: "2px",
  },
  selectors: {
    "&:disabled": {
      opacity: 0.5,
      cursor: "default",
    },
  },
});

export const cardBody = style({
  display: "flex",
  flexDirection: "column",
  gap: "8px",
});

// 이름과 체력 숫자를 한 줄에 균형 있게 배치
export const topRow = style({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: "12px",
});

export const characterName = style({
  margin: 0,
  fontSize: "20px",
  fontWeight: 700,
  letterSpacing: "-0.02em",
  color: vars.color.ctaFg,
});

// 체력만 숫자로 크게 표현
export const hpNumber = style({
  margin: 0,
  fontFamily: vars.font.mono,
  fontSize: "22px",
  fontWeight: 800,
  fontVariantNumeric: "tabular-nums",
  letterSpacing: "-0.02em",
  color: vars.color.ctaFg,
  display: "flex",
  alignItems: "baseline",
  gap: "3px",
});

export const hpMax = style({
  fontSize: "13px",
  fontWeight: 600,
  color: "rgba(9, 9, 11, 0.45)",
});

export const hpUnit = style({
  fontSize: "10px",
  fontWeight: 700,
  color: "rgba(9, 9, 11, 0.5)",
  letterSpacing: "0.04em",
});

// 장착 장비 간략히 표시
export const loadoutText = style({
  margin: 0,
  fontSize: "12px",
  color: "rgba(9, 9, 11, 0.7)",
  lineHeight: 1.5,
});

export const emptySubtext = style({
  margin: 0,
  fontSize: "13px",
  color: "rgba(9, 9, 11, 0.65)",
  lineHeight: 1.5,
});

// 카드 하단: 카드 제목이 아래로 내려와 "탐사 준비"가 됨
export const cardFooter = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  paddingTop: "12px",
  borderTop: "1px solid rgba(9, 9, 11, 0.12)",
  width: "100%",
  marginTop: "4px",
});

export const footerTitle = style({
  margin: 0,
  fontSize: "17px",
  fontWeight: 700,
  letterSpacing: "-0.02em",
  color: vars.color.ctaFg,
});

export const footerCode = style({
  fontFamily: vars.font.mono,
  fontSize: "12px",
  fontWeight: 700,
  color: "rgba(9, 9, 11, 0.7)",
  fontVariantNumeric: "tabular-nums",
});

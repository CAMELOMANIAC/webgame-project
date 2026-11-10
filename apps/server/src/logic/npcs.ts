// 구호·통제 역할을 검증하는 초안. 회사 전체가 일괄 적대하는 구조가 아니다.
export const hanlimNpcs = {
  relief: {
    id: "hanlim-relief-a",
    name: "기업 구호 담당자",
    faction: "기업",
    role: "구호",
    reason: "중첩 안정 구역에서 생존자와 도시 운영을 지원합니다.",
  },
  control: {
    id: "hanlim-control-a",
    name: "기업 통제 요원",
    faction: "기업",
    role: "시설 통제",
    reason: "출입 제한 시설의 자료 접근을 차단하려 합니다.",
    weaponId: "hanlim-control-baton",
    hp: 30,
    stamina: 100,
    staminaRegen: 5,
  },
} as const;

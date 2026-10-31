import { firstMissionNodeId } from "@webgame/types";

// 임무명·대사·보상은 첫 플레이 구간을 위한 제안 초안이다.
export const firstMission = {
  id: "hanlim-first-recovery",
  version: 1,
  title: "중계 시설 기록 회수",
  briefing:
    "한림그룹 구호 담당자: 도시 운영에 필요한 중계 기록을 회수해 주세요. 제한 구역의 통제 요원은 회수 허가를 확인하지 못할 수 있습니다. 기록을 확보한 뒤 살아서 복귀하세요.",
  targetNodeId: firstMissionNodeId,
  supplyWeaponId: "hanlim-relief-carbine",
  rewardWeaponId: "hanlim-relief-carbine",
  rewardDescription: "한림 구호용 카빈 1개 · 연구 기록 공개",
} as const;

const records = [
  {
    id: "return-observation",
    minimumTier: 1,
    title: "복귀 개체 관측 기록",
    content:
      "구호 장비 지급과 도시 설비 유지가 계속되고 있다. 같은 문서의 부록에는 생존자의 탐사 경로와 복귀 후 신체 검사 결과가 관측 항목으로 기재되어 있다. 구호와 실험은 같은 운영 체계 안에서 진행된다.",
  },
];

// 오너의 이름·세계선·구체적 등장 시점은 미확정이다. 아래는 공개 단계 지원용 표식이다.
const contacts = [
  {
    minimumTier: 0,
    publicId: "relief-contact",
    publicName: "한림그룹 구호 담당자",
    role: "생존 지원",
  },
  {
    minimumTier: 2,
    publicId: "executive-contact",
    publicName: "한림그룹 경영 책임자",
    role: "경영 지시",
    entityId: "owner-instance-a",
  },
  {
    minimumTier: 3,
    publicId: "executive-contact-b",
    publicName: "한림그룹 경영 책임자",
    role: "별도 개체 확인",
    entityId: "owner-instance-b",
  },
];

export function disclosedStory(tier: number) {
  return {
    records: records
      .filter((record) => tier >= record.minimumTier)
      .map(({ id, title, content }) => ({ id, title, content })),
    contacts: contacts
      .filter((contact) => tier >= contact.minimumTier)
      .map((contact) => ({
        id: contact.publicId,
        name: contact.publicName,
        role: contact.role,
        ...(tier >= 3 && "entityId" in contact
          ? { entityId: contact.entityId }
          : {}),
      })),
  };
}

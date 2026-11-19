import {
  firstMissionNodeId,
  MISSION_NODE_LABELS,
  secondMissionNodeId,
  thirdMissionNodeId,
} from "@webgame/types";

export interface MissionItemGrant {
  weaponId: string;
  quantity: number;
}

export interface MissionDefinition {
  id: string;
  version: number;
  tier: number;
  requiredStoryTier: number;
  grantsStoryTier: number;
  issuerName: string;
  issuerRole: string;
  title: string;
  briefing: string;
  targetNodeId: number;
  targetLabel: string;
  enemyArchetypeId: string;
  supplyItems: readonly MissionItemGrant[];
  supplyDescription: string;
  rewardItems: readonly MissionItemGrant[];
  rewardCredits: number;
  rewardDescription: string;
}

// 임무명·대사·보상은 거점 담당자 3인 구도 및 단계별 진실 공개를 연결하는 서사 초안이다.
export const MISSION_CHAIN: readonly MissionDefinition[] = [
  {
    id: "hanlim-first-recovery",
    version: 2,
    tier: 1,
    requiredStoryTier: 0,
    grantsStoryTier: 1,
    issuerName: "조 시설과장",
    issuerRole: "구호·시설 운영",
    title: "중계 시설 기록 회수",
    briefing:
      "조 시설과장: 도시 운영에 필요한 중계 기록을 회수해 주십시오. 현장의 통제 요원은 회수 허가를 확인하지 못할 수 있습니다. 기록을 확보한 뒤 중앙 탈출 지점으로 복귀하십시오.",
    targetNodeId: firstMissionNodeId,
    targetLabel: MISSION_NODE_LABELS[firstMissionNodeId] ?? "기록 중계 시설",
    enemyArchetypeId: "npc-hanlim-control",
    supplyItems: [{ weaponId: "hanlim-relief-carbine", quantity: 1 }],
    supplyDescription: "기업 구호용 카빈 1개",
    rewardItems: [
      { weaponId: "eq-pub-t1", quantity: 1 },
      { weaponId: "med-trauma-kit", quantity: 1 },
      { weaponId: "food-combat-ration", quantity: 1 },
    ],
    rewardCredits: 200,
    rewardDescription:
      "고압 충격봉 1개 · 외상 응급 처치 키트 1개 · 따뜻한 전투식량 1개 · 200 CR · 연구 기록 공개",
  },
  {
    id: "hanlim-second-contraband",
    version: 1,
    tier: 2,
    requiredStoryTier: 1,
    grantsStoryTier: 2,
    issuerName: "최 사장",
    issuerRole: "비공식 물자 거래",
    title: "물류 봉쇄선 적하목록 회수",
    briefing:
      "최 사장: 조 과장한테는 비밀로 하고 하나만 챙겨와 줘. 물류센터 봉쇄 구역에 기업 본사 직속 결재 문서가 묶여 있거든. 누가 이 도시 봉쇄를 지시하는지 이름 정도는 적혀 있을 거야.",
    targetNodeId: secondMissionNodeId,
    targetLabel:
      MISSION_NODE_LABELS[secondMissionNodeId] ?? "물류센터 봉쇄 중계점",
    enemyArchetypeId: "npc-ind-enforcer",
    supplyItems: [
      { weaponId: "med-bandage", quantity: 2 },
      { weaponId: "food-ion-drink", quantity: 1 },
    ],
    supplyDescription: "압박 붕대 2개 · 전해질 이온 음료 1개",
    rewardItems: [
      { weaponId: "eq-reactive-plate", quantity: 1 },
      { weaponId: "mat-biogel", quantity: 2 },
    ],
    rewardCredits: 350,
    rewardDescription:
      "떼어온 방화문짝 1개 · 바이오 젤 2개 · 350 CR · 봉쇄 지시서 기록 공개",
  },
  {
    id: "hanlim-third-anomaly",
    version: 1,
    tier: 3,
    requiredStoryTier: 2,
    grantsStoryTier: 3,
    issuerName: "윤 책임연구원",
    issuerRole: "연구·유전자 분석",
    title: "변전소 중첩 관측 로그 회수",
    briefing:
      "윤 책임연구원: 최 사장이 가져온 결재선을 대조해 봤습니다. 같은 서명이 같은 시각에 서로 다른 구획에서 두 번 승인됐더군요. 중앙 전력 변전소의 중첩 관측 로그를 회수해 주시면, 이 실험의 진짜 구조를 확인해 드리겠습니다.",
    targetNodeId: thirdMissionNodeId,
    targetLabel: MISSION_NODE_LABELS[thirdMissionNodeId] ?? "중앙 전력 변전소",
    enemyArchetypeId: "npc-inf-drone-op",
    supplyItems: [
      { weaponId: "med-trauma-kit", quantity: 1 },
      { weaponId: "mat-biogel", quantity: 1 },
    ],
    supplyDescription: "외상 응급 처치 키트 1개 · 바이오 젤 1개",
    rewardItems: [
      { weaponId: "eq-arc-emitter", quantity: 1 },
      { weaponId: "gene-ampoule-haerin", quantity: 1 },
    ],
    rewardCredits: 500,
    rewardDescription:
      "고압 전기파리채 1개 · 유전자 앰플(서해린) 1개 · 500 CR · 중첩 개체 대조 보고서 공개",
  },
];

export const firstMission = {
  ...MISSION_CHAIN[0]!,
  supplyWeaponId: MISSION_CHAIN[0]!.supplyItems[0]!.weaponId,
  rewardWeaponId: MISSION_CHAIN[0]!.rewardItems[0]!.weaponId,
} as const;

export function getMissionDefinitionById(
  questId: string,
): MissionDefinition | undefined {
  return MISSION_CHAIN.find((mission) => mission.id === questId);
}

const records = [
  {
    id: "return-observation",
    minimumTier: 1,
    title: "복귀 개체 관측 기록",
    content:
      "구호 장비 지급과 도시 설비 유지가 계속되고 있다. 같은 문서의 부록에는 생존자의 탐사 경로와 복귀 후 신체 검사 결과가 관측 항목으로 기재되어 있다. 구호와 실험은 같은 운영 체계 안에서 진행된다.",
  },
  {
    id: "single-executive-directive",
    minimumTier: 2,
    title: "단일 결재선과 봉쇄 지시서",
    content:
      "물류 봉쇄선에서 회수한 적하목록과 격리 명령서는 모두 기업의 단일 경영 책임자 명의로 직접 결재되어 있었다. 구호 물자 배정과 통제 구역 봉쇄가 서로 다른 부서의 충돌이 아니라, 동일한 최상위 지휘 계통에서 동시에 내려오고 있다.",
  },
  {
    id: "divergent-owner-audit",
    minimumTier: 3,
    title: "중첩 개체 대조 보고서",
    content:
      "중앙 전력 변전소 관측 로그와 결재 생체 서명을 대조한 결과, 동일한 경영 책임자의 서명이 서로 다른 구획에서 동시각에 승인된 흔적이 확인되었다. 유전자 염기 미세 편차 분석에 따라 두 지시는 서로 다른 세계선에서 유입된 별도 개체가 발행한 것으로 판별된다.",
  },
];

// 오너의 이름·세계선·구체적 등장 시점은 미확정이다. 아래는 공개 단계 지원용 표식이다.
const contacts = [
  {
    minimumTier: 0,
    publicId: "relief-contact",
    publicName: "조 시설과장",
    role: "구호·시설 운영",
    affiliation: "기업 구호 운영부",
  },
  {
    minimumTier: 0,
    publicId: "market-contact",
    publicName: "최 사장",
    role: "비공식 물자 거래 · 거래소",
    affiliation: "거점 자영업자",
  },
  {
    minimumTier: 0,
    publicId: "lab-contact",
    publicName: "윤 책임연구원",
    role: "연구·유전자 분석 · 연구실",
    affiliation: "기업 연구부문",
  },
  {
    minimumTier: 2,
    publicId: "executive-contact",
    publicName: "기업 경영 책임자",
    role: "경영 지시",
    affiliation: "기업 본사",
    entityId: "owner-instance-a",
  },
  {
    minimumTier: 3,
    publicId: "executive-contact-b",
    publicName: "기업 경영 책임자",
    role: "별도 개체 확인",
    affiliation: "기업 본사 (중첩 개체)",
    entityId: "owner-instance-b",
  },
];

export function disclosedStory(tier: number) {
  return {
    records: records
      .filter((record) => tier >= record.minimumTier)
      .map(({ id, title, content, minimumTier }) => ({
        id,
        title,
        content,
        tier: minimumTier,
      })),
    contacts: contacts
      .filter((contact) => tier >= contact.minimumTier)
      .map((contact) => ({
        id: contact.publicId,
        name: contact.publicName,
        role: contact.role,
        affiliation: contact.affiliation,
        ...(tier >= 3 && "entityId" in contact
          ? { entityId: contact.entityId }
          : {}),
      })),
  };
}

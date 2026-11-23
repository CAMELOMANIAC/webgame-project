import {
  borderGateNodeId,
  firstMissionNodeId,
  medicalWardNodeId,
  MISSION_NODE_LABELS,
  rationTerminalNodeId,
  secondMissionNodeId,
  thirdMissionNodeId,
} from "@webgame/types";

import type { ChainMission, ItemGrant } from "./questDialogue";
import { STORY_MANUSCRIPT_MISSIONS } from "./storyDialogues.generated";
import type { ManuscriptMission } from "./storyManuscript";

export type MissionItemGrant = ItemGrant;

/** 기존 선형 임무의 원본 데이터. 대화 정의는 `buildLinearMission`이 만든다. */
interface MissionSeed {
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

// 1막(Tier 1~2: 적응·구호) -> 2막(Tier 3~4: 통제 모순·단일 결재선) -> 3막(Tier 5~6: 중첩 관측·복수 개체)
const MISSION_SEEDS: readonly MissionSeed[] = [
  {
    id: "hanlim-first-recovery",
    version: 3,
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
    id: "hanlim-tier2-ration-audit",
    version: 2,
    tier: 2,
    requiredStoryTier: 1,
    grantsStoryTier: 2,
    issuerName: "최 사장",
    issuerRole: "비공식 물자 거래",
    title: "상가 배급 단말기 대장 회수",
    briefing:
      "최 사장: 거점 배급만으로는 물자가 모자라. 상업지구 배급창구 단말기에 남은 재고 대장 좀 뽑아와 줘. 거기 어슬렁거리는 정찰 인원만 조심하면 돼.",
    targetNodeId: rationTerminalNodeId,
    targetLabel:
      MISSION_NODE_LABELS[rationTerminalNodeId] ?? "상가 비상 배급창구",
    enemyArchetypeId: "npc-com-scout",
    supplyItems: [
      { weaponId: "med-bandage", quantity: 2 },
      { weaponId: "food-energy-bar", quantity: 1 },
    ],
    supplyDescription: "압박 붕대 2개 · 비상 에너지 바 1개",
    rewardItems: [
      { weaponId: "mat-battery", quantity: 2 },
      { weaponId: "food-ion-drink", quantity: 2 },
    ],
    rewardCredits: 250,
    rewardDescription:
      "리튬 배터리 2개 · 전해질 이온 음료 2개 · 250 CR · 배급 대조 기록 공개",
  },
  {
    id: "hanlim-tier3-ward-manifest",
    version: 2,
    tier: 3,
    requiredStoryTier: 2,
    grantsStoryTier: 3,
    issuerName: "윤 책임연구원",
    issuerRole: "연구·유전자 분석",
    title: "응급 병동 생체 이송 내역 회수",
    briefing:
      "윤 책임연구원: 구호 부서가 이송한 시민 명단이 일반 병원이 아니라 연구동으로 빠지고 있습니다. 남부 응급 병동의 이송 내역을 확인해 주십시오.",
    targetNodeId: medicalWardNodeId,
    targetLabel: MISSION_NODE_LABELS[medicalWardNodeId] ?? "남부 응급 병동",
    enemyArchetypeId: "npc-med-medic",
    supplyItems: [
      { weaponId: "med-tourniquet", quantity: 1 },
      { weaponId: "mat-biogel", quantity: 1 },
    ],
    supplyDescription: "긴급 지혈대 1개 · 바이오 젤 1개",
    rewardItems: [
      { weaponId: "eq-med-t1", quantity: 1 },
      { weaponId: "mat-nanosuture", quantity: 1 },
    ],
    rewardCredits: 300,
    rewardDescription:
      "임상용 메스 1개 · 나노 봉합사 1개 · 300 CR · 생체 이관 기록 공개",
  },
  {
    id: "hanlim-second-contraband",
    version: 2,
    tier: 4,
    requiredStoryTier: 3,
    grantsStoryTier: 4,
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
    rewardCredits: 380,
    rewardDescription:
      "떼어온 방화문짝 1개 · 바이오 젤 2개 · 380 CR · 봉쇄 지시서 기록 공개",
  },
  {
    // 4차 최 사장 의뢰를 거절하고 조 과장에게 알렸을 때 열리는 대체 임무(조 과장 루트).
    id: "hanlim-tier4-official-audit",
    version: 2,
    tier: 4,
    requiredStoryTier: 3,
    grantsStoryTier: 4,
    issuerName: "조 시설과장",
    issuerRole: "구호·시설 운영",
    title: "보급 집하장 결재 원부 감사",
    briefing:
      "조 시설과장: 최 사장이 언급한 구호 물자와 격리 명령의 통합 결재 원부가 실제로 물류망에 묶여 있는지 운영부 차원에서 공식 감사를 진행해야겠습니다.",
    targetNodeId: 305,
    targetLabel: MISSION_NODE_LABELS[305] ?? "중앙 보급 집하장",
    enemyArchetypeId: "npc-ind-enforcer",
    supplyItems: [
      { weaponId: "med-trauma-kit", quantity: 1 },
      { weaponId: "food-ion-drink", quantity: 1 },
    ],
    supplyDescription: "외상 응급 처치 키트 1개 · 전해질 이온 음료 1개",
    rewardItems: [
      { weaponId: "eq-reactive-plate", quantity: 1 },
      { weaponId: "mat-ceramic", quantity: 2 },
    ],
    rewardCredits: 380,
    rewardDescription:
      "떼어온 방화문짝 1개 · 방열 세라믹 판 2개 · 380 CR · 봉쇄 지시서 기록 공개",
  },
  {
    id: "hanlim-tier5-border-alarm",
    version: 2,
    tier: 5,
    requiredStoryTier: 4,
    grantsStoryTier: 5,
    issuerName: "조 시설과장",
    issuerRole: "구호·시설 운영",
    title: "외곽 검문소 중복 경보 로그 회수",
    briefing:
      "조 시설과장: 물류단지 외곽 검문소에서 동일 인원의 출입 경보가 반복되고 있습니다. 매뉴얼상 오작동으로 보이나, 현장 로그를 직접 회수해 주십시오.",
    targetNodeId: borderGateNodeId,
    targetLabel:
      MISSION_NODE_LABELS[borderGateNodeId] ?? "물류단지 외곽 검문소",
    enemyArchetypeId: "npc-patrol-mid",
    supplyItems: [
      { weaponId: "med-trauma-kit", quantity: 1 },
      { weaponId: "food-combat-ration", quantity: 1 },
    ],
    supplyDescription: "외상 응급 처치 키트 1개 · 따뜻한 전투식량 1개",
    rewardItems: [
      { weaponId: "mat-titanium", quantity: 2 },
      { weaponId: "mat-core", quantity: 1 },
    ],
    rewardCredits: 450,
    rewardDescription:
      "경량 티타늄 프레임 2개 · 고밀도 코어 1개 · 450 CR · 중복 통행 경보 공개",
  },
  {
    id: "hanlim-third-anomaly",
    version: 2,
    tier: 6,
    requiredStoryTier: 5,
    grantsStoryTier: 6,
    issuerName: "윤 책임연구원",
    issuerRole: "연구·유전자 분석",
    title: "변전소 중첩 관측 로그 회수",
    briefing:
      "윤 책임연구원: 검문소 경보와 결재선을 대조해 봤습니다. 같은 서명이 같은 시각에 서로 다른 구획에서 두 번 승인됐더군요. 중앙 전력 변전소의 중첩 관측 로그를 회수해 주시면, 이 실험의 진짜 구조를 확인해 드리겠습니다.",
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
    rewardCredits: 550,
    rewardDescription:
      "고압 전기파리채 1개 · 유전자 앰플(서해린) 1개 · 550 CR · 중첩 개체 대조 보고서 공개",
  },
];

export interface MissionDefinition extends MissionSeed, ChainMission {
  issuerContactId: string;
  defaultObjectiveId: string;
  /**
   * true면 수락·지급·공개 효과마다 시스템 줄을 자동으로 남긴다.
   * 원고가 안내 줄을 직접 쓴 임무는 false(탐사 중 지급 예정·탐사 후 지급 줄은 항상 남긴다).
   */
  announceEffects: boolean;
}

const ISSUER_CONTACT_IDS: Record<string, string> = {
  "조 시설과장": "relief-contact",
  "최 사장": "market-contact",
  "윤 책임연구원": "lab-contact",
};

const ACCEPT_LABEL = "지급품 수령 및 임무 수락";
const REPORT_LABEL = "회수 기록 보고 · 보상 받기";

function briefingLines(seed: MissionSeed) {
  const body = seed.briefing.startsWith(`${seed.issuerName}:`)
    ? seed.briefing.slice(seed.issuerName.length + 1).trim()
    : seed.briefing;
  const sentences = body.match(/[^.?!]+[.?!]+/g)?.map((text) => text.trim()) ?? [body];
  return sentences.map((text) => ({ speaker: "issuer" as const, text }));
}

/** 기존 선형 임무를 대화 그래프로 옮긴다: 브리핑 → 수락 → 목표 대기 → 보고 → 완료. */
export function buildLinearMission(
  seed: MissionSeed,
  index: number,
  seeds: readonly MissionSeed[],
): MissionDefinition {
  const objectiveId = "default";
  const previous = index > 0 ? seeds[index - 1] : undefined;
  return {
    ...seed,
    act: Math.ceil(seed.tier / 2),
    issuerContactId: ISSUER_CONTACT_IDS[seed.issuerName] ?? "relief-contact",
    defaultObjectiveId: objectiveId,
    objectives: {
      [objectiveId]: {
        id: objectiveId,
        targetNodeId: seed.targetNodeId,
        targetLabel: seed.targetLabel,
        enemyArchetypeId: seed.enemyArchetypeId,
      },
    },
    unlock: previous
      ? { type: "QUEST_OUTCOME", questId: previous.id, outcome: "COMPLETE" }
      : { type: "ALL", of: [] },
    final: index === seeds.length - 1,
    announceEffects: true,
    dialogue: {
      entry: "offer",
      nodes: {
        offer: {
          id: "offer",
          kind: "CHOICE",
          lines: briefingLines(seed),
          choices: [
            {
              id: "accept",
              label: ACCEPT_LABEL,
              effects: [
                { type: "ACCEPT_OBJECTIVE", objectiveId },
                { type: "GRANT_ITEMS", items: seed.supplyItems },
              ],
              next: "await",
            },
          ],
        },
        await: {
          id: "await",
          kind: "AWAIT_OBJECTIVE",
          lines: [],
          next: "report",
        },
        report: {
          id: "report",
          kind: "CHOICE",
          availability: "BASE_ONLY",
          lines: [],
          choices: [
            {
              id: "report",
              label: REPORT_LABEL,
              effects: [
                { type: "GRANT_ITEMS", items: seed.rewardItems },
                { type: "GRANT_CREDITS", amount: seed.rewardCredits },
                { type: "RAISE_STORY_TIER", tier: seed.grantsStoryTier },
              ],
              next: "end",
            },
          ],
        },
        end: { id: "end", kind: "END", lines: [], outcome: "COMPLETE" },
      },
    },
  };
}

/** 원고(docs/quest-story-dialogue.md)가 있는 임무는 원고의 대화·목표·해금 조건을 쓴다. */
function applyManuscript(
  mission: MissionDefinition,
  manuscript: ManuscriptMission | undefined,
): MissionDefinition {
  if (!manuscript) return mission;
  const defaultObjectiveId = Object.keys(manuscript.objectives)[0]!;
  return {
    ...mission,
    act: manuscript.act,
    issuerContactId: manuscript.issuerContactId,
    unlock: manuscript.unlock,
    objectives: manuscript.objectives,
    defaultObjectiveId,
    dialogue: manuscript.dialogue,
    announceEffects: false,
  };
}

const MANUSCRIPT_BY_ID = new Map(
  STORY_MANUSCRIPT_MISSIONS.map((mission) => [mission.id, mission]),
);

export const MISSION_CHAIN: readonly MissionDefinition[] = MISSION_SEEDS.map(
  (seed, index, seeds) =>
    applyManuscript(buildLinearMission(seed, index, seeds), MANUSCRIPT_BY_ID.get(seed.id)),
);

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
    id: "ration-discrepancy-log",
    minimumTier: 2,
    title: "배급 단말기 재고 대조표",
    content:
      "상가 무인 배급창구에서 회수한 출고 기록을 대조한 결과, 거점에 등록된 인원 수보다 실제 배급 수령 건수가 매일 일정 비율만큼 초과 집계되고 있다. 일부 수령 서명은 이미 귀환 보고를 마친 인원과 같은 날짜로 찍혀 있다.",
  },
  {
    id: "medical-transfer-manifest",
    minimumTier: 3,
    title: "비표준 생체 이관 내역",
    content:
      "남부 응급 병동의 구호 환자 이송 명단 일부가 일반 치료 시설이 아닌 기업 연구동 격리 구역으로 분류되어 있었다. 분류 사유란에는 '비표준 생체 파형 - 대조 표본 지정'이라는 짧은 문구만 남아 있다.",
  },
  {
    id: "single-executive-directive",
    minimumTier: 4,
    title: "단일 결재선과 봉쇄 지시서",
    content:
      "물류 봉쇄선에서 회수한 적하목록과 격리 명령서는 모두 기업의 단일 경영 책임자 명의로 직접 결재되어 있었다. 구호 물자 배정과 통제 구역 봉쇄가 서로 다른 부서의 충돌이 아니라, 동일한 최상위 지휘 계통에서 동시에 내려오고 있다.",
  },
  {
    id: "duplicate-gate-alarm",
    minimumTier: 5,
    title: "중복 통행 경보 이력",
    content:
      "물류단지 외곽 검문소의 출입 로그에 동일한 생체 인식 번호를 가진 인원이 같은 시각 다른 구획에서 동시에 통과한 기록이 남아 있다. 시스템은 매뉴얼에 따라 후순위 기록을 자동으로 '미등록 개체 오류'로 덮어쓰고 있었다.",
  },
  {
    id: "divergent-owner-audit",
    minimumTier: 6,
    title: "중첩 개체 대조 보고서",
    content:
      "중앙 전력 변전소 관측 로그와 결재 생체 서명을 대조한 결과, 동일한 경영 책임자의 서명이 서로 다른 구획에서 동시각에 승인된 흔적이 확인되었다. 유전자 염기 미세 편차 분석에 따라 두 지시는 서로 다른 세계선에서 유입된 별도 개체가 발행한 것으로 판별된다.",
  },
  // 6차 결말 기록: 공개 단계가 아니라 최종 보고 선택(DISCLOSE)으로만 공개한다.
  {
    id: "ending-jo-protocol",
    minimumTier: 6,
    revealByTier: false,
    title: "구호 통제망 특별 보안 인가서",
    content:
      "변전소 관측 드라이브는 거점 운영부 보안 금고에 봉인되었다. 상부 결재선의 분열로 인한 혼란을 막기 위해 현장 운영부는 자율 통제 등급을 격상했으며, 보고자는 거점 특별 보안 인력으로 편입되어 정기 동력 보급 권한을 부여받았다.",
  },
  {
    id: "ending-yun-divergence",
    minimumTier: 6,
    revealByTier: false,
    title: "비공식 중첩 파형 대조 초안",
    content:
      "변전소 관리자 인증 키를 확보한 연구실은 본사 관측망의 역추적 채널을 개설했다. 복수의 경영 책임자 개체가 서로 다른 실험 지시를 내리는 틈을 이용해, 생존자를 단순 표본에서 벗어나 중첩 경계를 추적하는 독자 관측 주체로 전환하는 연구가 시작되었다.",
  },
  {
    id: "ending-choi-arbitrage",
    minimumTier: 6,
    revealByTier: false,
    title: "이중 결재선 차익 통행권",
    content:
      "두 명의 경영 책임자가 각기 발주하는 중복 결재 코드가 거점 거래소의 비공식 물류망에 연동되었다. 본사 지휘 계통의 상호 간섭으로 감시 사각지대가 넓어진 사이, 봉쇄선을 넘나드는 독립 보급 루트가 거점 생존자들의 새로운 생명선으로 자리 잡았다.",
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
    minimumTier: 4,
    publicId: "executive-contact",
    publicName: "기업 경영 책임자",
    role: "경영 지시",
    affiliation: "기업 본사",
    entityId: "owner-instance-a",
  },
  {
    minimumTier: 6,
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
      .filter((record) => tier >= record.minimumTier && !("revealByTier" in record && record.revealByTier === false))
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
        ...(tier >= 6 && "entityId" in contact
          ? { entityId: contact.entityId }
          : {}),
      })),
  };
}

export interface StoryContact {
  id: string;
  name: string;
  role: string;
  affiliation: string;
  minimumTier: number;
  entityId?: string;
}

export function getStoryContactById(contactId: string): StoryContact | undefined {
  const contact = contacts.find((item) => item.publicId === contactId);
  if (!contact) return undefined;
  return {
    id: contact.publicId,
    name: contact.publicName,
    role: contact.role,
    affiliation: contact.affiliation,
    minimumTier: contact.minimumTier,
    ...("entityId" in contact ? { entityId: contact.entityId } : {}),
  };
}

export function getStoryRecordById(recordId: string) {
  return records.find((record) => record.id === recordId);
}

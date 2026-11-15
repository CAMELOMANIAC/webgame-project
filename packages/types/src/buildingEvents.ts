import type { WeaponTag } from "./index";
import { getCatalogItemById } from "./itemCatalog";
import type {
  BuildingCategory,
  DistrictKind,
  MapBuilding,
  MapDistrict,
} from "./world";

export type NormalBuildingImageKey =
  | "apartment"
  | "villa"
  | "luxury_house"
  | "commercial_street"
  | "office_building"
  | "factory"
  | "warehouse"
  | "lab_building"
  | "utility_facility";

export interface BuildingEventOutcome {
  text: string;
  timeCostMinutes?: number;
  hpDelta?: number;
  staminaDelta?: number;
  rewardItemIds?: readonly string[];
  /** 선택적 성공 확률 (0~1). 미지정 시 확정 또는 이전 분기 실패 fallback */
  chance?: number;
}

export interface BuildingEventChoiceCondition {
  requireTag?: WeaponTag;
  requireItemId?: string;
  requireAnyItemIds?: readonly string[];
  consumeItemId?: string;
  label: string;
}

export interface BuildingEventChoice {
  id: string;
  label: string;
  action: "SEARCH" | "CRAFT" | "LEAVE" | "EVENT_CHOICE";
  timeCostMinutes?: number;
  condition?: BuildingEventChoiceCondition;
  outcomes?: readonly BuildingEventOutcome[];
}

export interface BuildingEventDefinition {
  id: string;
  title?: string;
  introText: string;
  imageKey?: NormalBuildingImageKey;
  searchLabel?: string;
  encounterRate?: number;
  oncePerRaid?: boolean;
  choices?: readonly BuildingEventChoice[];
}

export interface StoryBuildingEventDefinition extends BuildingEventDefinition {
  districtKind: DistrictKind;
  imageKey: NormalBuildingImageKey;
}

/**
 * 선택지 조건(보유 태그 또는 특정 아이템)을 충족하는지 판정합니다.
 */
export function hasBuildingChoiceCondition(
  choice: Pick<BuildingEventChoice, "condition">,
  ownedItemIds: readonly string[],
): boolean {
  const cond = choice.condition;
  if (!cond) return true;
  if (cond.requireItemId && ownedItemIds.includes(cond.requireItemId)) {
    return true;
  }
  if (
    cond.requireAnyItemIds?.some((itemId) => ownedItemIds.includes(itemId))
  ) {
    return true;
  }
  if (cond.requireTag) {
    const targetTag = cond.requireTag;
    return ownedItemIds.some((id) =>
      getCatalogItemById(id)?.tags.includes(targetTag),
    );
  }
  return false;
}

/**
 * 1순위: 특정 랜드마크 건물 ID별 고유 이벤트.
 * 추후 특정 건물 전용 이벤트나 퀘스트 연동을 추가할 때 이 테이블에 등록합니다.
 */
export const BUILDING_EVENTS_BY_ID: Record<number, BuildingEventDefinition> = {};

/**
 * 2순위: 건물 카테고리(이미지 유형)별 기본 이벤트.
 */
export const BUILDING_EVENTS_BY_CATEGORY: Record<
  BuildingCategory,
  BuildingEventDefinition
> = {
  COMMERCIAL: {
    id: "category-commercial",
    introText:
      "반쯤 비워진 진열대와 셔터 내려진 창고 통로가 보입니다. 내부 정비 설비를 이용해 무기를 업그레이드할 수 있습니다.",
  },
  PUBLIC: {
    id: "category-public",
    introText:
      "출동 차고와 장비 보관실 문이 열려 있습니다. 내부 공용 작업대에서 무기를 정비·업그레이드할 수 있습니다.",
  },
  MEDICAL: {
    id: "category-medical",
    introText:
      "응급실 접수대 너머로 의약품 상자와 의료 장비 작업대가 남아 있습니다. 설비를 활용해 무기를 업그레이드할 수 있습니다.",
  },
  LOGISTICS: {
    id: "category-logistics",
    introText:
      "하역장 도크마다 컨테이너 봉인이 뜯겨 있습니다. 적재 구역 공구대를 사용해 무기를 업그레이드할 수 있습니다.",
  },
  INFRA: {
    id: "category-infra",
    introText:
      "비상 발전기에서 낮은 웅웅거림이 들립니다. 제어실 계기판과 정밀 공구함으로 무기를 업그레이드할 수 있습니다.",
  },
  CULTURAL: {
    id: "category-cultural",
    introText:
      "넓은 로비 유리창 너머로 대피 당시 남겨진 임시 작업 공간이 보입니다. 현장 공구로 무기를 업그레이드할 수 있습니다.",
  },
};

export const STORY_BUILDING_EVENTS: readonly StoryBuildingEventDefinition[] = [
  {
    id: "story-evacuation-echo",
    title: "대피선 너머의 잔향",
    districtKind: "RESIDENTIAL",
    imageKey: "villa",
    oncePerRaid: true,
    introText:
      "비상등이 깜빡이는 빌라 계단실 끝에, 기업 구호 방호복을 입은 인물이 벽에 기대어 쓰러져 있습니다. 가슴 주머니의 무전기에서는 '중복 생체 신호 감지'라는 기계음이 3초마다 반복되고, 바닥의 배낭 인식표에는 오늘 발급받은 것과 동일한 식별 번호가 각인되어 있습니다. 위층 복도에서는 무언가 바닥에 끌리는 둔탁한 소리가 멎지 않습니다.",
    choices: [
      {
        id: "search-pack",
        label: "위층 소음을 무시하고 쓰러진 인물의 배낭을 수색한다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 10,
        outcomes: [
          {
            chance: 0.65,
            text: "굳어버린 배낭 지퍼를 힘으로 뜯어내자 밀봉 상태의 구호 부품과 보급품이 나왔습니다. 시신의 손목 단말기는 전원이 꺼지기 직전까지 복귀 거점 좌표를 계속 갱신하고 있었습니다.",
            timeCostMinutes: 10,
            rewardItemIds: ["mat-wire", "mat-tape", "mat-electrolyte"],
          },
          {
            text: "버클을 당기는 순간 방호복 어깨의 무단 회수 차단 장치가 작동해 손목을 감전시켰습니다. 고음의 경보와 함께 위층 방화문이 열리고 발소리가 내려오기 시작해, 1층 창문을 넘어 빈손으로 빠져나왔습니다.",
            timeCostMinutes: 15,
            hpDelta: -12,
          },
        ],
      },
      {
        id: "bypass-stairs",
        label: "손대지 않고 계단 반대편 비상구로 조용히 우회한다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 5,
        outcomes: [
          {
            text: "무전기 경고음을 등진 채 비상구 외벽을 따라 빠르게 빠져나왔습니다. 위층의 끌리는 소리는 곧 멎었고, 안전한 구석에서 잠시 호흡을 가다듬었습니다. 손목 단말기에는 '미확인 개체 접촉 회피' 기록이 남았습니다.",
            timeCostMinutes: 5,
            staminaDelta: 8,
          },
        ],
      },
      {
        id: "medical-port",
        label: "방호복 의료 포트를 연결해 생체 서명을 확인한다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 5,
        condition: {
          requireTag: "BIO",
          label: "생체 계열 장비 / 전해질 팩",
        },
        outcomes: [
          {
            text: "의료 포트를 연결하자 방호복 단말기가 '생체 서명 일치'를 띄우며 보안 잠금을 해제했습니다. 인물의 맥박은 이미 멎어 있었지만 무전기 경보가 꺼지며 특수 수납함이 조용히 열렸고, 안에는 온전한 부품들과 오늘 날짜가 찍힌 구역 이동 허가서가 들어 있었습니다.",
            timeCostMinutes: 5,
            rewardItemIds: ["mat-tape", "mat-wire", "mat-battery"],
          },
        ],
      },
    ],
  },
  {
    id: "story-checkpoint-protocol",
    title: "매뉴얼대로 움직이는 통제선",
    districtKind: "INDUSTRIAL",
    imageKey: "warehouse",
    oncePerRaid: true,
    introText:
      "물류단지 진입로를 가로막은 컨테이너 바리케이드 너머에서 손전등 불빛 두 줄기가 도로를 훑고 있습니다. 회수 부서 완장을 찬 인원 둘이 방호복 위에 기동 조끼를 걸친 채 통행 서류를 점검할 태세로 서 있습니다. 간이 테이블 위 무전기에서는 인근 블록의 수색 보고가 끊이지 않고, 천막 안쪽 철제 선반에는 봉인이 뜯기지 않은 보급 상자 몇 개가 쌓여 있습니다.",
    choices: [
      {
        id: "distract-checkpoint",
        label:
          "바리케이드 반대편에 소음을 내어 인원을 유인한 뒤 보급 상자를 챙긴다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 10,
        outcomes: [
          {
            chance: 0.55,
            text: "컨테이너 뒤편에서 쇠파이프 구르는 소리가 나자 두 인원이 일제히 손전등을 돌렸습니다. 그 틈에 천막 선반에서 가장 가벼운 상자 하나를 끌어안고 화물차 아래로 빠져나왔습니다. 뒤늦게 고함이 들렸지만 추격은 이어지지 않았습니다.",
            timeCostMinutes: 10,
            rewardItemIds: ["mat-titanium", "mat-fuel"],
          },
          {
            text: "철제 상자를 들어 올리는 순간 바닥의 공구함이 넘어지며 쇳소리가 울렸습니다. 돌아선 인원이 경고 없이 쏜 진압탄이 허벅지를 강타했고, 상자를 버린 채 컨테이너 틈으로 굴러 빠져나왔습니다.",
            timeCostMinutes: 15,
            hpDelta: -15,
            staminaDelta: -10,
          },
        ],
      },
      {
        id: "bypass-drain",
        label: "불빛에 닿기 전에 몸을 낮춰 외곽 배수로로 조용히 돌아 나간다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 5,
        outcomes: [
          {
            text: "어두운 배수로를 따라 조용히 기어가 검문선을 벗어났습니다. 무전 소리도 불빛도 더는 따라오지 않아, 잠시 숨을 고른 뒤 다음 경로로 이동했습니다.",
            timeCostMinutes: 5,
            staminaDelta: 4,
          },
        ],
      },
      {
        id: "present-clearance",
        label: "불빛 앞으로 나가 발급 표식을 제시하고 정식 통과를 요구한다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 0,
        condition: {
          requireTag: "ARMOR",
          label: "방호 계열 장비 보유",
        },
        outcomes: [
          {
            text: "빛 아래로 걸어 나가 표식을 내밀자 인원이 서류철과 단말기를 번갈아 대조한 뒤 바리케이드 틈을 열어 주었습니다. 지나가는 길목에서 검문소가 떼어 놓은 예비 물자 일부까지 덤으로 건네받았습니다.",
            timeCostMinutes: 0,
            rewardItemIds: ["mat-fuel", "mat-tape"],
          },
        ],
      },
    ],
  },
  {
    id: "story-open-dispenser",
    title: "닫히지 않은 무인 배급창구",
    districtKind: "COMMERCIAL",
    imageKey: "commercial_street",
    oncePerRaid: true,
    introText:
      "반쯤 내려간 상가 셔터 아래로, 기업 무인 배급 단말기의 파란 안내등이 일정한 주기로 점멸하고 있습니다. 화면에는 '금일 긴급 배급 가능'이라는 문구가 떠 있지만, 금속 투입구 틈새에는 골절된 채 말라붙은 사람의 손목이 셔터 날에 끼어 있습니다. 안쪽 수납 칸에서는 냉각팬 돌아가는 소리와 함께 밀봉된 보급 상자 여러 개가 보입니다.",
    choices: [
      {
        id: "pry-dispenser",
        label:
          "셔터 틈을 비집고 들어가 단말기 뒤쪽 유지보수 덮개를 강제로 뜯어낸다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 10,
        outcomes: [
          {
            chance: 0.6,
            text: "녹슨 나사를 꺾고 후면 패널을 젖히자 비상 수동 개방 레버가 그대로 드러났습니다. 레버를 당기자 하단 덮개가 열리며 미지급 상태이던 전자 부품과 예비 전지가 쏟아져 나왔습니다.",
            timeCostMinutes: 10,
            rewardItemIds: ["mat-battery", "mat-relay", "mat-ceramic"],
          },
          {
            text: "덮개를 젖히는 순간 무단 파손 방지 회로가 작동해 고압 방전과 함께 강철 셔터를 끝까지 내려버렸습니다. 손등을 찢기며 팔을 빼낸 직후, 상가 천장 확성기에서 10초간 시설 파손 경보음이 울려 퍼졌습니다.",
            timeCostMinutes: 15,
            hpDelta: -14,
          },
        ],
      },
      {
        id: "pass-shutter",
        label: "생체 패드에 손을 대지 않고 상가 앞을 조용히 지나친다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 5,
        outcomes: [
          {
            text: "냉각팬 소리와 붉은 센서 불빛을 등진 채 셔터 앞을 조용히 지나쳤습니다. 불필요한 경보도 부상도 피한 채 잠시 호흡을 가다듬고 다음 골목으로 이동했습니다.",
            timeCostMinutes: 5,
            staminaDelta: 6,
          },
        ],
      },
      {
        id: "bypass-wiring",
        label:
          "단말기 하단 점검 포트를 열어 배선을 우회 연결하고 배급을 실행한다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 5,
        condition: {
          requireTag: "TECH",
          label: "기술 계열 장비 / 구리 배선 보유",
        },
        outcomes: [
          {
            text: "하단 점검 덮개를 열고 센서 신호선을 단락시키자 단말기가 정상 인증으로 오인해 내부 잠금을 순차적으로 해제했습니다. 아래쪽 예비 배출구로 밀봉된 상자 두 개가 밀려 나오며 화면에 '정상 수령 완료 — 시민 협조에 감사드립니다'라는 문구가 출력됩니다.",
            timeCostMinutes: 5,
            rewardItemIds: ["mat-battery", "mat-lens", "mat-relay"],
          },
        ],
      },
    ],
  },
  {
    id: "story-quarantine-ward",
    title: "격리실 너머의 생존자",
    districtKind: "MEDICAL",
    imageKey: "lab_building",
    oncePerRaid: true,
    introText:
      "남부 응급의료단지 폐쇄 병동 끝, 두꺼운 강화 유리 격리실 안에서 병원복 차림의 여성이 유리창을 두드리고 있습니다. 벽면 인터폰에서는 문을 열어 달라는 목소리가 흘러나오지만, 유리 너머 여성의 입술은 소리보다 반 박자 늦게 움직입니다. 문 옆의 기업 의료 단말기에는 '비표준 생체 파형 — 회수 대기'라는 붉은 문구와 함께 수동 잠금이 걸려 있고, 격리실 안쪽 약품 카트 위에는 밀봉된 주사기와 응급 약품 상자가 놓여 있습니다.",
    choices: [
      {
        id: "unlock-quarantine",
        label: "단말기의 수동 잠금장치를 강제로 해제해 격리실 문을 연다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 10,
        outcomes: [
          {
            chance: 0.5,
            text: "잠금 볼트가 풀리자 여성이 문틈으로 뛰쳐나와 뒤도 돌아보지 않고 복도 반대편 비상 계단으로 사라졌습니다. 열린 격리실 안쪽 약품 카트에는 미처 챙겨 가지 못한 의료 물자들이 그대로 남아 있었습니다.",
            timeCostMinutes: 10,
            rewardItemIds: ["mat-biogel", "mat-stimulant"],
          },
          {
            text: "문이 열리자마자 천장에서 고농도 방역 기체와 경보가 쏟아져 시야를 가렸습니다. 공황에 빠진 여성이 당신을 기업 회수 인력으로 오인해 금속 트레이를 휘두른 뒤 어둠 속으로 달아났습니다.",
            timeCostMinutes: 15,
            hpDelta: -16,
          },
        ],
      },
      {
        id: "mute-intercom",
        label: "잠금장치를 건드리지 않고 인터폰 전원을 내린 뒤 복도를 빠져나간다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 5,
        outcomes: [
          {
            text: "인터폰 스위치를 내리자 유리창을 두드리는 둔탁한 진동만 복도에 남았습니다. 외곽 병동으로 조용히 돌아 나온 뒤 호흡을 가다듬었고, 손목 단말기에는 '격리 구역 이상 없음' 기록이 남았습니다.",
            timeCostMinutes: 5,
            staminaDelta: 5,
          },
        ],
      },
      {
        id: "shielded-rescue",
        label:
          "방호 장비로 호흡기를 가린 뒤 방역 경보를 버텨내며 문을 열어 여성을 끌어낸다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 5,
        condition: {
          requireTag: "ARMOR",
          requireItemId: "mat-ceramic",
          label: "방호 계열 장비 / 방열 세라믹 판 보유",
        },
        outcomes: [
          {
            text: "문이 열리며 독한 소독 연무가 쏟아졌지만 시야와 호흡을 잃지 않고 여성을 복도 밖으로 이끌어 냈습니다. 그녀는 거친 숨을 고른 뒤 약품 카트에서 쥐고 나온 의료 상자를 건네고 비상구로 사라졌습니다. 단말기에는 '회수 대상 유실 — 소독 완료'라는 한 줄이 기록됩니다.",
            timeCostMinutes: 5,
            rewardItemIds: ["mat-biogel", "mat-anticoagulant", "mat-stimulant"],
          },
        ],
      },
    ],
  },
  {
    id: "story-anomalous-broadcast",
    title: "어긋난 시각의 비상 방송",
    districtKind: "INFRA",
    imageKey: "utility_facility",
    oncePerRaid: true,
    introText:
      "중앙 변전·통신단지 지하 중계실, 주전원 차단기가 내려가 있는데도 구석의 기업 통신 랙에서 낮은 웅웅거림이 새어 나옵니다. 스피커에서는 사흘 뒤 날짜가 찍힌 도시 대피 안내 방송과 함께 방금 전 당신이 지나온 골목의 소음이 뒤섞여 흘러나옵니다. 반쯤 뜯긴 랙 안쪽 배전반 위에는 열기가 식지 않은 예비 부품이 놓여 있고, 천장 덕트 사이로 간헐적인 청백색 스파크가 튑니다.",
    choices: [
      {
        id: "strip-rack",
        label:
          "스파크가 멎은 틈을 노려 전원이 들어온 통신 랙 내부 부품을 급히 떼어낸다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 10,
        outcomes: [
          {
            chance: 0.55,
            text: "절연 장갑 위로 미세한 정전기가 스쳤지만 합선을 일으키지 않고 동력 부품들을 분리해 냈습니다. 부품을 뽑아내자 사흘 뒤 날짜의 안내 방송은 즉시 끊기고 중계실에는 빗물 떨어지는 소리만 남았습니다.",
            timeCostMinutes: 10,
            rewardItemIds: ["mat-relay", "mat-solenoid", "mat-battery"],
          },
          {
            text: "릴레이 모듈을 당기는 순간 배전반 상단에서 굵은 아크 방전이 터지며 손끝과 팔을 때렸습니다. 동시에 천장 모서리의 기업 감시 카메라가 경보음을 울리기 시작해 부품을 포기하고 계단 위로 뛰어올랐습니다.",
            timeCostMinutes: 15,
            hpDelta: -15,
            staminaDelta: -10,
          },
        ],
      },
      {
        id: "exit-utility-stairs",
        label: "통신 랙에 손을 대지 않고 비상 통로를 따라 단지 밖으로 빠져나간다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 5,
        outcomes: [
          {
            text: "잡음 섞인 안내 방송을 등진 채 젖은 콘크리트 복도를 따라 밖으로 빠져나왔습니다. 감전 위험과 감시망 추적을 모두 피한 채 잠시 호흡을 고르고 이동했습니다.",
            timeCostMinutes: 5,
            staminaDelta: 5,
          },
        ],
      },
      {
        id: "shunt-relay",
        label:
          "보유한 부품을 임시 우회 단자에 물려 전류를 분산시킨 뒤 과부하 없이 수거한다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 5,
        condition: {
          requireAnyItemIds: ["mat-battery", "mat-relay"],
          label: "리튬 배터리 또는 고속 릴레이 칩 보유",
        },
        outcomes: [
          {
            text: "우회 단자에 부품을 물리자 스파크가 멎고 랙 상단 패널이 정상 점검 모드로 전환됩니다. 경보나 감전 없이 배전반의 고출력 부품을 모두 분리해 냈으며, 출력창에 남아 있던 인근 순찰 경로 기록까지 확인했습니다. 단말기 화면에는 '정기 점검 완료 — 도시 기간망 정상'이라는 문구가 떠오릅니다.",
            timeCostMinutes: 5,
            rewardItemIds: ["mat-solenoid", "mat-battery", "mat-relay"],
          },
        ],
      },
    ],
  },
];

/**
 * 3순위: 일반 건물(카테고리/이미지 미지정)용 구역 성격별 이벤트 풀.
 */
export const DISTRICT_BUILDING_EVENT_POOL: Record<
  DistrictKind,
  readonly BuildingEventDefinition[]
> = {
  RESIDENTIAL: [
    {
      id: "district-residential-villa",
      imageKey: "villa",
      introText:
        "필로티 주차장 안쪽으로 다세대 빌라 현관이 반쯤 열려 있습니다. 계단실과 내부 수납공간에 남겨진 물자를 탐색할 수 있습니다.",
    },
    {
      id: "district-residential-apartment",
      imageKey: "apartment",
      introText:
        "아파트 단지 동 현관과 경비실 문이 열려 있습니다. 우편함과 복도 주변에 남겨진 물자를 탐색할 수 있습니다.",
    },
    {
      id: "district-residential-luxury",
      imageKey: "luxury_house",
      introText:
        "담장과 차고 셔터가 내려진 단독주택입니다. 정원과 거실 안쪽에 쓸 만한 자재가 남아 있을지도 모릅니다.",
    },
  ],
  COMMERCIAL: [
    {
      id: "district-commercial-street",
      imageKey: "commercial_street",
      introText:
        "편의점과 상가 간판이 늘어선 골목 점포입니다. 계산대 뒤편과 창고를 탐색해볼 수 있습니다.",
    },
    {
      id: "district-commercial-office",
      imageKey: "office_building",
      introText:
        "유리 외벽의 도심 오피스 건물입니다. 로비 안내데스크와 사무실 캐비닛 사이에 챙길 만한 것이 보입니다.",
    },
  ],
  INDUSTRIAL: [
    {
      id: "district-industrial-factory",
      imageKey: "factory",
      introText:
        "기름 냄새가 감도는 공업사 작업장입니다. 철제 선반과 공구 캐비닛을 열어 부품을 탐색할 수 있습니다.",
    },
    {
      id: "district-industrial-warehouse",
      imageKey: "warehouse",
      introText:
        "자재 팔레트와 화물 컨테이너가 쌓인 물류 창고입니다. 아직 온전한 부품을 건질 수 있어 보입니다.",
    },
  ],
  MEDICAL: [
    {
      id: "district-medical-lab",
      imageKey: "lab_building",
      introText:
        "바이오 연구동 부속 시설입니다. 실험실 진열장과 보관함 안쪽에 남은 물자를 탐색할 수 있습니다.",
    },
  ],
  INFRA: [
    {
      id: "district-infra-utility",
      imageKey: "utility_facility",
      introText:
        "기계설비와 통신 중계탑이 있는 관리동입니다. 예비 부품함에서 쓸 만한 자재를 탐색할 수 있습니다.",
    },
  ],
};

const DEFAULT_BUILDING_EVENT: BuildingEventDefinition = {
  id: "default-building",
  introText:
    "방금 전까지 사람이 있었던 흔적이 보입니다. 아직 내부에 가치 있는 것들이 남아 있을지도 모릅니다.",
};

/**
 * 건물 ID → 건물 카테고리(이미지 유형) → 구역 성격 및 건물 높이 순으로 초기 건물 이벤트를 결정합니다.
 */
export function resolveBuildingIntroEvent(
  building: Pick<MapBuilding, "id" | "category"> & { height?: number },
  district?: Pick<MapDistrict, "kind">,
  completedEventIds: readonly string[] = [],
): BuildingEventDefinition {
  const byId = BUILDING_EVENTS_BY_ID[building.id];
  if (byId && (!byId.oncePerRaid || !completedEventIds.includes(byId.id))) {
    return byId;
  }

  if (building.category) {
    const byCategory = BUILDING_EVENTS_BY_CATEGORY[building.category];
    if (byCategory) return byCategory;
  }

  if (district) {
    const pool = DISTRICT_BUILDING_EVENT_POOL[district.kind];
    if (pool && pool.length > 0) {
      let baseEvent: BuildingEventDefinition;
      if (district.kind === "RESIDENTIAL" && building.height !== undefined) {
        if (building.height >= 32) {
          baseEvent =
            pool.find((e) => e.imageKey === "apartment") ??
            pool[0] ??
            DEFAULT_BUILDING_EVENT;
        } else if (building.height < 25) {
          baseEvent =
            pool.find((e) => e.imageKey === "luxury_house") ??
            pool[0] ??
            DEFAULT_BUILDING_EVENT;
        } else {
          baseEvent =
            pool.find((e) => e.imageKey === "villa") ??
            pool[0] ??
            DEFAULT_BUILDING_EVENT;
        }
      } else {
        baseEvent =
          pool[Math.abs(building.id) % pool.length] ?? DEFAULT_BUILDING_EVENT;
      }

      if (baseEvent.imageKey) {
        const storyEvent = STORY_BUILDING_EVENTS.find(
          (e) =>
            e.districtKind === district.kind &&
            e.imageKey === baseEvent.imageKey &&
            (!e.oncePerRaid || !completedEventIds.includes(e.id)),
        );
        if (storyEvent) return storyEvent;
      }
      return baseEvent;
    }
  }

  return DEFAULT_BUILDING_EVENT;
}

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
  fatigueDelta?: number;
  rewardItemIds?: readonly string[];
  /** 선택적 성공 확률 (0~1). 미지정 시 확정 또는 이전 분기 실패 fallback */
  chance?: number;
  /** 결과로 지정된 SF 적대 NPC 아키타입과 즉시 전투를 발생시킵니다. */
  encounterEnemyId?: string;
  /** 결과로 현재 구역·경과 시간에 맞는 SF 적대 NPC와 즉시 전투를 발생시킵니다. */
  triggerDistrictEncounter?: boolean;
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
  fatigueCost?: number;
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
      "깜빡이는 비상등 아래, 기업 구호 방호복을 입은 시신과 오늘 발급받은 것과 같은 번호의 배낭이 놓여 있습니다. 무전기의 '중복 생체 신호 감지' 경고음 너머로 위층에서 무언가 끌리는 소리가 멎지 않습니다.",
    choices: [
      {
        id: "search-pack",
        label: "위층 소음을 무시하고 쓰러진 인물의 배낭을 수색한다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 10,
        fatigueCost: 8,
        outcomes: [
          {
            chance: 0.65,
            text: "굳어버린 지퍼를 뜯어내자 밀봉된 구호 부품과 중장갑 포탑 코어가 쏟아집니다. 시신의 손목 단말기는 전원이 꺼지기 직전까지 복귀 좌표를 갱신하고 있었습니다.",
            timeCostMinutes: 10,
            rewardItemIds: [
              "mat-wire",
              "mat-tape",
              "mat-electrolyte",
              "eq-summon-turret",
            ],
          },
          {
            text: "버클을 당기자 방호복의 보안 경보가 울립니다. 위층 방화문이 열리며 물자를 노리던 무장 수집가가 계단을 뛰어내려옵니다.",
            timeCostMinutes: 15,
            encounterEnemyId: "npc-res-scavenger",
          },
        ],
      },
      {
        id: "bypass-stairs",
        label: "손대지 않고 계단 반대편 비상구로 조용히 우회한다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 5,
        fatigueCost: 0,
        outcomes: [
          {
            text: "경고음을 등진 채 비상구 외벽을 타고 빠르게 빠져나왔습니다. 단말기에는 '미확인 개체 접촉 회피' 기록 한 줄만 남습니다.",
            timeCostMinutes: 5,
            fatigueDelta: 8,
          },
        ],
      },
      {
        id: "medical-port",
        label: "방호복 의료 포트를 연결해 생체 서명을 확인한다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 5,
        fatigueCost: 4,
        condition: {
          requireTag: "BIO",
          label: "생체 계열 장비 / 전해질 팩",
        },
        outcomes: [
          {
            text: "단말기가 '생체 서명 일치'를 띄우며 경보 없이 특수 수납함을 열었습니다. 안에는 온전한 부품들과 자동 지혈 장비가 들어 있었습니다.",
            timeCostMinutes: 5,
            rewardItemIds: [
              "mat-tape",
              "mat-wire",
              "mat-battery",
              "eq-trauma-autoinjector",
            ],
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
      "물류단지 진입로 바리케이드 너머로 손전등 불빛 두 줄기가 도로를 훑고 있습니다. 회수 부서 완장을 찬 인원 둘이 수색 무전을 받으며 천막 앞 보급 상자를 지키고 있습니다.",
    choices: [
      {
        id: "distract-checkpoint",
        label:
          "바리케이드 반대편에 소음을 내어 인원을 유인한 뒤 보급 상자를 챙긴다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 10,
        fatigueCost: 8,
        outcomes: [
          {
            chance: 0.55,
            text: "반대편 쇳소리에 두 인원이 손전등을 돌린 사이, 천막 선반에서 가장 가벼운 상자를 끌어안고 화물차 아래로 빠져나왔습니다.",
            timeCostMinutes: 10,
            rewardItemIds: ["mat-titanium", "mat-fuel", "wpn_giant_slayer"],
          },
          {
            text: "상자를 들다 바닥의 공구함을 엎어 쇳소리가 울렸습니다. 돌아선 회수부서 진압조가 경고 없이 무기를 전개합니다.",
            timeCostMinutes: 15,
            encounterEnemyId: "npc-ind-enforcer",
          },
        ],
      },
      {
        id: "bypass-drain",
        label: "불빛에 닿기 전에 몸을 낮춰 외곽 배수로로 조용히 돌아 나간다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 5,
        fatigueCost: 0,
        outcomes: [
          {
            text: "어두운 배수로를 따라 기어가 검문선을 벗어났습니다. 무전 소리도 불빛도 더는 따라오지 않습니다.",
            timeCostMinutes: 5,
            fatigueDelta: 4,
          },
        ],
      },
      {
        id: "betray-survivors",
        label: "인근 건물에 숨은 생존자 위치를 무전으로 흘려 검문소를 비우게 한다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 5,
        fatigueCost: 0,
        outcomes: [
          {
            text: "미등록 인원 신고가 접수되자 두 인원이 즉시 골목으로 달려갑니다. 비워진 천막에서 고급 자재와 전투 식량을 챙겨 나왔습니다.",
            timeCostMinutes: 5,
            rewardItemIds: ["mat-titanium", "mat-fuel", "food-combat-ration"],
          },
        ],
      },
      {
        id: "present-clearance",
        label: "불빛 앞으로 나가 발급 표식을 제시하고 정식 통과를 요구한다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 0,
        fatigueCost: 4,
        condition: {
          requireTag: "ARMOR",
          label: "방호 계열 장비 보유",
        },
        outcomes: [
          {
            text: "표식을 대조한 인원이 투덜거리며 바리케이드 틈을 열었습니다. 길목에 떼어 놓은 예비 물자와 특수 도검까지 건네받았습니다.",
            timeCostMinutes: 0,
            rewardItemIds: ["mat-fuel", "mat-tape", "eq-mono-katana"],
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
      "반쯤 내려간 셔터 아래, '금일 긴급 배급 가능' 화면이 뜬 기업 단말기 투입구에 말라붙은 사람의 손목이 끼어 있습니다. 붉은 생체 인식 패드가 다음 사용자의 손바닥을 기다립니다.",
    choices: [
      {
        id: "pry-dispenser",
        label:
          "셔터 틈을 비집고 들어가 단말기 뒤쪽 유지보수 덮개를 강제로 뜯어낸다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 10,
        fatigueCost: 8,
        outcomes: [
          {
            chance: 0.6,
            text: "후면 패널을 젖히고 수동 레버를 당기자 미지급 전자 부품과 특수 연무 탄창이 쏟아져 나왔습니다.",
            timeCostMinutes: 10,
            rewardItemIds: [
              "mat-battery",
              "mat-relay",
              "mat-ceramic",
              "eq-chem-canister",
            ],
          },
          {
            text: "파손 방지 회로가 작동하며 상가 천장 확성기에서 경보가 울립니다. 소음을 듣고 골목 끝에서 기업 정찰 인력이 뛰어옵니다.",
            timeCostMinutes: 15,
            encounterEnemyId: "npc-com-scout",
          },
        ],
      },
      {
        id: "pass-shutter",
        label: "생체 패드에 손을 대지 않고 상가 앞을 조용히 지나친다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 5,
        fatigueCost: 0,
        outcomes: [
          {
            text: "냉각팬 소리와 붉은 센서 불빛을 등진 채 셔터 앞을 조용히 지나쳤습니다. 불필요한 경보 없이 다음 골목으로 이동했습니다.",
            timeCostMinutes: 5,
            fatigueDelta: 6,
          },
        ],
      },
      {
        id: "use-severed-hand",
        label: "투입구에 낀 손목 잔해의 지문을 생체 패드에 억지로 대어 배급을 뽑는다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 5,
        fatigueCost: 2,
        outcomes: [
          {
            text: "단말기가 '정상 수령 완료 — 시민 협조에 감사드립니다'를 띄우며 구급 키트와 전투 식량을 밀어 냈습니다. 화면은 곧바로 재고 소진으로 전환됩니다.",
            timeCostMinutes: 5,
            rewardItemIds: ["med-trauma-kit", "food-combat-ration", "mat-battery"],
          },
        ],
      },
      {
        id: "bypass-wiring",
        label:
          "단말기 하단 점검 포트를 열어 배선을 우회 연결하고 배급을 실행한다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 5,
        fatigueCost: 4,
        condition: {
          requireTag: "TECH",
          label: "기술 계열 장비 / 구리 배선 보유",
        },
        outcomes: [
          {
            text: "센서 신호선을 단락시키자 단말기가 잠금을 순차 해제하며 밀봉된 상자를 배출했습니다. 화면에는 '정상 수령 완료' 문구가 출력됩니다.",
            timeCostMinutes: 5,
            rewardItemIds: ["mat-battery", "mat-lens", "mat-relay", "wpn_sniper"],
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
      "폐쇄 병동 강화 유리 안에서 병원복 차림의 여성이 창을 두드리지만, 인터폰 음성은 입술보다 반 박자 늦게 들립니다. 기업 단말기에는 '비표준 생체 파형 — 회수 대기' 문구와 함께 수동 잠금이 걸려 있습니다.",
    choices: [
      {
        id: "unlock-quarantine",
        label: "단말기의 수동 잠금장치를 강제로 해제해 격리실 문을 연다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 10,
        fatigueCost: 10,
        outcomes: [
          {
            chance: 0.5,
            text: "잠금이 풀리자 여성이 문틈으로 뛰쳐나와 비상 계단으로 사라졌습니다. 빈 격리실 약품 카트에서 의료 물자를 챙겼습니다.",
            timeCostMinutes: 10,
            rewardItemIds: ["mat-biogel", "mat-stimulant", "eq-summon-swarm"],
          },
          {
            text: "문이 열리자 천장에서 방역 경보가 쏟아집니다. 복도 끝에서 달려온 방역 격리 요원이 즉시 생체 무장을 전개합니다.",
            timeCostMinutes: 15,
            encounterEnemyId: "npc-med-quarantine",
          },
        ],
      },
      {
        id: "mute-intercom",
        label: "잠금장치를 건드리지 않고 인터폰 전원을 내린 뒤 복도를 빠져나간다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 5,
        fatigueCost: 0,
        outcomes: [
          {
            text: "인터폰을 끄자 유리창을 두드리는 둔탁한 진동만 남았습니다. 단말기에는 '격리 구역 이상 없음' 기록이 갱신됩니다.",
            timeCostMinutes: 5,
            fatigueDelta: 5,
          },
        ],
      },
      {
        id: "execute-protocol",
        label: "기업 통제 프로토콜대로 회수 처리를 승인하고 보급품을 수령한다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 5,
        fatigueCost: 0,
        outcomes: [
          {
            text: "회수 승인을 누르자 격리실 천장에서 진정 가스가 분출되며 유리 너머 움직임이 멎습니다. 곧이어 하단 포상으로 고액의 기업 의료 보급품이 떨어졌습니다.",
            timeCostMinutes: 5,
            rewardItemIds: ["med-trauma-kit", "mat-nanosuture", "mat-core"],
          },
        ],
      },
      {
        id: "shielded-rescue",
        label:
          "방호 장비로 호흡기를 가린 뒤 방역 경보를 버텨내며 문을 열어 여성을 끌어낸다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 5,
        fatigueCost: 5,
        condition: {
          requireTag: "ARMOR",
          requireItemId: "mat-ceramic",
          label: "방호 계열 장비 / 방열 세라믹 판 보유",
        },
        outcomes: [
          {
            text: "소독 연무를 버텨내며 여성을 끌어내자, 그녀가 약품 카트에서 쥐고 나온 의료 상자와 장갑판을 건네고 비상구로 사라졌습니다.",
            timeCostMinutes: 5,
            rewardItemIds: [
              "mat-biogel",
              "mat-anticoagulant",
              "mat-stimulant",
              "eq-reactive-plate",
            ],
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
      "주전원이 꺼진 지하 중계실의 기업 통신 랙에서 사흘 뒤 날짜의 대피 방송이 흘러나옵니다. 스파크가 튀는 배전반 위에는 아직 식지 않은 예비 부품들이 놓여 있습니다.",
    choices: [
      {
        id: "strip-rack",
        label:
          "스파크가 멎은 틈을 노려 전원이 들어온 통신 랙 내부 부품을 급히 떼어낸다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 10,
        fatigueCost: 8,
        outcomes: [
          {
            chance: 0.55,
            text: "합선 없이 동력 부품과 정찰 드론 포트를 분리해 냈습니다. 부품을 뽑자 사흘 뒤 날짜의 안내 방송도 즉시 끊겼습니다.",
            timeCostMinutes: 10,
            rewardItemIds: [
              "mat-relay",
              "mat-solenoid",
              "mat-battery",
              "eq-summon-drone",
            ],
          },
          {
            text: "배전반 상단에서 아크 방전이 터지며 천장 감시 카메라가 경보를 울립니다. 계단 너머에서 중계실 드론 관제병이 드론을 전개하며 진입합니다.",
            timeCostMinutes: 15,
            encounterEnemyId: "npc-inf-drone-op",
          },
        ],
      },
      {
        id: "exit-utility-stairs",
        label: "통신 랙에 손을 대지 않고 비상 통로를 따라 단지 밖으로 빠져나간다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 5,
        fatigueCost: 0,
        outcomes: [
          {
            text: "잡음 섞인 안내 방송을 등진 채 젖은 콘크리트 복도를 따라 밖으로 빠져나왔습니다.",
            timeCostMinutes: 5,
            fatigueDelta: 5,
          },
        ],
      },
      {
        id: "shunt-relay",
        label:
          "보유한 부품을 임시 우회 단자에 물려 전류를 분산시킨 뒤 과부하 없이 수거한다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 5,
        fatigueCost: 4,
        condition: {
          requireAnyItemIds: ["mat-battery", "mat-relay"],
          label: "리튬 배터리 또는 고속 릴레이 칩 보유",
        },
        outcomes: [
          {
            text: "우회 단자에 부품을 물리자 스파크가 멎으며 랙이 점검 모드로 전환됩니다. 경보 없이 고출력 부품과 고압 전기파리채를 분리해 냈습니다.",
            timeCostMinutes: 5,
            rewardItemIds: [
              "mat-solenoid",
              "mat-battery",
              "mat-relay",
              "eq-arc-emitter",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "story-res-apartment-raider",
    title: "복도 끝의 무장 수집가",
    districtKind: "RESIDENTIAL",
    imageKey: "apartment",
    oncePerRaid: true,
    introText:
      "아파트 3층 엘리베이터 홀 앞, 사제 방호 조끼를 걸친 무소속 수집가가 비상 보급함을 뜯어내고 있습니다. 바닥에는 이미 분류된 전선과 식량 팩이 쌓여 있고, 그가 고개를 들어 이쪽을 발견하자마자 허리춤의 무기에 손을 얹습니다.",
    choices: [
      {
        id: "confront-raider",
        label: "물자를 뺏기지 않기 위해 정면으로 교전해 제압한다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 10,
        fatigueCost: 6,
        outcomes: [
          {
            text: "복도 기둥을 끼고 거리를 좁히며 무장 수집가와 정면으로 맞붙었습니다.",
            timeCostMinutes: 10,
            triggerDistrictEncounter: true,
            rewardItemIds: ["mat-wire", "mat-tape", "food-energy-bar"],
          },
        ],
      },
      {
        id: "retreat-stairwell",
        label: "교전을 피하고 계단실로 조용히 물러난다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 5,
        fatigueCost: 0,
        outcomes: [
          {
            text: "상대가 먼저 달려들기 전에 비상 계단 문을 닫고 건물 밖으로 빠져나왔습니다.",
            timeCostMinutes: 5,
            fatigueDelta: 4,
          },
        ],
      },
      {
        id: "intimidate-firearm",
        label: "화기를 겨누어 경고한 뒤 바닥의 예비 보급함만 챙겨 물러난다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 5,
        fatigueCost: 4,
        condition: {
          requireTag: "FIREARM",
          label: "총기 계열 장비 보유",
        },
        outcomes: [
          {
            text: "총구가 향하자 수집가가 욕설을 내뱉으며 복도 안쪽으로 물러섰습니다. 발치에 남겨진 보급 상자에서 부품과 응급 물자를 챙겨 나왔습니다.",
            timeCostMinutes: 5,
            rewardItemIds: ["mat-tape", "mat-electrolyte", "med-bandage"],
          },
        ],
      },
    ],
  },
  {
    id: "story-com-office-ambush",
    title: "로비 상층부의 저격수",
    districtKind: "COMMERCIAL",
    imageKey: "office_building",
    oncePerRaid: true,
    introText:
      "유리 로비 2층 난간 너머에서 광학 조준경의 희미한 반사광이 스쳤습니다. 상업지구를 점거한 무장 개체가 엘리베이터 앞 보급 케이스를 미끼로 삼아 진입자를 감시하고 있습니다.",
    choices: [
      {
        id: "rush-ambush",
        label: "엄폐물을 타고 2층으로 돌입해 매복자를 제압한다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 10,
        fatigueCost: 8,
        outcomes: [
          {
            text: "안내 데스크 뒤를 돌아 에스컬레이터로 뛰어오르자 상층부의 적대 개체가 즉시 응사해 왔습니다.",
            timeCostMinutes: 10,
            triggerDistrictEncounter: true,
            rewardItemIds: ["mat-lens", "mat-battery"],
          },
        ],
      },
      {
        id: "slip-side-door",
        label: "사각지대를 따라 측면 주차장 출구로 빠져나간다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 5,
        fatigueCost: 0,
        outcomes: [
          {
            text: "기둥 그림자에 몸을 숨긴 채 측면 비상구로 빠져나와 불필요한 교전을 피했습니다.",
            timeCostMinutes: 5,
            fatigueDelta: 4,
          },
        ],
      },
      {
        id: "jam-optics",
        label: "전자 간섭으로 조준 센서를 교란하고 로비 케이스를 회수한다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 5,
        fatigueCost: 4,
        condition: {
          requireTag: "TECH",
          label: "기술 계열 장비 보유",
        },
        outcomes: [
          {
            text: "강한 전자 잡음을 흘려보내자 2층의 광학 센서가 순간적으로 먹통이 되었습니다. 그 틈에 로비의 보급 케이스를 챙겨 빠져나왔습니다.",
            timeCostMinutes: 5,
            rewardItemIds: ["mat-lens", "mat-relay", "food-espresso-shot"],
          },
        ],
      },
    ],
  },
  {
    id: "story-ind-factory-sweep",
    title: "작업장 야간 사설 경비조",
    districtKind: "INDUSTRIAL",
    imageKey: "factory",
    oncePerRaid: true,
    introText:
      "공업사 내부 컨베이어 라인 사이로 과격 사설 경비조의 적외선 표식등이 움직이고 있습니다. 중앙 공구함 옆에는 중장비 부품 상자가 묶여 있지만, 경비조가 출입구 방향을 주시하고 있습니다.",
    choices: [
      {
        id: "engage-sweep",
        label: "선제 기습으로 경비조를 제압하고 부품 상자를 차지한다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 10,
        fatigueCost: 8,
        outcomes: [
          {
            text: "기계 설비 뒤에서 뛰쳐나가자 사설 경비조가 즉시 방호 태세를 갖추며 교전이 시작되었습니다.",
            timeCostMinutes: 10,
            triggerDistrictEncounter: true,
            rewardItemIds: ["mat-titanium", "mat-fuel"],
          },
        ],
      },
      {
        id: "wait-outside",
        label: "경비조와 마주치지 않고 환기구 통로로 물러난다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 5,
        fatigueCost: 0,
        outcomes: [
          {
            text: "적외선 불빛이 지나가기를 기다려 공장 외벽 통로로 조용히 빠져나왔습니다.",
            timeCostMinutes: 5,
            fatigueDelta: 5,
          },
        ],
      },
    ],
  },
  {
    id: "story-med-lab-containment",
    title: "연구동 격리 붕괴 구역",
    districtKind: "MEDICAL",
    imageKey: "lab_building",
    oncePerRaid: true,
    introText:
      "바이오 연구동 냉장 보관실 앞, 깨진 배양조 파편 사이로 비인가 생체실험의 흔적이 널브러져 있습니다. 붉은 경보등 아래에서 변질된 피험체가 생체 시료 캐리어를 껴안은 채 출입 센서 소리에 맞춰 고개를 꺾습니다.",
    choices: [
      {
        id: "fight-containment",
        label: "폭주한 실험체를 제압하고 밀봉된 생체 시료와 약품을 확보한다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 10,
        fatigueCost: 8,
        outcomes: [
          {
            text: "복도 조명이 붉게 점멸하며 격리에서 풀려난 실험체와의 근접 교전이 벌어졌습니다.",
            timeCostMinutes: 10,
            triggerDistrictEncounter: true,
            rewardItemIds: ["mat-biogel", "mat-nanosuture"],
          },
        ],
      },
      {
        id: "leave-lab",
        label: "교전을 피하고 외부 응급 통로로 이탈한다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 5,
        fatigueCost: 0,
        outcomes: [
          {
            text: "격리 셔터가 완전히 내려오기 전에 연구동 밖으로 빠르게 빠져나왔습니다.",
            timeCostMinutes: 5,
            fatigueDelta: 4,
          },
        ],
      },
    ],
  },
  {
    id: "story-inf-utility-drones",
    title: "중계실 보안 관제대",
    districtKind: "INFRA",
    imageKey: "utility_facility",
    oncePerRaid: true,
    introText:
      "통신 관리동 제어실 안에서 보안 관제병이 정찰 드론들을 재충전하고 있습니다. 벽면 예비 부품 선반에는 고출력 솔레노이드와 차폐 부품이 보이지만, 진입 즉시 드론 방어망이 반응할 태세입니다.",
    choices: [
      {
        id: "breach-control-room",
        label: "제어실에 돌입해 보안 관제병과 드론을 돌파한다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 10,
        fatigueCost: 8,
        outcomes: [
          {
            text: "방화문을 밀고 들어가자 경보와 함께 보안 관제병이 드론을 전개하며 공격해 왔습니다.",
            timeCostMinutes: 10,
            triggerDistrictEncounter: true,
            rewardItemIds: ["mat-solenoid", "mat-relay"],
          },
        ],
      },
      {
        id: "withdraw-utility",
        label: "드론 탐지 범위 밖으로 조용히 후퇴한다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 5,
        fatigueCost: 0,
        outcomes: [
          {
            text: "감지 센서를 피해 관리동 복도 밖으로 조용히 물러났습니다.",
            timeCostMinutes: 5,
            fatigueDelta: 4,
          },
        ],
      },
    ],
  },
  {
    id: "story-blackmarket-shutter",
    title: "셔터 안쪽의 암거래상",
    districtKind: "COMMERCIAL",
    imageKey: "commercial_street",
    oncePerRaid: true,
    introText:
      "지하 상가 반쯤 내린 셔터 아래로 랜턴 불빛과 탄내가 새어 나옵니다. 상표를 도려낸 기업 보급품을 늘어놓은 남자가 꺼져 가는 버너를 노려보고 있고, 셔터 옆에는 발목 높이의 낚싯줄이 묶여 있습니다.",
    choices: [
      {
        id: "raid-curtain-crate",
        label: "흥정하는 척 시선을 돌리고 커튼 뒤 부품 상자를 노린다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 10,
        fatigueCost: 8,
        outcomes: [
          {
            chance: 0.5,
            text: "남자가 반대편 소리에 고개를 돌린 사이 랜턴을 걷어차고 커튼 뒤 부품 상자만 낚아채 빠져나왔습니다.",
            timeCostMinutes: 10,
            rewardItemIds: ["mat-wire", "mat-titanium", "mat-electrolyte"],
          },
          {
            text: "발목의 낚싯줄이 당겨지며 셔터 경보가 울립니다. 커튼 뒤에서 대기하던 무장 경계 인원이 즉시 총구를 겨누며 뛰쳐나옵니다.",
            timeCostMinutes: 15,
            encounterEnemyId: "npc-com-scout",
          },
        ],
      },
      {
        id: "bypass-shutter",
        label: "거래에 응하지 않고 반대편 지상 출구로 우회한다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 10,
        fatigueCost: 0,
        outcomes: [
          {
            text: "투박한 목소리를 등진 채 상가 외곽으로 돌아 나왔습니다. 시간은 지체되었지만 불필요한 마찰은 피했습니다.",
            timeCostMinutes: 10,
          },
        ],
      },
      {
        id: "fuel-burner-trade",
        label: "꺼져 가는 휴대 버너의 점화와 연료를 보태고 물품 교환을 제안한다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 5,
        fatigueCost: 0,
        condition: {
          requireAnyItemIds: ["mat-lighter", "mat-fuel"],
          label: "휴대용 라이터 또는 특수 산업용 연료",
        },
        outcomes: [
          {
            text: "버너에 푸른 불꽃이 오르자 남자가 커튼 뒤 꾸러미와 데운 물 한 잔을 셔터 아래로 밀어 주었습니다.",
            timeCostMinutes: 5,
            hpDelta: 8,
            rewardItemIds: ["mat-biogel", "mat-tape"],
          },
        ],
      },
    ],
  },
  {
    id: "story-luxury-safe-vault",
    title: "잠긴 지하 서재의 방범 금고",
    districtKind: "RESIDENTIAL",
    imageKey: "luxury_house",
    oncePerRaid: true,
    introText:
      "고급 주택 지하 서재 벽면의 액자가 비뚤어져 있고, 그 뒤로 예비 전원이 들어온 전자식 방범 금고가 드러나 있습니다. 바닥에는 누군가 서둘러 짐을 싼 흔적과 함께 보안 패널이 반쯤 열려 있습니다.",
    choices: [
      {
        id: "force-safe-vault",
        label: "보안 패널 배선을 강제로 뜯어 금고 잠금을 해제한다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 10,
        fatigueCost: 8,
        outcomes: [
          {
            chance: 0.6,
            text: "단말기가 짧은 스파크를 튀기며 금고 볼트가 풀렸습니다. 안쪽에는 고급 광학 부품과 밀봉 비상 식량이 정리되어 있었습니다.",
            timeCostMinutes: 10,
            rewardItemIds: ["mat-lens", "mat-titanium", "food-combat-ration"],
          },
          {
            text: "강제 개방 경보가 울리자 구역을 순찰하던 자경단원이 지하 계단으로 들이닥쳤습니다.",
            timeCostMinutes: 15,
            encounterEnemyId: "npc-res-blade",
          },
        ],
      },
      {
        id: "rest-study-room",
        label: "금고는 건드리지 않고 서재에서 잠시 숨을 고른다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 5,
        fatigueCost: 0,
        outcomes: [
          {
            text: "조용한 지하 서재에서 잠시 호흡을 가다듬고 다음 이동 경로를 정리했습니다.",
            timeCostMinutes: 5,
            fatigueDelta: 6,
          },
        ],
      },
      {
        id: "bypass-vault-tech",
        label: "기계 장비로 보안 터미널의 예비 회로를 우회한다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 5,
        fatigueCost: 4,
        condition: {
          requireTag: "TECH",
          label: "기계 계열 장비",
        },
        outcomes: [
          {
            text: "경보 회로를 먼저 차단한 뒤 금고를 소리 없이 개방했습니다. 예비 배터리와 반응 장갑판까지 온전히 회수했습니다.",
            timeCostMinutes: 5,
            rewardItemIds: ["mat-battery", "mat-relay", "eq-reactive-plate"],
          },
        ],
      },
    ],
  },
  {
    id: "story-res-luxury-pantry",
    title: "대피 직전의 비상 저장실",
    districtKind: "RESIDENTIAL",
    imageKey: "luxury_house",
    oncePerRaid: true,
    introText:
      "주방 안쪽의 숨겨진 비상 저장실 문이 반쯤 열려 있습니다. 선반에는 대피 당시 챙기지 못한 보존 식량이 남아 있고, 한쪽 벽에는 강화 유리로 잠긴 가정용 응급 약품함이 걸려 있습니다.",
    choices: [
      {
        id: "collect-pantry-supplies",
        label: "열린 선반의 식량과 기본 구급품만 빠르게 챙긴다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 10,
        fatigueCost: 4,
        outcomes: [
          {
            text: "유통기한이 넉넉한 에너지 바와 이온 음료, 붕대를 배낭에 챙겼습니다.",
            timeCostMinutes: 10,
            rewardItemIds: ["food-energy-bar", "food-ion-drink", "med-bandage"],
          },
        ],
      },
      {
        id: "pry-glass-cabinet",
        label: "강화 유리 약품함을 억지로 비틀어 열어본다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 10,
        fatigueCost: 6,
        outcomes: [
          {
            chance: 0.65,
            text: "경첩이 부서지며 약품함이 열렸습니다. 외상 응급 키트와 멸균 생체 젤을 확보했습니다.",
            timeCostMinutes: 10,
            rewardItemIds: ["med-trauma-kit", "mat-biogel"],
          },
          {
            text: "강화 유리가 요란하게 깨지는 소리를 듣고 복도 밖을 배회하던 무장 수집가가 주방 안으로 들이닥쳤습니다.",
            timeCostMinutes: 15,
            encounterEnemyId: "npc-res-scavenger",
          },
        ],
      },
      {
        id: "smash-lock-blunt",
        label: "타격 장비로 약품함 잠금장치만 정확히 파쇄한다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 5,
        fatigueCost: 2,
        condition: {
          requireTag: "BLUNT",
          label: "타격 계열 장비",
        },
        outcomes: [
          {
            text: "잠금쇠만 깔끔하게 부수어 유리를 깨지 않고 외상 응급 키트와 전투 식량을 꺼냈습니다.",
            timeCostMinutes: 5,
            rewardItemIds: ["med-trauma-kit", "food-combat-ration"],
          },
        ],
      },
    ],
  },
  {
    id: "story-com-office-server",
    title: "비상 전원으로 버티는 오피스 전산실",
    districtKind: "COMMERCIAL",
    imageKey: "office_building",
    oncePerRaid: true,
    introText:
      "오피스 빌딩 3층 전산실은 UPS 비상 배터리 덕분에 아직도 낮은 팬 소음을 내며 가동 중입니다. 서버 랙 사이로 고출력 릴레이와 예비 셀이 반짝이고, 복도 끝 휴게실에는 전원이 꺼진 자판기가 서 있습니다.",
    choices: [
      {
        id: "strip-server-rack",
        label: "전원이 들어온 서버 랙에서 예비 부품을 직접 분리한다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 10,
        fatigueCost: 6,
        outcomes: [
          {
            chance: 0.6,
            text: "절연 피복만 조심스레 잡아당겨 릴레이와 배터리, 구리 배선을 회수했습니다.",
            timeCostMinutes: 10,
            rewardItemIds: ["mat-relay", "mat-battery", "mat-wire"],
          },
          {
            text: "단말기 랙에서 보안 경보가 울리며 로비 상층을 감시하던 기업 저격 인원이 계단으로 진입합니다.",
            timeCostMinutes: 15,
            encounterEnemyId: "npc-com-marksman",
          },
        ],
      },
      {
        id: "check-breakroom",
        label: "전산실은 피하고 휴게실 자판기에서 음료만 챙긴다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 5,
        fatigueCost: 0,
        outcomes: [
          {
            text: "자판기 하단 보관함에서 에스프레소 샷과 이온 음료를 건졌습니다.",
            timeCostMinutes: 5,
            rewardItemIds: ["food-espresso-shot", "food-ion-drink"],
          },
        ],
      },
      {
        id: "shutdown-rack-tech",
        label: "기계 장비로 UPS 차단 시퀀스를 실행한 뒤 부품을 분리한다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 5,
        fatigueCost: 4,
        condition: {
          requireTag: "TECH",
          label: "기계 계열 장비",
        },
        outcomes: [
          {
            text: "안전 차단 절차를 거쳐 솔레노이드 코일과 고효율 배터리, 릴레이를 손상 없이 회수했습니다.",
            timeCostMinutes: 5,
            rewardItemIds: ["mat-solenoid", "mat-battery", "mat-relay"],
          },
        ],
      },
    ],
  },
  {
    id: "story-ind-warehouse-crane",
    title: "천장 호이스트에 매달린 화물 팔레트",
    districtKind: "INDUSTRIAL",
    imageKey: "warehouse",
    oncePerRaid: true,
    introText:
      "물류 창고 중앙 천장 크레인에 공업용 자재 팔레트가 지상 3미터 높이로 멈춰 있습니다. 수동 윈치 레버가 기둥 옆에 남아 있지만 녹이 슬어 삐걱거리는 소리가 크게 날 것 같습니다.",
    choices: [
      {
        id: "lower-winch-pallet",
        label: "수동 윈치를 돌려 팔레트를 바닥으로 내린다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 10,
        fatigueCost: 8,
        outcomes: [
          {
            chance: 0.65,
            text: "천천히 팔레트를 내려 티타늄 프레임과 세라믹 판재, 산업용 연료를 확보했습니다.",
            timeCostMinutes: 10,
            rewardItemIds: ["mat-titanium", "mat-ceramic", "mat-fuel"],
          },
          {
            text: "녹슨 쇠사슬 소리가 창고 전체에 울려 퍼졌고, 인근을 점거하던 과격한 노조원들이 몰려들었습니다.",
            timeCostMinutes: 15,
            encounterEnemyId: "npc-ind-enforcer",
          },
        ],
      },
      {
        id: "gather-floor-parts",
        label: "윈치는 건드리지 않고 바닥에 떨어진 자재만 챙긴다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 5,
        fatigueCost: 0,
        outcomes: [
          {
            text: "소음을 내지 않고 팔레트 아래 흩어진 고강도 테이프와 구리 배선만 챙겨 나왔습니다.",
            timeCostMinutes: 5,
            rewardItemIds: ["mat-tape", "mat-wire"],
          },
        ],
      },
      {
        id: "cut-straps-blade",
        label: "도검 장비로 하단 결속 벨트만 절단해 가벼운 상자를 받아낸다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 5,
        fatigueCost: 4,
        condition: {
          requireTag: "BLADE",
          label: "도검 계열 장비",
        },
        outcomes: [
          {
            text: "결속 벨트를 조용히 끊어내어 소음 없이 고급 부품 상자만 안전하게 회수했습니다.",
            timeCostMinutes: 5,
            rewardItemIds: ["mat-titanium", "mat-ceramic", "mat-solenoid"],
          },
        ],
      },
    ],
  },
  {
    id: "story-ind-factory-furnace",
    title: "잔열이 남은 열처리 주조 라인",
    districtKind: "INDUSTRIAL",
    imageKey: "factory",
    oncePerRaid: true,
    introText:
      "가동이 중단된 지 오래된 공장 주조 라인이지만, 비상 보온로 안쪽에서는 아직도 희미한 열기가 뿜어져 나옵니다. 로 앞 철제 선반에는 열처리를 마친 특수 합금과 코어 부품 상자가 놓여 있습니다.",
    choices: [
      {
        id: "grab-furnace-crate",
        label: "작업용 집게로 선반 위 상자를 끌어낸다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 10,
        fatigueCost: 8,
        outcomes: [
          {
            chance: 0.6,
            text: "열기를 견디며 상자를 끌어내어 세라믹 판재와 산업용 연료, 고밀도 코어를 챙겼습니다.",
            timeCostMinutes: 10,
            rewardItemIds: ["mat-ceramic", "mat-fuel", "mat-core"],
          },
          {
            text: "철제 상자가 바닥에 떨어지는 굉음과 함께 작업장을 순찰하던 중장갑 경비원이 진입로를 막아섭니다.",
            timeCostMinutes: 15,
            encounterEnemyId: "npc-ind-juggernaut",
          },
        ],
      },
      {
        id: "cool-down-corridor",
        label: "열처리 구역을 벗어나 냉각 통로에서 잠시 휴식한다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 5,
        fatigueCost: 0,
        outcomes: [
          {
            text: "시원한 환기구 아래에서 숨을 고르며 피로를 덜어냈습니다.",
            timeCostMinutes: 5,
            fatigueDelta: 10,
          },
        ],
      },
      {
        id: "shield-heat-armor",
        label: "방호 장비로 복사열을 막아내며 선반 물자를 전량 회수한다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 5,
        fatigueCost: 4,
        condition: {
          requireTag: "ARMOR",
          label: "방호 계열 장비",
        },
        outcomes: [
          {
            text: "방호 장구 덕분에 열기 피해를 입지 않고 최상급 합금과 코어를 모두 확보했습니다.",
            timeCostMinutes: 5,
            rewardItemIds: ["mat-ceramic", "mat-titanium", "mat-core"],
          },
        ],
      },
    ],
  },
  {
    id: "story-med-cold-storage",
    title: "성에가 낀 의약품 저온 보관고",
    districtKind: "MEDICAL",
    imageKey: "lab_building",
    oncePerRaid: true,
    introText:
      "연구동 지하 의약품 보관고의 냉각 장치가 오작동해 문 주변이 두꺼운 성에로 얼어붙었습니다. 강화 유리창 너머로는 밀봉된 지혈제와 나노 봉합사 케이스가 보입니다.",
    choices: [
      {
        id: "force-frozen-door",
        label: "얼어붙은 손잡이를 힘으로 젖혀 보관고 문을 연다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 10,
        fatigueCost: 8,
        outcomes: [
          {
            chance: 0.65,
            text: "얼음층이 부서지며 문이 열렸습니다. 지혈대와 항응고제, 생체 젤을 챙겼습니다.",
            timeCostMinutes: 10,
            rewardItemIds: [
              "med-tourniquet",
              "mat-anticoagulant",
              "mat-biogel",
            ],
          },
          {
            text: "냉각 배관이 파열되며 성에가 무너지고, 보관고 어둠 속에 웅크려 있던 변이 생체 군집이 한꺼번에 쏟아져 나옵니다.",
            timeCostMinutes: 15,
            encounterEnemyId: "npc-med-swarm",
          },
        ],
      },
      {
        id: "take-cart-supplies",
        label: "보관고는 두고 입구 카트 위의 응급 물품만 챙긴다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 5,
        fatigueCost: 0,
        outcomes: [
          {
            text: "입구 카트에서 응급 붕대와 이온 음료를 안전하게 챙겨 나왔습니다.",
            timeCostMinutes: 5,
            rewardItemIds: ["med-bandage", "food-ion-drink"],
          },
        ],
      },
      {
        id: "defrost-chem-catalyst",
        label: "화학 장비의 해동 촉매로 배관 손상 없이 문을 개방한다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 5,
        fatigueCost: 4,
        condition: {
          requireTag: "CHEM",
          label: "화학 계열 장비",
        },
        outcomes: [
          {
            text: "성에를 안전하게 녹여내어 자동 지혈 주사기와 나노 봉합사, 항응고제를 온전히 회수했습니다.",
            timeCostMinutes: 5,
            rewardItemIds: [
              "med-hemostatic-injector",
              "mat-nanosuture",
              "mat-anticoagulant",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "story-inf-substation-cache",
    title: "고전압 변전실의 정비 캐비닛",
    districtKind: "INFRA",
    imageKey: "utility_facility",
    oncePerRaid: true,
    introText:
      "관리동 변전실 안쪽에서 간헐적인 전기 스파크가 튀고 있습니다. 차단기 레버가 절반만 내려간 상태라 캐비닛 주변에 잔류 전압이 흐르지만, 안쪽에는 고밀도 코어와 솔레노이드 부품이 보관되어 있습니다.",
    choices: [
      {
        id: "reach-live-cabinet",
        label: "스파크가 멎는 틈을 노려 캐비닛 부품을 빠르게 꺼낸다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 10,
        fatigueCost: 8,
        outcomes: [
          {
            chance: 0.55,
            text: "타이밍을 맞춰 솔레노이드와 고밀도 코어, 배터리를 재빨리 회수했습니다.",
            timeCostMinutes: 10,
            rewardItemIds: ["mat-solenoid", "mat-core", "mat-battery"],
          },
          {
            text: "갑작스러운 아크 방전 경보가 울리자 변전실 구석의 자동 보안 제어 개체가 즉시 가동하며 공격해 옵니다.",
            timeCostMinutes: 15,
            encounterEnemyId: "npc-inf-architect",
          },
        ],
      },
      {
        id: "take-entry-rations",
        label: "변전실 안쪽은 포기하고 입구 정비반의 비상 물자만 챙긴다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 5,
        fatigueCost: 0,
        outcomes: [
          {
            text: "입구 정비함에서 에너지 바와 구리 배선을 챙겨 안전하게 물러났습니다.",
            timeCostMinutes: 5,
            rewardItemIds: ["food-energy-bar", "mat-wire"],
          },
        ],
      },
      {
        id: "shoot-breaker-firearm",
        label: "총기로 원거리에서 비상 차단기 레버를 내려 전원을 끊는다",
        action: "EVENT_CHOICE",
        timeCostMinutes: 5,
        fatigueCost: 4,
        condition: {
          requireTag: "FIREARM",
          label: "총기 계열 장비",
        },
        outcomes: [
          {
            text: "정확한 사격으로 차단기가 떨어지며 스파크가 완전히 멎었습니다. 캐비닛의 고급 부품을 안전하게 회수했습니다.",
            timeCostMinutes: 5,
            rewardItemIds: ["mat-solenoid", "mat-battery", "mat-lens"],
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

export interface BuildingEventResolveOptions {
  /** 현재 장착된 장비가 전혀 없는 비무장 상태인지 여부 */
  isUnarmed?: boolean;
}

export const UNARMED_RECOVERY_EVENT_CHAIN: readonly BuildingEventDefinition[] =
  [
    {
      id: "story-unarmed-cache-1",
      title: "비무장 탐색: 버려진 구호함",
      oncePerRaid: true,
      introText:
        "빈손으로 건물 내부를 살피던 중, 계단 아래 구석에 봉인이 반쯤 뜯긴 비상 구호함이 눈에 띕니다. 안쪽에는 기본 호신용 단검과 응급 붕대가 남아 있고, 덮개 안쪽에는 인근 건물의 예비 보급 락커 주파수가 적힌 인식표가 붙어 있습니다.",
      choices: [
        {
          id: "pry-relief-locker",
          label: "구호함에서 호신용 단검과 응급 붕대를 회수한다",
          action: "EVENT_CHOICE",
          timeCostMinutes: 5,
          fatigueCost: 4,
          outcomes: [
            {
              text: "구호함 잠금장치를 풀어 비상용 단검과 붕대를 챙겼습니다. 덮개에 적힌 예비 보급 락커 주파수도 단말기에 기록해 두었습니다.",
              timeCostMinutes: 5,
              rewardItemIds: ["wpn_dagger", "med-bandage"],
            },
          ],
        },
        {
          id: "trace-supply-tag",
          label: "단검만 빠르게 챙기고 예비 락커 주파수를 추적한다",
          action: "EVENT_CHOICE",
          timeCostMinutes: 5,
          fatigueCost: 0,
          outcomes: [
            {
              text: "가벼운 호신용 단검만 손에 쥔 채 인식표의 주파수를 단말기에 동기화했습니다. 다음 건물에서 예비 보급 락커를 찾을 수 있을 것 같습니다.",
              timeCostMinutes: 5,
              rewardItemIds: ["wpn_dagger"],
            },
          ],
        },
      ],
    },
    {
      id: "story-unarmed-cache-2",
      title: "비무장 탐색: 예비 보급 락커",
      oncePerRaid: true,
      introText:
        "앞서 기록해 둔 구호함 인식표 주파수가 건물 복도 끝 철제 락커 앞에서 짧게 공명합니다. 비상 전원만으로 유지되고 있는 예비 보급 락커에는 대피 당시 남겨진 기본 무장과 보급품이 정리되어 있습니다.",
      choices: [
        {
          id: "open-backup-locker",
          label: "예비 보급 락커를 열어 구호 카빈과 비상 식량을 확보한다",
          action: "EVENT_CHOICE",
          timeCostMinutes: 5,
          fatigueCost: 4,
          outcomes: [
            {
              text: "주파수 인증이 통과되며 락커가 열렸습니다. 상태가 양호한 한림 구호 카빈과 비상 식량을 회수했습니다.",
              timeCostMinutes: 5,
              rewardItemIds: ["hanlim-relief-carbine", "food-combat-ration"],
            },
          ],
        },
        {
          id: "take-compact-kit",
          label: "가벼운 진압봉과 응급 붕대만 챙겨 빠르게 이동한다",
          action: "EVENT_CHOICE",
          timeCostMinutes: 5,
          fatigueCost: 0,
          outcomes: [
            {
              text: "무게 부담을 줄이기 위해 한림 진압봉과 응급 붕대만 챙겨 락커를 닫았습니다.",
              timeCostMinutes: 5,
              rewardItemIds: ["hanlim-control-baton", "med-bandage"],
            },
          ],
        },
      ],
    },
  ];

const DEFAULT_BUILDING_EVENT: BuildingEventDefinition = {
  id: "default-building",
  introText:
    "방금 전까지 사람이 있었던 흔적이 보입니다. 아직 내부에 가치 있는 것들이 남아 있을지도 모릅니다.",
};

/**
 * 건물 ID → 비무장 복구 특수 이벤트 → 건물 카테고리(이미지 유형) → 구역 성격 및 건물 높이 순으로 초기 건물 이벤트를 결정합니다.
 */
export function resolveBuildingIntroEvent(
  building: Pick<MapBuilding, "id" | "category"> & { height?: number },
  district?: Pick<MapDistrict, "kind">,
  completedEventIds: readonly string[] = [],
  options?: BuildingEventResolveOptions,
): BuildingEventDefinition {
  const byId = BUILDING_EVENTS_BY_ID[building.id];
  if (byId && (!byId.oncePerRaid || !completedEventIds.includes(byId.id))) {
    return byId;
  }

  if (options?.isUnarmed) {
    const firstStage = UNARMED_RECOVERY_EVENT_CHAIN[0];
    const secondStage = UNARMED_RECOVERY_EVENT_CHAIN[1];
    if (firstStage && !completedEventIds.includes(firstStage.id)) {
      return firstStage;
    }
    if (
      firstStage &&
      secondStage &&
      completedEventIds.includes(firstStage.id) &&
      !completedEventIds.includes(secondStage.id)
    ) {
      return secondStage;
    }
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
        const matchingStoryEvents = STORY_BUILDING_EVENTS.filter(
          (e) =>
            e.districtKind === district.kind &&
            e.imageKey === baseEvent.imageKey &&
            (!e.oncePerRaid || !completedEventIds.includes(e.id)),
        );
        if (matchingStoryEvents.length > 0) {
          const picked =
            matchingStoryEvents[
              Math.abs(building.id) % matchingStoryEvents.length
            ];
          if (picked) return picked;
        }
      }
      return baseEvent;
    }
  }

  return DEFAULT_BUILDING_EVENT;
}

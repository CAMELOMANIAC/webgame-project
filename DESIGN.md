# Visual Style Guide & Design System (`DESIGN.md`)

## 1. Overview & Creative North Star

### Creative North Star: "Precision Tactical Instrument (정밀 전술 계기판)"

이 디자인 시스템은 다중우주가 중첩된 서포시를 탐사하고 한림 복귀 실험실에서 정비하는 SF 익스트랙션 웹게임을 위해 설계되었습니다. 전형적인 AI 생성형 UI(과도한 네온 글로우, 무지개색 아이콘 박스, 보라색 사선 그라데이션, 둥글고 통통한 카드 중첩)를 전면 배제합니다.

대신 **글로벌 엔터프라이즈 테크(Linear, Stripe, Vercel)의 극도로 절제된 무채색·헤어라인 밀도**를 기반으로 삼고, 그 위에 **첨단 방산·항공 전술 시스템(Anduril Lattice, Palantir Foundry, SpaceX Crew Display)의 구조적 계기판 디테일**을 결합합니다.

핵심 미학 원칙은 다음 네 가지로 요약됩니다:

1. **Color Restraint, Structural Tension (색상의 절제와 구조적 긴장감):** 전술적인 느낌은 화려한 네온 컬러나 빛번짐(`box-shadow` glow)이 아니라, **세그먼트 눈금 게이지(`| | | |`)**, **모서리 타겟팅 브래킷(`⌜ ⌟`)**, **1px 밀착 데이터 그리드**, **고정폭 숫자(`tabular-nums`)**라는 기하학적 구조에서 나옵니다.
2. **Solid Obsidian & Razor-Sharp Hairlines (솔리드 서피스와 면도날 같은 1px 경계선):** 모호하게 뭉개진 블러 대신, 정밀하게 계산된 무채색 솔리드 서피스(`#09090b` ~ `#18181b`)와 `1px solid rgba(255, 255, 255, 0.08)` 헤어라인 보더로 면과 면을 날카롭게 구획합니다.
3. **Bipolar Semantic Axis (이극성 시맨틱 컬러 체계):** NATO 전술 심볼 표준(`MIL-STD-2525`)과 동일하게 유채색은 오직 **긍정·안정·아군(Blue `#85adff`)**과 **부정·위험·적대(Red `#ff7162`)** 두 축으로만 제한하며, 나머지 모든 구조와 중립 상태는 **무채색(White & Zinc Grayscale)**으로 통제합니다.
4. **Dry Institutional Korean + Technical Telemetry (건조한 국문 기관 어조와 기술 기호 병기):** 과장된 영문 SF 클리셰 슬로건을 배제하고, '한림 복귀 실험실 · 서포시 운영 기록'이라는 건조하고 현실적인 국문 서사에 간결한 모노스페이스 식별 코드(`HL-LAB // SEC-00`, `[NODE #26]`, `3.0KG`)를 병기합니다.

---

## 2. Color System

화면의 **90% 이상은 무채색(Obsidian & Zinc)**으로 구성되며, 유채색은 오직 상태 판별을 위한 **3원 시맨틱 체계(긍정 Blue / 부정 Red / 중립 Gray)**로만 작동합니다.

### 2.1 Surface Hierarchy (솔리드 다크 서피스 계층)

| Token Name | Hex / Value | Usage |
| :--- | :--- | :--- |
| `surface-base` | `#09090b` | 최하단 앱 배경(`body`), 전술 지도 기본 캔버스 배경 |
| `surface-low` | `#0c0c0f` | 비활성 개체 카드, 빈 장비/가방 슬롯(`EMPTY`), 후경 컨테이너 |
| `surface-mid` | `#101013` ~ `#121215` | 기본 섹션 패널, 1px 데이터 그리드 셀 내부, 기본 카드 표면 |
| `surface-high` | `#141418` ~ `#18181b` | 선택된 개체 카드, 아이템이 장착된 슬롯, 호버/포커스 활성 표면 |
| `surface-hud` | `rgba(16, 16, 19, 0.90)` | **오직 필드 지도(`/field`) 상·하단 부유 HUD에만 허용** (`backdrop-filter: blur(12px)` 병행) |

> [!NOTE]
> **플로팅 글래스 HUD vs 인라인 솔리드 서피스 계층 명세**
> - **인라인 솔리드 서피스 (`surface-base` ~ `surface-high`):** 페이지 본문 내부에 배치되는 모든 일반 카드, 패널, 목록 버튼은 불투명한 순수 무채색 솔리드 계층(흑색·징크 무채색)만을 사용합니다. 개체 선택이나 호버 상태를 표현할 때 서피스 배경에 임의의 유색 틴트(네이비/블루 `#13151c` 등)를 혼합하지 않고, 순수 무채색 `surface-high`(`#141418`)와 시맨틱 헤어라인 보더(`border-positive` / `border-strong`)의 조합으로 명확히 구획합니다.
> - **플로팅 글래스 HUD (`GlobalNav`, 필드 부유 위젯):** 화면 상·하단에 고정되어 스크롤되는 콘텐츠 위를 부유하는 독/위젯에 한하여 반투명 서피스(`rgba(14, 15, 19, 0.70)` 등)와 `backdrop-filter: blur(16px)`를 허용합니다. 배경 요소가 투과되어 솔리드 서피스와는 자연스러운 명도 및 투과도 차이가 발생하지만, 이는 레이어의 깊이감(Z-Index 및 플로팅 위계)을 형성하기 위한 의도된 구조적 분리입니다.

### 2.2 Border & Hairline Tokens (경계선 토큰)

| Token Name | Value | Usage |
| :--- | :--- | :--- |
| `border-subtle` | `rgba(255, 255, 255, 0.07)` | 기본 패널, 카드, 빈 슬롯, 섹션 구분용 기본 1px 실선 |
| `border-grid` | `#27272a` | 1px 밀착 데이터 그리드(`gap: 1px`)의 셀 간격 배경색 및 비활성 게이지 트랙 |
| `border-strong` | `rgba(255, 255, 255, 0.18)` | 장착된 아이템 슬롯, 포커스된 요소, 활성 컨테이너 외곽선 |
| `border-positive` | `rgba(133, 173, 255, 0.35)` | 선택된 개체, 안정 구역 HUD, 준비 완료 상태 보더 |
| `border-negative` | `rgba(255, 113, 98, 0.35)` | 교전 중 HUD, 적대 조우 경고, 위험 상태 보더 |

### 2.3 Action & Semantic Colors (행동 및 시맨틱 3색 체계)

- **Primary Action & Structure (Pure White `#fafafa`)**
  - **역할:** 최상위 실행 CTA 버튼(배치 승인, 탈출 실행, 임무 수락/보고), 핵심 타이틀, 활성 수치 텍스트.
  - **규칙:** 주요 CTA 버튼은 유색 그라데이션 대신 **솔리드 화이트 배경(`#fafafa`) + 다크 텍스트(`#09090b`)**를 사용하여 상용 프로덕트다운 명확한 위계를 만듭니다. (호버 시 `#e4e4e7`)
- **Semantic Positive / Friendly / Safe (Tactical Blue `#85adff`)**
  - **역할:** 선택된 개체(`선택됨`), 배치 준비 완료(`READY`), 중첩 안정 구역, 탈출 가능 지점(`EXTRACT READY`), 정상 체력/스태미나 상태 인디케이터, 아군 경로 및 무기 준비 완료(`READY`).
  - **배지/태그 조합:** 배경 `rgba(133, 173, 255, 0.12)` + 보더 `1px solid rgba(133, 173, 255, 0.28)` + 텍스트 `#85adff`.
- **Semantic Negative / Hostile / Critical (Pulse Red `#ff7162`)**
  - **역할:** 교전 상태(`HOSTILE`), 고스트·통제 요원 조우, 중첩 불안정·통제 강화 구역, 체력 위험(30% 이하) 게이지, 적 체력(`ENEMY HP`), 피격/에러 경고.
  - **배지/태그 조합:** 배경 `rgba(255, 113, 98, 0.14)` + 보더 `1px solid rgba(255, 113, 98, 0.30)` + 텍스트 `#ff7162`.
- **Semantic Neutral / Standby (Zinc Grayscale)**
  - **Primary Text:** `#fafafa` (핵심 제목, 수치, 활성 라벨)
  - **Secondary Text:** `#a1a1aa` (본문 서사, 브리핑, 보조 설명, 부제목)
  - **Muted Text:** `#71717a` (항목 라벨 `VIT // 체력`, 단위 `KG`, 비활성 탭)
  - **Disabled / Empty Text:** `#52525b` (`EMPTY`, `SLOT 02`, 비활성 버튼)

### 2.4 Deprecated Colors (사용 전면 금지)

> [!WARNING]
> 다음 요소들은 전형적인 'AI 생성 대시보드 느낌'을 유발하므로 코드베이스에서 전면 배제합니다.
> - **형광 그린(`#b8ffb9`), 옐로우(`#ffbe76`), 퍼플(`#6c5ce7`, `#5345db`), 시안(`#00f0ff`), 민트(`#2bcbba`)** 사용 금지.
> - **135도 사선 유색 그라데이션 버튼** 및 **네온 외곽선 빛번짐(`box-shadow: 0 0 15px ...`)** 사용 금지.
> - 스탯 표시 시 **하트(빨강)·번개(노랑)·저울(초록) 같은 알록달록한 아이콘 박스** 나열 금지.

---

## 3. Typography & Language Tone

### 3.1 Font Stack

- **UI & Narrative Sans (`--font-sans`):** `"Pretendard Variable", "Inter", -apple-system, BlinkMacSystemFont, sans-serif`
  - 국문 서사, 임무 브리핑, 구역명, 일반 버튼에 사용합니다.
- **Technical Telemetry Mono (`--font-mono`):** `"JetBrains Mono", "SFMono-Regular", Consolas, ui-monospace, monospace`
  - 개체 식별 번호(`#4A69`), 노드 코드(`[NODE #26]`), 라운드(`R02`), 스탯 수치(`100 / 100`), 중량(`03.0 / 20KG`), 슬롯 번호(`SLOT 02`)에 사용합니다.

### 3.2 Typographic Scale & Rules

1. **최소 폰트 크기 보장 (`12px` Floor, 마이크로 코드 최소 `11px`):**
   - 기존의 `7px ~ 9px` 초소형 텍스트와 `font-weight: 300`(Light) 조합은 가독성을 무너뜨리므로 금지합니다.
   - 모든 본문과 주요 UI 텍스트는 최소 `12px`(`0.75rem`) 이상, 기본 두께는 `400`(Regular) ~ `600`(SemiBold)을 유지합니다.
2. **고정폭 숫자 강제 (`font-variant-numeric: tabular-nums`):**
   - 체력, 스태미나, 적재 중량, 쿨타임 초, 라운드, 좌표 등 숫자가 포함된 모든 컴포넌트에는 반드시 `font-variant-numeric: tabular-nums`를 선언하여 실시간 전투 및 상태 변화 시 레이아웃 흔들림을 방지합니다.
3. **스케일 위계:**
   - **Page Header (`20px ~ 24px`, `font-weight: 700`, `letter-spacing: -0.02em`):** 화면 최상단 타이틀 (예: `개체 및 배치 장비 편성`, `서포시 운영 기록`)
   - **Section / Node Title (`14px ~ 16px`, `font-weight: 600`):** 패널 헤더 및 현재 구역명 (예: `기록 중계 시설`)
   - **Body / Briefing (`13px ~ 14px`, `line-height: 1.65`, color `#a1a1aa`):** 임무 통신 본문 및 관측 기록
   - **Telemetry / Label (`11px ~ 12px`, `font-mono`, `tabular-nums`):** 시스템 식별자, 스탯 라벨(`VIT // 체력`), 배지(`HOSTILE · R02`)

### 3.3 Language Tone & Manner (언어 표기 원칙)

- **과장된 영문 SF 클리셰 금지:** `OPERATIONS CENTER`, `STAGING LOBBY`, `Ghost Extractor Class A`, `SYNCHRONIZING WITH MATRIX...` 같은 작위적인 영문 슬로건을 사용하지 않습니다.
- **건조한 국문 서사 + 기술 기호 병기:**
  - 기관·시설·행동 명칭은 **건조하고 신뢰감 있는 국문**으로 표기합니다 (예: `한림 복귀 실험실 · 거점 배치 편성`, `서포시 배치 승인`, `구호용 카빈`).
  - 식별 코드·단위·상태 기호는 **간결한 대문자 모노스페이스 약어**로 병기하여 전술 단말기의 정밀함을 부여합니다 (예: `HL-LAB // SEC-00`, `[NODE #26]`, `WL-01 · #4A69`, `DMG 18 · 3.0KG`).

---

## 4. Geometry, Elevation & Tactical Signatures

### 4.1 Restrained Border Radius (절제된 모서리 곡률)

좁은 모바일 뷰포트(`390px`) 안에서 `24px`의 둥근 카드들이 중첩되면 화면이 둔탁해집니다. 하드웨어 계기판처럼 날카롭고 긴장감 있는 곡률 스케일을 적용합니다.

- **Outer Frame / Section Panel:** `10px ~ 12px`
- **Inner Card / Item Slot / Action Button:** `6px ~ 8px`
- **Status Badge / Telemetry Tag:** `4px` (캡슐형 `9999px` 알약 배지 지양)
- **Segmented Gauge Cell:** `1px`

### 4.2 Tactical Visual Signatures (전술 계기판 3대 시그니처)

AI 느낌의 네온 효과 없이 '전술 화면의 정밀함'을 구현하기 위해 아래 세 가지 구조적 디테일을 표준 컴포넌트로 사용합니다.

#### ① Corner Reticle Brackets (모서리 타겟팅 브래킷 `⌜ ⌟`)
- **적용 대상:** 현재 선택된 개체 카드, 장착된 주무기 슬롯, 필드 상단 활성 HUD.
- **구현 규격:** 컨테이너의 좌상단(`top: -1px; left: -1px`)과 우하단(`bottom: -1px; right: -1px`)에 `6px × 6px` 크기, `1.5px solid` 두께의 `::before`, `::after` 가상 요소 브래킷을 배치합니다.
- **색상 규칙:** 기본 활성 요소는 `#fafafa`, 긍정/선택된 개체 및 안정 구역 HUD는 `#85adff`, 교전/위험 HUD는 `#ff7162`를 사용합니다.

#### ② Exposed 1px Hairline Data Grid (밀착형 1px 데이터 그리드)
- **적용 대상:** 개체 스탯 요약(체력·스태미나·중량), 전투 결과 요약, 라운드/탈출 지점 정보창.
- **구현 규격:** 개별 스탯마다 둥근 박스와 아이콘을 따로 만들지 않고, 외곽 `1px solid rgba(255, 255, 255, 0.08)` 컨테이너 안에 `background: #27272a; gap: 1px;` 그리드를 선언하여 각 셀(`background: #101013`)이 1px 실선으로 빈틈없이 맞닿게 구성합니다.
- **셀 내부 구성:** 상단에는 모노스페이스 라벨(`VIT // 체력`)과 `6px` 원형 시맨틱 상태 점(정상 `#85adff`, 위험 `#ff7162`, 중립 `#71717a`)을 배치하고, 하단에는 고정폭 수치(`100 / 100`)를 배치합니다.

#### ③ Segmented Tactical Gauge (세그먼트 눈금 게이지 `| | | | |`)
- **적용 대상:** 필드 HUD의 체력(HP) 및 스태미나 바.
- **구현 규격:** 둥글고 매끈한 SaaS형 프로그레스 바(`border-radius: 9999px`) 대신, 10~12개의 직각형 세그먼트 셀(`height: 6px ~ 8px`, `gap: 2px`, `border-radius: 1px`)로 분할하여 전술 계기판의 아날로그-디지털 하이브리드 질감을 표현합니다.
- **색상 규칙:** 평상시·안정 상태는 `#85adff`(또는 `#fafafa`), 교전 중이거나 위험 수치일 때는 `#ff7162`, 소모된 빈 칸은 `#27272a`로 렌더링합니다.

---

## 5. Screen-by-Screen Guidelines

### 5.1 거점 정비 & 개체 편성 로비 (`/base`)
- **레이아웃:** `HL-LAB // SEC-00` 헤더 아래 홈에는 선택한 개체의 스탯, 배치 승인, 임무 통신 링크를 배치합니다. 창고에는 장비·창고·가방 슬롯을, 숙소에는 보유 개체 선택 그리드를 배치합니다. 레이드의 거점 미리보기(`/field/user`)에서는 보유 개체와 창고를 열람합니다.
- **개체 선택 카드:** 선택된 개체는 `surface-high`(`#13151c`) 배경과 `border-positive`, 블루 코너 브래킷(`⌜ ⌟`)으로 명확히 구분하고, 비선택 개체는 `surface-low`(`#0c0c0f`)와 중립 그레이 텍스트로 차분하게 눌러줍니다.
- **배치 버튼:** 보라색/초록색 대신 전체 너비의 고대비 솔리드 화이트 버튼(`background: #fafafa; color: #09090b; border-radius: 6px`)에 우측 모노스페이스 코드(`DEPLOY → #00`)를 함께 표기합니다.

### 5.2 서포시 전술 지도 & 상단 HUD (`/field`)
- **배경 캔버스 (`MapGraphCanvas`):** 다크 옵시디언 배경(`#09090b`) 위에 도시 도로망과 건물 폴리곤을 무채색 징크 톤(`#18181b` ~ `#3f3f46`)으로 렌더링하고, 미세한 전술 격자(Grid) 또는 거리 동심원(Range Ring)으로 계기판 감성을 더합니다.
- **경로선 및 타겟 마커:** 평상시 이동 경로와 목적지 노드는 `#85adff`(또는 `#fafafa`), 위험/교전 구역 타겟팅 시에는 `#ff7162` 점선 및 비콘으로 표시합니다.
- **부유형 전술 HUD (`FieldNavTargetSection` / `FieldStatusSection`):**
  - `surface-hud`(`rgba(16, 16, 19, 0.90)` + `backdrop-filter: blur(12px)`)와 모노크롬 1px 헤어라인 보더(`rgba(255, 255, 255, 0.12)`), 코너 브래킷을 기본으로 적용합니다.
  - 평상시 안정(`STABLE`) 상태에서는 과도한 시각적 피로를 막기 위해 외곽선을 무채색(모노크롬)으로 유지하고, 구역 상태나 탈출 가능 지점은 내부 배지·인디케이터 점등으로 표시합니다.
  - 구역 중첩 불안정 또는 위기/교전(`HOSTILE` / `CRITICAL`) 상태일 때만 레드(`#ff7162`) 경고 보더 및 브래킷을 점등합니다.

### 5.3 교전 오버레이 & 무기 슬롯 (`/field` 전투 상태)
- **전투 로그 (`CombatLog`):** 캐릭터 초상화 이미지를 그라데이션으로 합성하는 구형 게임 클리셰를 제거하고, 모노스페이스 타임스탬프/틱과 행동 주체·피해량을 정갈한 텔레메트리 로그 리스트 형태로 표시합니다.
- **장착 무기 슬롯 (`EquipmentSlot`):**
  - 시안색(`#00f0ff`) 네온 빛번짐을 제거합니다.
  - 무기 작동/캐스팅 상태는 정제된 `#85adff` 진행 바 또는 `#fafafa` 보더 하이라이트로 표현하고, 쿨타임 오버레이는 차분한 다크딤(`rgba(9, 9, 11, 0.78)`) 위에 고정폭 숫자(`tabular-nums`)만 또렷하게 표시합니다.

### 5.4 임무 통신 & 운영 기록 (`/field/quest`) + 하단 글로벌 내비게이션 (`GlobalNav`)
- **임무 통신 문서:** 한림 복귀 실험실의 공식 기밀/관측 문서를 열람하는 감성으로, `surface-mid`(`#101013`) 솔리드 패널과 `1px` 헤어라인 보더, 상단 상태 태그(`OFFERED` / `ACTIVE` → `#85adff`, `RECOVERED` → `#ff7162`, `COMPLETE` → 중립 그레이)를 사용합니다.
- **하단 글로벌 내비게이션 (`GlobalNav`):**
  - 기존의 빛나는 파란색 원형 글로우(`Highlight` 50% radius + `box-shadow` glow)를 전면 폐기합니다.
  - 하단 바는 좌우·하단 여백(`width: calc(100% - 32px)`, `bottom: 12px`)을 둔 **플로팅 전술 독(Floating Tactical Dock)** 형태로 배치하며, 뒤쪽 요소가 은은하게 비치는 글래스모피즘(`rgba(14, 15, 19, 0.70)` + `backdrop-filter: blur(16px) saturate(140%)`), 전체 `1px solid rgba(255, 255, 255, 0.12)` 헤어라인 보더, 상단 림 라이트(`inset 0 1px 0 rgba(255, 255, 255, 0.14)`), `border-radius: 10px`, 하단 입체 그림자(`0 10px 30px -4px rgba(0, 0, 0, 0.52)`)를 적용합니다.
  - 활성 탭은 절제된 필과 모노스페이스 인덱스로 표시합니다. 레이드에는 전술지도·가방·임무통신·거점을, 거점에는 홈·창고·숙소·거래소를 배치합니다.

---

## 6. Do's and Don'ts Summary

### Do (반드시 지킬 것)
- **DO** 모든 패널과 슬롯 경계에 `1px solid rgba(255, 255, 255, 0.07 ~ 0.18)` 헤어라인 실선을 사용하여 면도날처럼 또렷한 구획을 만드세요.
- **DO** 수치 데이터(HP, 스태미나, 무게, 라운드, 노드 번호, 쿨타임)에는 예외 없이 `font-variant-numeric: tabular-nums`와 모노스페이스 폰트를 적용하세요.
- **DO** 선택된 카드, 활성 장비, 전술 HUD에는 코너 브래킷(`⌜ ⌟`), 세그먼트 게이지(`| | | |`), 1px 밀착 데이터 그리드로 전술 계기판의 정체성을 드러내세요.
- **DO** 유채색은 오직 **긍정·안정(`#85adff`)**과 **부정·위험(`#ff7162`)** 두 가지 시맨틱 용도로만 제한하고, 최상위 CTA 버튼은 고대비 솔리드 화이트(`#fafafa`)를 사용하세요.

### Don't (절대 하지 말 것)
- **DON'T** 형광 초록(`#b8ffb9`), 보라색 그라데이션(`#6c5ce7`), 시안 네온(`#00f0ff`), 노란 번개 아이콘(`#ffbe76`) 등 3가지 이상의 유채색을 한 화면에 섞어 쓰지 마세요.
- **DON'T** 버튼이나 활성 탭에 네온 빛번짐(`box-shadow: 0 0 15px ...`)이나 사선 그라데이션(`linear-gradient(135deg, ...)`)을 넣지 마세요.
- **DON'T** `10px` 미만의 초소형 폰트(`7px~9px`)나 `font-weight: 300`을 사용하여 글자를 흐릿하게 만들지 마세요.
- **DON'T** 세계관과 동떨어진 과장된 영문 문구(`SYNCHRONIZING WITH MATRIX...`, `Ghost Extractor Class A`)를 임의로 생성하지 마세요.

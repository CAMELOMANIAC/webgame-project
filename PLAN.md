# Ghost Extraction: 핵심 게임 루프 및 서버 API 통합 개발 계획 (PLAN.md)

이 문서는 개별 프로토타입으로 작동하던 클라이언트(지도 탐사, 전투 시뮬레이션, 인벤토리)와 서버(Fastify + Prisma + PostgreSQL)를 유기적으로 연동하여 핵심 게임 루프를 완성하기 위한 설계 및 진행 상황을 관리합니다.

---

## 🏁 Phase 1: 로비(Lobby) 및 창고 아이템 이동 API 구축

익스트랙션 게임의 진입점인 로비 단계에서 유저 창고(Stash)와 캐릭터 가방(Inventory/Backpack) 간에 아이템을 이동하는 기능과 데이터베이스 영속성 레이어를 구축합니다.

### 1. 데이터베이스 모델 및 트랜잭션 설계 (Prisma)
- 유저 창고(`StashItem`)와 캐릭터 백팩 가방(`RaidInventoryItem`) 간의 아이템 이동은 한쪽이 줄어들면 다른 한쪽이 늘어나는 **원자적(Atomic) 트랜잭션**으로 수행되어야 합니다.
- **슬롯 및 무게 제약 조건 검증:** 가방으로 아이템을 이동할 때는 최대 가방 크기(32슬롯) 및 최대 무게 제한(`Character.maxWeight`)을 초과하는지 서버에서 실시간 검증합니다.

### 2. 서버 API 엔드포인트 구현 (`apps/server`)
- `POST /character/:characterId/inventory/move`
  - Body: `{ source: 'stash' | 'backpack', target: 'stash' | 'backpack', weaponMasterId: string, quantity: number, slotIndex?: number }`
  - 창고와 가방 간의 수량을 트랜잭션으로 이동하고 최신 인벤토리/창고 상태를 반환합니다.
- `POST /character/:characterId/raid/start`
  - 탐사 시작 상태로 세션을 활성화합니다. (`Character.isRaiding = true` 및 탐사 타이머 초기화)

---

## 🗺️ Phase 2: 클라이언트 상태 전역화 및 라우팅 재구성

### 1. 전역 상태 정의 (Jotai)
기존에 `MapGraphCanvas` 내부에 고립되어 있던 상태들을 전역 Atom으로 추출하여 전투 상태(`isCombat`)나 백팩 인벤토리 등과 유기적으로 상호 작용하도록 합니다.
- **위치:** `apps/game/src/atoms/raidAtom.ts` (신규 생성)
- **주요 전역 상태:**
  - `isCombatAtom`: 현재 전투(시뮬레이션 재생) 중인지 여부
  - `currentNodeIdAtom`: 플레이어가 현재 위치한 노드 ID
  - `targetNodeIdAtom`: 플레이어가 이동하고자 선택한 대상 노드 ID
  - `isNavigatingAtom`: 지도 상에서 플레이어가 이동 중인지 여부
  - `shortestPathAtom`: 계산된 이동 경로 노드 배열
  - `playerCoordsAtom`: 플레이어의 실시간 픽셀 좌표 (Konva 애니메이션용)

### 2. 라우트 및 레이아웃 정리
- **메인 탐사 화면 (`/field`):**
  - 기존에 `/field/user`에 임시 배치되어 있던 `MapGraphCanvas`를 `/field` 메인 화면으로 이동합니다.
  - `isCombat` 상태에 따라 화면을 분기합니다.
    - `isCombat === false`: 전체 화면 지도 탐사 뷰 (`MapGraphCanvas`) + 탐사 HUD
    - `isCombat === true`: 전체 화면 전투 시뮬레이션 연출 뷰 (`FieldBackground` Konva 레이어) + 전투 로그 (`CombatLog`)
- **로비 및 마이페이지 (`/field/user`):**
  - 지도를 제거하고, 캐릭터 상세 정보 및 영구 창고(`StashItem` 목록)를 보여주는 로비 및 정비 화면으로 개편합니다.
  - 여기에서 창고 <-> 가방 간 아이템 이동 API를 통해 출격 장비를 최종 세팅할 수 있게 합니다.

---

## ⚔️ Phase 3: 이동 완료 시 인카운터 및 전투 전환

### 1. 노드 도착 이벤트 연동
- `MapGraphCanvas`의 플레이어 이동 애니메이션이 끝난 시점(목적지 노드 도달 완료)에 콜백 이벤트(`onArrival(nodeId)`)를 발생시킵니다.
- 목적지에 적(몬스터 또는 타 유저의 고스트)이 위치하는지 여부를 판단합니다.

### 2. 전투 API 연동 및 화면 전환
- 적이 존재하는 경우, 서버의 전투 API(`POST /battle/monster` 또는 `/ghost/match` 및 `/battle/simulate`)를 호출합니다.
- 서버로부터 전투 로그(`BattleEvent[]`)를 받아와 전역 `battleLogAtom`에 주입합니다.
- `isCombat` 상태를 `true`로 토글하여 화면을 전투 연출 뷰로 전환하고, 틱(Tick) 단위로 연출 애니메이션을 실행합니다.

---

## 🎒 Phase 4: 보상 획득, 탈출(Extraction) 및 사망 영속성 반영

전투 결과에 따른 데이터 변동과 탐사 세션의 탈출/사망 처리를 영속화합니다.

### 1. 전투 결과 반영
- **전투 승리 시:**
  - 몬스터가 드롭한 전리품 아이템을 획득하여 캐릭터의 임시 백팩(`RaidInventoryItem`)에 추가합니다.
  - 인벤토리 변경 사항을 서버 슬롯 동기화 API(`/character/:characterId/slots/sync`)를 통해 동기화합니다.
- **전투 패배(사망) 시:**
  - 플레이어가 사망하면 탐사를 즉시 종료합니다.
  - 가방에 든 전리품과 기존에 소지했던 아이템을 모두 잃는 사망 처리 API(`/character/:characterId/raid/die`)를 호출하고 로비로 이동합니다.

### 2. 탈출(Extraction) 및 세션 종료 API 구현 (`apps/server`)
- `POST /character/:characterId/raid/extract`
  - **동작 (트랜잭션):** 캐릭터의 가방(`RaidInventoryItem`)에 있는 모든 아이템들을 유저의 창고(`StashItem`) 테이블로 옮겨 담아 커밋(수량 병합 및 생성)하고, 가방을 비운 뒤 `Character.isRaiding = false` 처리합니다.
- `POST /character/:characterId/raid/die`
  - **동작 (트랜잭션):** 캐릭터의 가방(`RaidInventoryItem`) 및 현재 착용 중인 무기(`CharacterWeapon`)를 소실(삭제)하고, 캐릭터를 기본 부활 스펙으로 초기화한 뒤 `Character.isRaiding = false` 처리합니다.

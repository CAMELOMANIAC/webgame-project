# AGENTS.md

이 문서는 `webgame-project` 저장소에서 작업하는 AI 코딩 에이전트를 위한 표준 지침서입니다. 모든 코드 작성, 리팩토링, 디버깅 및 문서화 작업 시 아래 규칙을 최우선으로 준수하세요.

---

## 1. 프로젝트 개요 및 핵심 문서

한림그룹의 복귀 실험실에서 정비하고, 다중우주가 중첩된 서포시를 탐사하는 SF 익스트랙션 웹게임 모노레포입니다.

작업 전 관련된 문서를 먼저 확인하세요:

- **[README.md](./README.md)**: 프로젝트 구조, 로컬 테스트 DB 실행 및 빠른 시작 가이드
- **[PLAN.md](./PLAN.md)**: 현재 구현된 게임 루프, 데이터 모델, REST API 명세 및 고스트/임무 규칙
- **[DESIGN.md](./DESIGN.md)**: 비주얼 스타일 가이드 (**"Precision Tactical Instrument"** 컨셉, 컬러 토큰, 타이포그래피, 전술 HUD 시그니처)
- **[docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md)**: 환경 변수, Drizzle 스키마 반영(`db:push`), 단위/통합 테스트 및 검증 상세 절차
- **[docs/SF-생존-게임-세계관.md](./docs/SF-생존-게임-세계관.md)**: 세계관 확정 설정 및 기획 제안 구분

> **작업 원칙**: 요구사항이나 기획이 모호할 경우 임의로 추측하여 구현하지 말고 즉시 작업을 중단한 뒤 사용자에게 질문하세요.
> 요청 범위에 없는 새 기능은 구현 전에 사용자와 필요성과 범위를 논의하고 합의하세요. UI를 추가하거나 변경할 때는 `DESIGN.md`의 컴포넌트 역할과 스타일 규칙을 확인하세요.

---

## 2. 모노레포 구조 (`pnpm` + `Turborepo`)

### 워크스페이스 구성 (`pnpm-workspace.yaml`)

- **`apps/game`**: React 19 · Vite · TanStack Router · Jotai · React Query · Vanilla Extract · Konva 기반 게임 클라이언트
- **`apps/server`**: Fastify · Drizzle ORM · PostgreSQL (Supabase 호환) 기반 게임 API 서버 (전투 시뮬레이션, 탐사 세션, 인벤토리/임무 트랜잭션 정산)
- **`packages/types` (`@webgame/types`)**: 클라이언트·서버 공유 API 타입, 무기/장비 효과, 구역 규칙, 단일 원본 지도(`map_graph.json`)
- **`packages/ui` (`@repo/ui`)**: 공통 UI 컴포넌트 패키지
- **`packages/eslint-config` / `packages/typescript-config`**: 워크스페이스 공통 ESLint 및 TypeScript 설정

### 패키지 매니저 및 명령어 규칙

- 패키지 매니저는 반드시 **`pnpm`**만 사용합니다 (`npm`, `npx` 사용 금지, 일회성 실행은 `pnpm dlx` 사용).
- 특정 워크스페이스에 패키지 추가: `pnpm add <package> --filter <workspace-name>`
- 특정 워크스페이스 작업 실행: `pnpm --filter <workspace-name> <script>`

```bash
pnpm build        # 전체 패키지 빌드 (^build 의존성 순서 준수)
pnpm dev          # 전체 앱 개발 서버 실행
pnpm check-types  # 전체 워크스페이스 TypeScript 타입 검사
pnpm test         # 서버 단위/API 테스트 실행
pnpm lint         # 전체 워크스페이스 ESLint 검사
```

---

## 3. 공통 코딩 및 검증 규칙

1. **엄격한 TypeScript 타입 정의 (`any` 금지)**
   - 어떠한 경우에도 `any` 타입을 명시적으로 사용하지 마세요. 정확한 인터페이스를 정의하거나 컴파일러가 추론할 수 있도록 작성하세요.
   - 클라이언트·서버 간 공유되는 데이터 구조는 `packages/types`에 정의합니다.
2. **검증 절차 (Definition of Done)**
   - 코드 수정 후에는 반드시 다음 검증을 순서대로 통과해야 합니다:
     1. 타입 검사: `pnpm check-types` (또는 해당 패키지 `tsc --noEmit`)
     2. 테스트 및 빌드: `pnpm test` 및 `pnpm build`
     3. 린트 검사: 모든 작업 완료 후 반드시 `pnpm lint` 실행

---

## 4. 클라이언트 지침 (`apps/game`)

### 아키텍처 및 폴더 구조

- **`src/styles/theme.css.ts`**: [`DESIGN.md`](./DESIGN.md) 규격을 구현한 전역 CSS 변수(`vars`) 및 공통 레시피(`cornerBrackets`, `page`, `fieldWidget`, `statusPill` 등)
- **`src/atoms/`**: Jotai 기반 원자적(atomic) 전역 상태 관리 (`camelCase` 파일명)
- **`src/components/`**: 도메인별로 그룹화된 UI 컴포넌트 (`PascalCase.tsx`와 `PascalCase.css.ts`를 같은 폴더에 나란히 배치)
  - `common/`: 전역 내비게이션(`GlobalNav`), 개발 계정 게이트(`DevelopmentAccountGate`)
  - `lobby/`: 거점 로비 캐릭터 카드(`CharacterCard`), 생존자 도감(`CharacterCollection`)
  - `field/`: 필드 맵(`MapGraphCanvas`, `FieldBackground`), 상·하단 전술 HUD 위젯(`FieldHeader`, `FieldStatusSection`, `FieldCharacterInfo`, `FieldNavTargetSection`, `NavigationRecovery`)
  - `combat/`: 전투 캔버스(`BattleCanvas`), 적 개체(`EnemyUnit`, `CanvasEnemyUnit`), 전투 로그(`CombatLog`), 공격 이펙트(`MeleeSlashEffect`, `RadarAttackLine`)
  - `itemSlot/`: 장비/가방 슬롯(`Equipment`, `EquipmentSlot`, `Backpack`, `BackpackSlot`, `SlotManager`)
- **`src/routes/`**: `@tanstack/react-router` 파일 기반 라우트 정의 (`*.css.ts` 파일은 `vite.config.ts`의 `routeFileIgnorePattern`으로 라우트 생성에서 자동 제외됨)
- **`src/utils/`**: API 통신 훅, 전투/탐사 상태 동기화 훅 및 유틸리티 함수 (`Named Export` 사용)

### 스타일링 규칙 (Vanilla Extract + `DESIGN.md`)

- 모든 컴포넌트 스타일은 **`@vanilla-extract/css`**와 **`@vanilla-extract/recipes`**를 사용하여 `Component.css.ts`에 작성하고, 컴포넌트에서 `import * as styles from "./Component.css"`로 가져와 적용합니다.
- 색상·폰트·보더는 하드코딩하지 않고 `@/styles/theme.css`의 `vars` 토큰을 참조합니다.
- 수치 데이터(HP, 스태미나, 중량, 쿨타임, 라운드, 좌표)에는 반드시 `fontVariantNumeric: "tabular-nums"`와 모노스페이스 폰트(`vars.font.mono`)를 적용합니다.
- 유채색은 긍정·안정(`#85adff`)과 부정·위험(`#ff7162`) 2축 시맨틱 용도로만 제한하며, 최상위 실행 CTA 버튼은 솔리드 화이트(`#fafafa`)를 사용합니다.

---

## 5. 서버 지침 (`apps/server`)

### 아키텍처 및 데이터베이스 (Drizzle ORM)

- **`src/app.ts` / `src/index.ts`**: 테스트 가능성을 위해 Fastify 앱 생성(`buildApp({ database, logger })`)과 포트 리스닝 엔트리포인트를 분리합니다.
- **`src/db/schema.ts`**: PostgreSQL 14개 테이블, Enum, 인덱스, 관계(Relations) 및 추론 타입의 단일 원본입니다.
- **`src/db/index.ts` & `src/db.ts`**: `postgres` 드라이버와 `drizzle-orm/postgres-js`를 사용합니다. Supabase Transaction Pooler 호환을 위해 `prepare: false` 옵션을 유지합니다.
- **`src/services/` & `src/routes/`**: 비즈니스 로직(인벤토리/장비 원자적 이동, 탐사 세션 상태 전이, 고스트 매칭, 전투 계산, 퀘스트 진행)은 `src/services/`에서 트랜잭션으로 처리하고, `src/routes/`는 입력 검증과 HTTP 응답 매핑을 담당합니다.

### DB 스키마 반영 및 테스트 주의사항

- 스키마 변경 시 `src/db/schema.ts`를 수정하고, 로컬 일회용 테스트 DB(`webgame_test_*`)에 `pnpm --filter server db:push`로 반영합니다.
- **외부/운영 데이터베이스 보호**: 사용자의 명시적 승인 없이 외부 DB에 스키마를 푸시하거나 파괴적 시드(`pnpm --filter server db:seed`)를 실행하지 마세요.
- 단위 테스트(`pnpm --filter server test`)는 DB 연결 없이 인메모리/모킹 주입으로 동작하며, DB 통합 테스트(`pnpm --filter server test:integration`)는 `TEST_DATABASE_URL`이 로컬 `webgame_test_*`를 가리킬 때만 실행됩니다.

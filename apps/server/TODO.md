# Ghost Extraction Backend TODO (Simulation Authority & Supabase)

이 문서는 Supabase(PostgreSQL) 환경을 기반으로 전투 시뮬레이션 로직을 서버로 이관하고, 클라이언트는 결과값만 받아 렌더링하는 구조를 구축하기 위한 계획입니다. 우선 로컬 개발을 진행하며 추후 Supabase 연동을 고려합니다.

## 🏁 Phase 1: 로직 이관 및 기초 환경 구축 (진행 중)
- [x] **서버 환경 구축 (Local Development)**
  - [x] Fastify + TypeScript 기반의 `apps/server` 프로젝트 초기화
  - [x] 모노레포 규칙에 따른 `package.json` 및 `tsconfig.json` 설정
- [x] **공용 타입 패키지 구성**
  - [x] `packages/types` 생성: `BattleEvent`, `Weapon`, `BattleResult` 등 시뮬레이션 통신 규격 정의
  - [x] 클라이언트(`apps/game`)와 서버(`apps/server`)에서 해당 패키지 참조 설정
- [x] **시뮬레이션 엔진 이식 (Server-Side)**
  - [x] `apps/game`의 `simulateBattle.ts` 로직을 서버의 `src/logic/`으로 이동
  - [x] `POST /battle/simulate` API 구현: 플레이어/적 데이터를 받아 전체 전투 로그(`BattleEvent[]`) 반환
- [x] **데이터베이스 모델링 (Prisma + PostgreSQL)**
  - [x] Prisma를 사용하여 로컬 PostgreSQL(Supabase Local 개발 환경 대응) 스키마 정의
  - [x] `User`, `Stash`, `Weapon` 마스터 데이터 테이블 생성

## 🗺️ Phase 2: 고스트(Ghost) 및 세션 관리 (진행 중)
- [x] **데이터 영속성 및 스냅샷**
  - [x] `GhostSnapshot`: 전투 승리 시 해당 시점의 데이터(HP, 무기 등)를 DB에 저장
- [x] **고스트 매칭 엔진**
  - [x] 특정 노드/날짜에 맞는 최적의 고스트 데이터를 DB에서 검색하여 반환하는 로직

## 🎒 Phase 3: Supabase 연동 및 탐사(Raid) 시스템 (예정)
- [ ] **Supabase Auth 및 클라우드 연동**
  - [ ] 유저 식별을 위한 Supabase Auth Token 검증 로직 추가
  - [ ] 로컬 DB에서 Supabase 클라우드 DB로 전환
- [ ] **탐사 세션 및 추출(Extraction) 시스템**
  - [ ] 세션 상태 관리 및 추출 성공 시 임시 아이템을 `Stash`로 영구 확정(Commit)

---
*마지막 업데이트: 2026-03-17*

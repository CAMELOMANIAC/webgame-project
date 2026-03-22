# Ghost Extraction: Backend (Simulation & API) TODO

이 문서는 Fastify/Prisma 기반의 서버(`apps/server`) 개발 계획을 관리합니다. 서버는 **"신뢰할 수 있는 출처(Simulation Authority)"**로서 모든 게임 로직과 데이터를 관리합니다.

## 🏁 Phase 1: 핵심 시뮬레이션 API (완료)
- [x] **서버 환경 구축**
  - [x] Fastify + TypeScript 기반의 `apps/server` 프로젝트 초기화
- [x] **공용 타입 패키지 구성**
  - [x] `packages/types`: 클라이언트와 서버의 통신 규격(`BattleEvent`, `Weapon` 등) 정의
- [x] **전투 시뮬레이션 엔진**
  - [x] `src/logic/simulateBattle.ts`: 무기 시전(Cast), 스태미너, 데미지 등 모든 전투 로직 포함
  - [x] `POST /battle/simulate` API: 플레이어/적 데이터를 받아 전체 전투 로그(`BattleEvent[]`) 반환
- [x] **데이터베이스 모델링**
  - [x] Prisma + PostgreSQL 스키마 정의 (`User`, `Stash`, `Weapon` 등)

## 🗺️ Phase 2: 고스트(Ghost) 및 데이터 영속성 (진행 중)
- [x] **고스트 스냅샷(Snapshot) 저장**
  - [x] 전투 승리 시, 해당 플레이어의 상태(`GhostSnapshot`)를 DB에 영구 저장
- [x] **고스트 매칭 엔진**
  - [x] 클라이언트의 탐사 조건(노드, 날짜)에 맞는 최적의 `GhostSnapshot`을 DB에서 검색하여 제공하는 API 구현
- [ ] **유저 데이터 관리**
  - [ ] 유저별 `Stash`(창고) 데이터 관리 및 조회 API

## 🎒 Phase 3: 탐사(Raid) 및 인증 시스템 (예정)
- [ ] **Supabase 연동**
  - [ ] 유저 식별을 위한 Supabase Auth Token 검증 로직
  - [ ] 로컬 DB에서 Supabase 클라우드 DB로 마이그레이션
- [ ] **탐사 세션 관리**
  - [ ] 탐사 시작/종료 API 구현
  - [ ] `진입 핸디캡`: 유저의 소지품 가치에 따라 시작 `day`를 계산하여 반환
- [ ] **추출(Extraction) 시스템**
  - [ ] 추출 성공 시, 탐사 중 획득한 임시 아이템을 유저의 `Stash`에 영구 확정(Commit)하는 로직

---
*마지막 업데이트: 2026-03-22*

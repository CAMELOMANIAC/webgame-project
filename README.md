# 서포시 SF 생존 게임

한림그룹의 복귀 실험실에서 정비하고, 다중우주가 중첩된 서포시를 탐사하는 웹게임 프로토타입이다. 장비·능력치 기록을 가진 고스트와 비동기 전투를 진행하며, 동일 인물의 복수 개체를 개별 상태로 보유할 수 있다.

**현재 상태:** 개발 TODO 01–14의 첫 플레이 구간 구현. 개발용 계정 선택을 사용한다. 변경한 DB 모델은 로컬 테스트 DB에서 검증했으며 **기존 외부 DB에는 적용하지 않았다.**

## 문서

- [AI 에이전트 지침서](./AGENTS.md)
- [비주얼 스타일 가이드](./DESIGN.md)
- [세계관: 확정 설정과 제안](./docs/SF-생존-게임-세계관.md)
- [작업 순서·완료 기준](./TODO.md)
- [현재 구현·API](./PLAN.md)
- [실행·검증 안내](./docs/DEVELOPMENT.md)
- [실제 플레이·DB 검증 결과](./docs/QA-2026-10-31.md)

## 구조

| 경로                        | 역할                                                                                |
| --------------------------- | ----------------------------------------------------------------------------------- |
| `apps/game`                 | React 19·Vite·TanStack Router·Jotai·React Query·Vanilla Extract·Konva 화면          |
| `apps/server`               | Fastify·Drizzle ORM·PostgreSQL (Supabase), 전투 계산과 탐사·아이템·임무 정산        |
| `packages/types`            | 공통 통신 타입·장비 처리·구역 규칙·단일 원본 지도                                   |
| `packages/ui`               | 공통 UI 패키지                                                                      |
| `apps/server/src/db/schema.ts` | Drizzle ORM 기반 PostgreSQL 테이블·인덱스·관계 스키마 정의                       |

서버가 전투와 보상을 확정하고, 화면은 반환한 로그를 재생한다. 탐사 명령은 세션 버전·고유 요청 ID로 중복 반영을 막는다.

## 로컬 테스트 환경에서 실행

pnpm 9, `--env-file`을 지원하는 Node.js, Docker가 필요하다. 검증 환경은 Node.js 24였다.

```sh
pnpm install

docker run --rm -d --name webgame-test \
  -e POSTGRES_USER=webgame_test \
  -e POSTGRES_PASSWORD=local-test-only \
  -e POSTGRES_DB=webgame_test_inventory \
  -p 127.0.0.1:55432:5432 postgres:16-alpine

export TEST_DATABASE_URL='postgresql://webgame_test:local-test-only@127.0.0.1:55432/webgame_test_inventory'

DATABASE_URL="$TEST_DATABASE_URL" DIRECT_URL="$TEST_DATABASE_URL" \
  pnpm --filter server db:push

pnpm --filter @webgame/types build
pnpm --filter server preview:test
```

PostgreSQL 기동이 끝난 뒤 `db:push`로 Drizzle 스키마를 반영한다. 위 비밀번호는 일회용 로컬 검증용 예시다. 기존 연결 설정을 덮어쓰지 않는다.

다른 터미널에서 게임을 실행한다.

```sh
pnpm --filter game dev --host 127.0.0.1
```

게임은 보통 [로비](http://127.0.0.1:5173/#/field/user), API는 [상태 확인](http://127.0.0.1:3001/health)에서 확인한다. 다른 포트가 표시되면 Vite 안내를 따른다.

검증 서버는 ‘로컬 검증 생존자’와 다른 탐사에서 남긴 고스트 기록을 준비한다. 기존 시드는 실행하지 않는다.

## 첫 임무 플레이

1. ‘로컬 검증 생존자’를 선택하고 ‘한림그룹 임무 통신 확인’으로 이동한다.
2. 임무를 수락해 받은 카빈을 거점 창고 → 가방으로 옮긴 뒤 ‘하나 장착’을 누른다.
3. 출격하고 ‘임무: 기록 중계 시설로 이동’을 누른다.
4. 고스트 또는 통제 요원과 싸워 기록을 확보한다. 쓰러지면 기록을 다시 회수해야 한다.
5. ‘탈출 지점으로 이동’ 후 ‘탈출하고 거점으로 복귀’를 누른다.
6. 임무 통신에서 기록을 보고하고 보상과 복귀 관측 기록을 확인한다.

거점의 ‘개발용 개체 추가’에서 같은 인물의 변주도 여러 번 추가할 수 있다. 개체 선택은 거점에서만 가능하며 한 계정은 한 개체로 출격한다.

## 검증

```sh
pnpm check-types
pnpm test
pnpm build
pnpm lint

# 위 로컬 TEST_DATABASE_URL을 설정한 터미널에서 실행
pnpm --filter server test:integration
```

실제 DB 테스트는 로컬 주소와 `webgame_test_*` 이름만 허용한다. 테스트가 만든 계정·개체·장비를 정리하며 외부 DB를 사용하지 않는다.

검증 서버는 정상 종료 시 임시 데이터를 정리한다. 강제 종료 후에는 일회용 DB 전체를 정리할 수 있다.

```sh
docker stop webgame-test
```

## 현재 범위

실제 로그인·외부 DB 적용·배포·정식 수집 경제·균형 조정은 후속 작업이다. 오너의 단계별 정보 공개 구조는 준비했지만, 첫 임무에서는 오너를 언급하지 않는다. 구역명·인물 표식·임무명·대사·보상·중첩 주기는 기획 제안으로 관리한다.

## Context Guidelines

- 이 프로젝트는 Turborepo 기반의 모노레포입니다.
- 작업 시 **현재 작업 중인 디렉토리의 위치**를 먼저 확인하고, 해당 디렉토리 내의 `README.md`나 `PLAN.md`를 우선적으로 참고해줘.
- **README.md**: 기술 스택(React, Next.js, Jotai 등)과 개발 규칙이 담겨 있음.
- **PLAN.md**: 현재 구현 중인 기능과 시뮬레이션 게임의 기획 상세가 담겨 있음.
- 질문에 답하거나 코드를 작성할 때 위 두 파일의 규칙을 절대적으로 준수해줘.
- 진행중이 애매한 점이 있거나 의문점이 있으면 즉시 중단하고 다시 되물어줘.
- 타입스크립트 기반이므로 타입을 정확히 정의하거나 정의하지 않을경우 추론할 수 있도록 any 타입은 명사히지마.

## Core Logic Reminder

- 서버: 게임 로그 및 데이터 처리 담당.
- 클라이언트: Framer Motion 기반의 애니메이션 및 UI 담당.

## 환경 및 도구 규칙

- 이 프로젝트는 패키지 매니저로 **pnpm**을 사용합니다.
- 모든 패키지 설치, 스크립트 실행, 디버깅 시 `npm`이나 `npx` 대신 반드시 `pnpm`을 사용하세요.
- 일회성 도구 실행이 필요할 경우 `pnpm dlx`를 사용합니다.

## 디버깅 및 검증 절차

1. 에러 발생 시 우선 `pnpm test` 또는 `pnpm build`를 통해 로컬에서 직접 확인합니다.
2. 타입 검사가 필요한 경우 `pnpm exec tsc --noEmit`을 실행하여 검증합니다.
3. 모든 작업 완료 후에는 반드시 `pnpm lint`를 실행하여 코드 스타일을 확인합니다.

# Monorepo Guide

이 문서는 `webgame-project`의 모노레포 구조, 종속성 관리 방식 및 빌드 파이프라인에 대해 설명합니다.

## 1. 개요

이 프로젝트는 **Turborepo**와 **pnpm**을 기반으로 하는 모노레포입니다. 여러 패키지와 애플리케이션을 하나의 저장소에서 관리하며, 효율적인 빌드 캐싱과 워크스페이스 간 코드 공유를 목표로 합니다.

## 2. 워크스페이스 구조 (`pnpm-workspace.yaml`)

프로젝트는 크게 두 개의 디렉토리로 나뉩니다:

- **`apps/*`**: 실제 실행 가능한 애플리케이션 (예: `game`, `web`, `docs`)
- **`packages/*`**: 여러 애플리케이션에서 공유하는 공통 라이브러리 및 설정 (예: `eslint-config`, `typescript-config`, `ui`)

## 3. 종속성 관리 (`pnpm`)

- **패키지 추가**: 특정 앱에 패키지를 추가하려면 `pnpm add <package> --filter <app-name>` 명령을 사용합니다.
- **공유 패키지 사용**: `packages/ui`와 같은 내부 패키지를 사용하려면 해당 앱의 `package.json`에 `"@repo/ui": "workspace:*"`와 같이 등록합니다.
- **버전 관리**: 루트 `package.json`의 `pnpm.overrides`를 통해 전역적인 의존성 버전을 강제할 수 있습니다. (현재 `esbuild: 0.27.3` 고정)

## 4. 빌드 파이프라인 (`turbo.json`)

Turborepo를 사용하여 각 패키지의 작업을 오케스트레이션합니다.

### 주요 태스크

- **`build`**: 패키지 간의 의존성 순서(`^build`)를 고려하여 빌드를 수행합니다. `.next/**` 출력을 캐싱합니다.
- **`dev`**: 로컬 개발 서버를 실행합니다. 캐싱을 사용하지 않으며 지속적 실행 모드로 동작합니다.
- **`lint`**: 코드 스타일 및 오류를 검사합니다.
- **`check-types`**: TypeScript 타입 검사를 수행합니다.

### 명령어 실행

루트 디렉토리에서 다음 명령어를 통해 모든 패키지에 대해 작업을 수행할 수 있습니다:

```bash
pnpm build        # 전역 빌드
pnpm dev          # 모든 앱 개발 모드 실행
pnpm lint         # 전역 린트 검사
pnpm check-types  # 전역 타입 검사
```

## 5. 주요 규칙

- **Shared Configs**: `packages/eslint-config`, `packages/typescript-config`를 통해 모든 워크스페이스에 일관된 개발 환경을 제공합니다.
- **Surgical Updates**: 특정 패키지만 수정하거나 빌드할 때는 `--filter` 옵션을 활용하여 시간을 단축하세요.

## 참조 (Subdirectory Instructions)

- [Game App 지침서](./apps/game/GEMINI.md)

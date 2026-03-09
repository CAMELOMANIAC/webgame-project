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

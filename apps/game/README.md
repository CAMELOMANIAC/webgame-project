# Game Application (Vite + React)

이 디렉토리는 `webgame-project` 모노레포 내의 핵심 게임 클라이언트 앱입니다.

![Demo GIF](https://raw.githubusercontent.com/CAMELOMANIAC/webgame-project/8478dde31ca8b1e7cc26d7daade96a9a7ea458fa/apps/game/demo.gif)

[게임 기획 문서 보기](PLAN.md)

## 1. 주요 특징

- **환경**: Vite 기반의 빠르고 가벼운 개발 환경을 사용합니다. (`apps/web`, `apps/docs`의 Next.js 환경과 대조적)
- **라우팅**: `@tanstack/react-router`를 사용한 강력한 타입 안정성 기반의 파일 시스템 라우팅을 채택했습니다.
- **상태 관리**: `Jotai`를 사용하여 미세한(atomic) 단위로 전역 상태를 관리합니다. (`src/atoms`)
- **스타일링**: `styled-components`를 통한 CSS-in-JS 방식을 기본으로 하며, 애니메이션을 위해 `framer-motion (motion)`을 적극 활용합니다.

## 2. 폴더 구조

- **`src/atoms/`**: 게임 내 인벤토리, 무기, 전역 설정 등을 관리하는 Jotai Atoms 정의.
- **`src/components/`**: 재사용 가능한 UI 컴포넌트들.
- **`src/routes/`**: TanStack Router 기반의 페이지 경로 정의. `__root.tsx`는 레이아웃의 루트 역할을 합니다.
- **`src/utils/`**: 서버와 통신하여 전투 결과를 처리하는 커스텀 훅(`useBattlePlayer.ts`), 계산 로직(`calc.ts`) 등 유틸리티 함수 모음.

## 3. 코드 규칙

- **명명 규칙 (Naming Convention)**
  - **파일 및 컴포넌트**: React 컴포넌트 파일 및 클래스는 `PascalCase`를 사용합니다. (예: `BattlePlayer.tsx`)
  - **일반 코드**: 변수, 함수, Atom, 유틸리티 파일 등은 `camelCase`를 사용합니다. (예: `globalAtom.ts`, `weapon.ts`)
  - **Styled-components**: 일반 컴포넌트와 혼동을 피하기 위해 스타일 객체 이름에는 `Styled` 접두어를 붙입니다. (예: `const StyledContainer = styled.div...`)

- **Export 전략**
  - **컴포넌트**: 재사용성을 고려하여 파일당 하나의 컴포넌트를 정의하며, `Default Export`를 기본으로 합니다.
  - **유틸리티 및 함수**: `src/utils` 등에 정의된 공용 함수들은 `Named Export`를 사용하여 필요한 기능만 선택적으로 가져올 수 있게 합니다.

- **컴포넌트 구조**
  - 해당 컴포넌트에만 종속적인 `type`이나 `interface`는 컴포넌트 정의 **상단**에 위치시킵니다.
  - 해당 컴포넌트에만 종속적인 `Styled-components` 객체는 컴포넌트 정의 **하단**에 위치시켜 핵심 로직 가독성을 높입니다.
  - 기능별로 디렉토리를 세분화하며, 공통 스타일은 `Commons.ts`를 활용합니다.

- **로직 분리**: 복잡한 UI/상태 관련 로직은 `src/utils`에 별도 함수로 분리합니다. 핵심 게임 로직(전투 시뮬레이션 등)은 서버(`apps/server`)에서 처리하며, 클라이언트는 API를 통해 받은 데이터를 반응형으로 UI에 업데이트하는 역할에 집중합니다.
- **라우팅**: 새로운 페이지 추가 시 `src/routes` 내에 파일을 생성하고, `TanStack Router` 플러그인이 자동으로 생성하는 `routeTree.gen.ts`를 활용합니다.

## 4. 실행 및 빌드

```bash
pnpm dev    # apps/game 로컬 개발 서버 실행
pnpm build  # 게임 앱 빌드 (TypeScript 검사 포함)
```

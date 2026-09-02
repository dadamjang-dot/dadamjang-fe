# 다담장 프런트엔드

구매자, 입점 파트너, 운영 관리자를 위한 세 클라이언트를 관리하는 pnpm workspace입니다.

## 애플리케이션

| 앱 | 기술 | 역할 |
| --- | --- | --- |
| [`dadamjang-fo`](./apps/dadamjang-fo) | Expo 57, React Native | 상품 탐색과 구매 흐름을 제공하는 네이티브 앱 |
| [`dadamjang-partner`](./apps/dadamjang-partner) | Next.js 16, React 19 | 파트너 상품과 판매 상태를 관리하는 웹 앱 |
| [`dadamjang-bo`](./apps/dadamjang-bo) | Next.js 16, React 19 | 심사와 운영 업무를 처리하는 백오피스 |

## 공통 패키지

| 패키지 | 역할 |
| --- | --- |
| `@dadamjang/graphql-client` | 인증 토큰과 디바이스 정보를 포함한 GraphQL 요청 |
| `@dadamjang/domain` | 가격과 권한 등 플랫폼에 의존하지 않는 도메인 로직 |
| `@dadamjang/design-tokens` | 공통 색상과 간격 토큰 |
| `@dadamjang/mobile` | iOS·Android 전용 모바일 UI |

FO는 TanStack Query와 Expo Router를 사용합니다. iOS UI는 Liquid Glass, Android UI는 Jetpack Compose 기반 컴포넌트로 구현했습니다. Partner와 BO는 SEED Design, TanStack Query, Feature-Sliced Design 규칙을 공유합니다.

## 실행

```bash
pnpm install

cp apps/dadamjang-fo/.env.example apps/dadamjang-fo/.env
pnpm --dir apps/dadamjang-fo start
```

웹 앱은 각 환경 파일을 만든 뒤 실행합니다.

```bash
cp apps/dadamjang-partner/.env.example apps/dadamjang-partner/.env
cp apps/dadamjang-bo/.env.example apps/dadamjang-bo/.env

pnpm partner:dev # http://localhost:3002
pnpm bo:dev      # http://localhost:3001
```

모든 앱은 기본적으로 `http://localhost:5500/graphql`의 Backend API를 사용합니다.

## 검증

```bash
pnpm format:check

pnpm fo:lint && pnpm fo:typecheck && pnpm fo:test
pnpm partner:lint && pnpm partner:typecheck && pnpm partner:test && pnpm partner:build
pnpm bo:lint && pnpm bo:typecheck && pnpm bo:test && pnpm bo:build
```

웹 사용자 흐름은 Playwright 테스트로 별도 검증합니다.

```bash
pnpm partner:test:e2e
pnpm bo:test:e2e
```

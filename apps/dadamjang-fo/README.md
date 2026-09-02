# 다담장 FO

상품 탐색부터 위시, 주문, 스타일 공유까지 이어지는 구매자용 Expo 네이티브 앱입니다.

## 주요 기능

- 개인화 피드, 상품 검색·필터·상세 조회
- 상품·브랜드 위시와 최근 본 상품
- 장바구니, mock checkout, 주문 내역
- 스타일 게시물 작성·조회·좋아요
- 이메일·카카오 인증과 계정 복구·비활성화
- 알림함과 푸시 알림 설정

## 기술

- Expo SDK 57, Expo Router, React Native 0.86
- TanStack Query와 공통 GraphQL client
- iOS Liquid Glass, Android Jetpack Compose UI
- SecureStore 기반 토큰 보관과 NetInfo 기반 네트워크 상태 처리
- Sentry 오류·성능 관측

## 실행

프런트엔드 저장소 루트에서 실행합니다.

```bash
pnpm install
cp apps/dadamjang-fo/.env.example apps/dadamjang-fo/.env
pnpm --dir apps/dadamjang-fo start
```

API 주소는 실행 환경에 맞게 설정합니다.

- iOS 시뮬레이터: `http://localhost:5500/graphql`
- Android 에뮬레이터: `http://10.0.2.2:5500/graphql`
- 실제 기기: `http://<개발 PC의 LAN IP>:5500/graphql`

## 검증

```bash
pnpm fo:lint
pnpm fo:typecheck
pnpm fo:test
```

EAS Build는 `development`, `preview`, `e2e`, `production` 프로필을 제공합니다.

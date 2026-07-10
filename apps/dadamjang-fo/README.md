# dadamjang fo

다담장 구매자 네이티브 앱입니다.

앱 타이틀은 `다담장 - 위시템 저장소`입니다.

## 기능

- 개인화 상품 피드
- 상품 검색
- 상품 상세
- 위시리스트
- 장바구니
- 주문 생성
- 주문 내역
- 이메일 회원가입/로그인
- 카카오 로그인/가입 callback
- MY 프로필

## 기술

- Expo SDK 55
- Expo Router
- `@expo/ui/swift-ui`
- `@expo/ui/jetpack-compose`
- `@legendapp/list`
- TanStack Query
- SecureStore
- NetInfo
- Sentry React Native
- `@dadamjang/graphql-client`
- `@dadamjang/design-tokens`
- `@dadamjang/shared-utils`

## 실행

```bash
cp .env.example .env
cd ../..
pnpm install
cd apps/dadamjang-fo
pnpm start
```

## 검증

```bash
pnpm typecheck
pnpm lint
npx expo config --type public
npx expo export --platform ios --output-dir dist/ios-verify
npx expo export --platform android --output-dir dist/android-verify
```

## 환경 변수

```txt
EXPO_PUBLIC_API_URL=http://localhost:3000/graphql
EXPO_PUBLIC_SENTRY_DSN=
EXPO_PUBLIC_SENTRY_ENVIRONMENT=development
EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1
```

## 네이티브 자산

- iOS icon: `assets/images/icon.png`
- Android adaptive icon: `assets/images/adaptive-icon.png`
- Splash icon: `assets/images/splash-icon.png`
- Splash background: `#4D45DF`

## EAS

`eas.json`에 `development`, `preview`, `production` profile이 있습니다.

Preview workflow:

```txt
.eas/workflows/preview.yml
```

Sentry sourcemap 업로드를 사용하려면 EAS secret에 `SENTRY_AUTH_TOKEN`을 등록해야 합니다.

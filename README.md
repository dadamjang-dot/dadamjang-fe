# dadamjang fe

다담장 사용자 경험을 담당하는 프론트엔드 저장소입니다.

## 앱 구성

- `apps/dadamjang-fo`: 구매자 FO Expo 네이티브 앱
- `apps/dadamjang-partner`: 파트너 웹 앱 예정
- `apps/dadamjang-bo`: 백오피스 웹 앱 예정

현재 구현된 앱은 `apps/dadamjang-fo`입니다.

## FO 앱

- Expo SDK 55 + Expo Router
- iOS UI: `@expo/ui/swift-ui`
- Android UI: `@expo/ui/jetpack-compose`
- 상품 피드/검색/위시리스트: `@legendapp/list`
- 서버 상태: TanStack Query
- 인증 토큰: SecureStore
- 관측: `@sentry/react-native`

## 실행

```bash
cd apps/dadamjang-fo
cp .env.example .env
pnpm install
pnpm start
```

## 검증

```bash
cd apps/dadamjang-fo
pnpm typecheck
pnpm lint
npx expo config --type public
npx expo export --platform ios --output-dir dist/ios-verify
npx expo export --platform android --output-dir dist/android-verify
```

## 환경 변수

- `EXPO_PUBLIC_API_URL`: `dadamjang-be` GraphQL endpoint
- `EXPO_PUBLIC_SENTRY_DSN`: Sentry DSN. 비어 있으면 전송하지 않습니다.
- `EXPO_PUBLIC_SENTRY_ENVIRONMENT`: Sentry environment
- `EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`: Sentry trace sample rate

민감값은 `EXPO_PUBLIC_`에 넣지 않습니다.

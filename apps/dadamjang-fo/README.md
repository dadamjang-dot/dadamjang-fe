# dadamjang fo

다담장 구매자 네이티브 앱입니다. 타이틀은 `다담장 - 위시템 저장소`.

## 기술

- Expo SDK 55 + Expo Router
- iOS: `@expo/ui/swift-ui`
- Android: `@expo/ui/jetpack-compose`
- `@legendapp/list` 무한 상품 피드
- TanStack Query, `fetch`, SecureStore, NetInfo

## 실행

```bash
cp .env.example .env
pnpm install
pnpm start
```

`EXPO_PUBLIC_API_URL`은 GraphQL 엔드포인트입니다. 민감값을 `EXPO_PUBLIC_`에 넣지 않습니다.

## 네이티브 자산

- iOS 아이콘: `assets/images/icon.png`
- Android adaptive icon: `assets/images/adaptive-icon.png`
- splash: `assets/images/splash-icon.png`, `#4D45DF`

## EAS

`development`, `preview`, `production` 프로필이 `eas.json`에 있습니다. 실제 EAS 로그인·빌드·스토어 제출은 수행하지 않습니다.

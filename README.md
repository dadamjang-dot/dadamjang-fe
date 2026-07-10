# dadamjang fe

다담장 구매자·파트너·어드민 사용자 경험을 담당하는 프론트엔드 저장소입니다.

## 앱 구성

- `@dadamjang/app`: 구매자 Expo 앱
- `@dadamjang/partner`: 파트너 Next.js 웹
- `@dadamjang/admin`: 어드민 Next.js 웹

## 구매자 앱 방향

- Expo Router 기반 네이티브 구매 경험
- iOS: Expo UI (`@expo/ui`)
- Android: React Native + `react-native-unistyles`
- 상품 피드·가격 비교 목록: `@legendapp/list`의 `LegendList`

## 데이터 원칙

- GraphQL API는 `dadamjang-be`와 연동합니다.
- 서버 상태는 TanStack Query로 관리합니다.
- 앱 API 요청은 `expo/fetch`를 사용하며 axios는 사용하지 않습니다.
Dadamjang customer, partner, and admin frontend applications

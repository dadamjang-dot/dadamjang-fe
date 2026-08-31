# dadamjang fe

다담장 사용자 경험을 담당하는 프론트엔드 저장소입니다.

## 앱 구성

- `apps/dadamjang-fo`: 구매자 FO Expo 네이티브 앱
- `apps/dadamjang-partner`: 구현된 파트너 웹 앱
- `apps/dadamjang-bo`: 구현된 백오피스 웹 앱

세 앱 모두 구현되어 있으며, FO는 Expo SDK 57 기반 네이티브 앱입니다.

## 패키지 구성

- `packages/graphql-client`: GraphQL 요청, 인증 토큰, 디바이스 식별자 처리
- `packages/design-tokens`: 색상, spacing 등 앱 공통 디자인 토큰
- `packages/domain`: 가격, 권한 등 다담장 도메인의 플랫폼 비의존 순수 함수와 타입

## FO 앱

- Expo SDK 57 + Expo Router
- iOS UI: `@expo/ui/swift-ui`
- Android UI: `@expo/ui/jetpack-compose`
- 상품 피드/검색/위시리스트: `@legendapp/list`
- 서버 상태: TanStack Query
- 인증 토큰: SecureStore
- 관측: `@sentry/react-native`

## 가격 근거 표시 계약

- 상품 목록/검색은 `productPriceSummaries`, 상세는 `productPriceSummary(productId)` 경량 query를 사용합니다.
- 경량 payload의 `basePrice`와 `finalPrice`는 모두 현재 활성 옵션 최저가입니다. 비교가나 옵션 최고가, 할인 차액으로 해석하지 않습니다.
- 옵션 최고/최저 가격 구성과 원천·확인 시각은 `productPriceEvidence(productId, priceRevision)` lazy query로만 조회합니다. 현재 서버에는 기간별 가격 이력, 쿠폰, 배송 원천 데이터가 없으므로 UI도 빈 상태로 명시합니다.
- 가격 근거를 처음 펼칠 때 상품별 1회 `PRICE_EVIDENCE_EXPANDED` Sentry breadcrumb를 남깁니다. 별도 분석 이벤트 저장소는 아직 연결하지 않았습니다.
- React Query key는 `products`, `product-price-summary`, `product-price-evidence`, `offers`로 분리합니다.

## Checkout 정합성 계약

- FO checkout은 실행마다 `expo-crypto`의 `randomUUID()`로 `idempotencyKey`를 생성해 GraphQL mutation에 전달합니다.
- checkout mutation pending 동안 주문 CTA와 mock 실패 CTA는 재클릭되지 않게 막습니다.
- 성공 시 `cart`, `orders` query를 invalidate합니다.
- 실패 시 `cart` query를 refetch해 서버 상태로 복구합니다.
- 직접 `fetch`/`ky`를 쓰지 않고 `GraphQLClient.request()` 기반 `graphqlRequest`만 사용합니다.

## 실행

```bash
cp apps/dadamjang-fo/.env.example apps/dadamjang-fo/.env
pnpm install
pnpm --dir apps/dadamjang-fo start
```

## 검증

```bash
pnpm fo:typecheck
pnpm fo:lint
pnpm --dir apps/dadamjang-fo exec expo config --type public
pnpm --dir apps/dadamjang-fo exec expo export --platform ios --output-dir dist/ios-verify
pnpm --dir apps/dadamjang-fo exec expo export --platform android --output-dir dist/android-verify
```

## 환경 변수

- `EXPO_PUBLIC_API_URL`: `dadamjang-be` GraphQL endpoint
- `EXPO_PUBLIC_SENTRY_DSN`: Sentry DSN. 비어 있으면 전송하지 않습니다.
- `EXPO_PUBLIC_SENTRY_ENVIRONMENT`: Sentry environment
- `EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`: Sentry trace sample rate

민감값은 `EXPO_PUBLIC_`에 넣지 않습니다.

## 모바일 Maestro smoke

원격 mobile E2E는 아직 실행 가능한 경로가 아닙니다. `dadamjang-infra`의 `terraform-apply.yml`은 staging plan만 수행하고 e2e root에는 apply workflow가 없으므로 e2e AWS 리소스와 Terraform output이 아직 없습니다. 따라서 `mobile-e2e` Environment의 `E2E_AWS_REGION`을 비롯한 output-derived 변수도 설정할 수 없으며, 원격 workflow는 AWS 인증 전에 이 사실을 명시적으로 실패시킵니다.

로컬 backend와 개발 빌드된 `com.dadamjang.fo`에는 기존 smoke flow를 그대로 사용할 수 있습니다. 먼저 `dadamjang-be`와 `dadamjang-infra`의 로컬 의존성을 실행합니다. 최초 설치 또는 native 변경 뒤에는 `expo run`으로 앱을 설치하고, 이후에는 dev client를 시작한 뒤 다른 터미널에서 smoke를 실행합니다.

```bash
# iOS simulator
EXPO_PUBLIC_API_URL=http://127.0.0.1:5500/graphql pnpm --dir apps/dadamjang-fo exec expo run:ios
EXPO_PUBLIC_API_URL=http://127.0.0.1:5500/graphql pnpm --dir apps/dadamjang-fo exec expo start --dev-client --ios
E2E_PRODUCT_ID=<local-seeded-product-id> pnpm fo:e2e:ios

# Android emulator
EXPO_PUBLIC_API_URL=http://10.0.2.2:5500/graphql pnpm --dir apps/dadamjang-fo exec expo run:android
EXPO_PUBLIC_API_URL=http://10.0.2.2:5500/graphql pnpm --dir apps/dadamjang-fo exec expo start --dev-client --android
E2E_PRODUCT_ID=<local-seeded-product-id> pnpm fo:e2e:android
```

두 명령은 `apps/dadamjang-fo/.maestro/ios-smoke.yaml`과 `android-smoke.yaml`을 실행한다. Maestro CLI 2.9.0이 PATH에 있어야 하며, `E2E_PRODUCT_ID`는 로컬 backend가 반환하는 상품 ID를 사용한다.

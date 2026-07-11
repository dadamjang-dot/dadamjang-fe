# dadamjang fe

다담장 사용자 경험을 담당하는 프론트엔드 저장소입니다.

## 앱 구성

- `apps/dadamjang-fo`: 구매자 FO Expo 네이티브 앱
- `apps/dadamjang-partner`: 파트너 웹 앱 예정
- `apps/dadamjang-bo`: 백오피스 웹 앱 예정

현재 구현된 앱은 `apps/dadamjang-fo`입니다.

## 패키지 구성

- `packages/graphql-client`: GraphQL 요청, 인증 토큰, 디바이스 식별자 처리
- `packages/design-tokens`: 색상, spacing 등 앱 공통 디자인 토큰
- `packages/domain`: 가격, 권한 등 다담장 도메인의 플랫폼 비의존 순수 함수와 타입

## FO 앱

- Expo SDK 55 + Expo Router
- iOS UI: `@expo/ui/swift-ui`
- Android UI: `@expo/ui/jetpack-compose`
- 상품 피드/검색/위시리스트: `@legendapp/list`
- 서버 상태: TanStack Query
- 인증 토큰: SecureStore
- 관측: `@sentry/react-native`

## 가격 근거 표시 계약

- 상품 목록/검색/비교 첫 query는 `productPriceSummaries` 또는 `comparisonPriceSummaries`만 사용합니다.
- 첫 query payload에는 `productId`, `name`, `thumbnail`, `basePrice`, `finalPrice`, `priceRevision`, `lowestPriceEvidenceSummary`만 포함합니다.
- 가격 이력, 쿠폰 조건, 배송 정책, offer 출처는 `productPriceEvidence(productId, priceRevision)` lazy query로만 조회합니다.
- 가격 근거 펼침 이벤트는 `PRICE_EVIDENCE_EXPANDED`로 기록합니다.
- React Query key는 `products`, `product-price-summary`, `product-price-evidence`, `offers`로 분리합니다.

측정 기준:

- 비교 목록 payload size
- 목록 첫 렌더 시간
- 가격 근거 query p95
- 가격 근거 펼침률
- checkout CTA 클릭률

현재 실측:

- 목록/비교 첫 query scalar field 수: 7
- 분리 전 단일 query 예상 scalar field 수: 14
- 첫 목록 query field 감소율: 50%
- `ProductPriceSummaries` query 크기: 168 bytes
- `ProductPriceEvidence` query 크기: 187 bytes
- 추적 이벤트: `PRICE_EVIDENCE_EXPANDED`

## Checkout 정합성 계약

- FO checkout은 실행마다 `expo-crypto`의 `randomUUID()`로 `idempotencyKey`를 생성해 GraphQL mutation에 전달합니다.
- checkout mutation pending 동안 주문 CTA와 mock 실패 CTA는 재클릭되지 않게 막습니다.
- 성공 시 `cart`, `orders` query를 invalidate합니다.
- 실패 시 `cart` query를 refetch해 서버 상태로 복구합니다.
- 직접 `fetch`/`ky`를 쓰지 않고 `GraphQLClient.request()` 기반 `graphqlRequest`만 사용합니다.

측정 기준:

- checkout 클릭 수
- 중복 checkout 요청 수
- idempotency 재사용 처리 수
- checkout 실패 후 cart cache 복구 여부
- 주문 생성 후 cart/orders cache 불일치 수

현재 실측:

- checkout pending guard 위치: 3
- iOS/Android CTA pending 처리 참조: 12
- mutation 단위 `idempotencyKey` 생성: true
- 성공 후 `cart/orders` invalidate: true
- 실패 후 `cart` refetch: true
- 추적 이벤트: `CHECKOUT_CLICKED`, `CHECKOUT_FAILURE_TEST_CLICKED`

상세 기록: `docs/measurements/fo-problems.md`

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

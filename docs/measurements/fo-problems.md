# FO 문제 실측 기록

측정일: 2026-07-11

측정 범위: `apps/dadamjang-fo`

측정 명령:

```bash
pnpm measure:fo-problems
```

## 문제 1. FO 가격 근거 표시 문제

측정 결과:

| 항목 | 값 |
|---|---:|
| 목록/비교 첫 query scalar field 수 | 7 |
| 가격 근거 lazy query scalar field 수 | 7 |
| 분리 전 단일 query 예상 scalar field 수 | 14 |
| 첫 목록 query field 감소율 | 50% |
| `ProductPriceSummaries` query 크기 | 168 bytes |
| `ProductPriceEvidence` query 크기 | 187 bytes |
| `ComparisonPriceSummaries` query 크기 | 95 bytes |
| 가격 근거 lazy query enabled 조건 | `expanded` |
| 추적 이벤트 | `PRICE_EVIDENCE_EXPANDED` |

해석:

- 상품 목록/비교 첫 query에서 가격 이력, 쿠폰 조건, 배송 정책을 제거해 첫 query field를 14개에서 7개로 줄였다.
- 상세 가격 근거는 사용자가 펼쳤을 때만 `productPriceEvidence(productId, priceRevision)`로 조회한다.
- 현재 수치는 코드 기반 정적 실측이다. 실제 p95 latency, payload byte, frame drop은 운영/스테이징 telemetry 연결 후 추가 측정한다.

## 문제 2. FO Checkout UX 정합성 문제

측정 결과:

| 항목 | 값 |
|---|---:|
| checkout pending guard 위치 | 3 |
| iOS/Android CTA pending 처리 참조 | 12 |
| mutation 단위 `idempotencyKey` 생성 | true |
| 성공 후 `cart/orders` invalidate | true |
| 실패 후 `cart` refetch | true |
| 추적 이벤트 | `CHECKOUT_CLICKED`, `CHECKOUT_FAILURE_TEST_CLICKED` |

검증 명령:

```bash
pnpm test -- order.service.spec.ts catalog.service.spec.ts
```

검증 결과:

| 항목 | 값 |
|---|---:|
| Test Suites | 2 passed / 2 total |
| Tests | 5 passed / 5 total |
| Snapshots | 0 |

해석:

- FO는 checkout mutation pending 동안 재클릭을 막는다.
- checkout intent마다 `expo-crypto`의 `randomUUID()`로 `idempotencyKey`를 생성한다.
- 성공 시 `cart/orders` cache를 갱신하고, 실패 시 `cart`를 서버 상태로 다시 맞춘다.
- BE는 같은 `idempotencyKey` 재요청 시 기존 주문을 반환하는 테스트를 통과했다.
- 실제 중복 클릭률, checkout p95, cart/order mismatch 건수는 telemetry 저장소 연결 후 추가 측정한다.

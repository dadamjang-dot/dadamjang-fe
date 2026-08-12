# 다담장 FE Design System

## 1. Atmosphere & Identity

조용하고 정돈된 상품 탐색 화면이다. 흑백 UI와 이미지 중심의 2열 그리드가 상품 자체를 전면에 두고, 따뜻한 코랄 포인트는 세일·배송 혜택과 현재 상태를 즉시 알리는 데만 사용한다.

## 2. Color

### Palette

| Role            | Token                | Light     | Usage                        |
| --------------- | -------------------- | --------- | ---------------------------- |
| Surface/primary | `colors.surface`     | `#FFFFFF` | 화면과 카드 배경             |
| Surface/subtle  | `colors.primarySoft` | `#FDFDFD` | 이미지 플레이스홀더          |
| Text/primary    | `colors.ink`         | `#111111` | 상품명과 가격                |
| Text/secondary  | `colors.muted`       | `#8A8A8A` | 보조 정보와 원가             |
| Border/default  | `colors.line`        | `#CCCCCC` | 구분선과 버튼 테두리         |
| Accent/primary  | `colors.accent`      | `#F05A47` | 슈퍼세일 라벨, 바로배송 상태 |
| Status/error    | `colors.danger`      | `#E5484D` | 오류와 삭제 상태             |

### Rules

- 기본 표면은 흰색, 텍스트는 `colors.ink`로 유지한다.
- `colors.accent`는 혜택·상태·선택 피드백에만 사용한다.
- 화면 코드에 원시 색상값을 추가하지 않는다.

## 3. Typography

### Scale

| Level   | Size | Weight | Line Height | Usage                 |
| ------- | ---- | ------ | ----------- | --------------------- |
| Body    | 14px | 400    | 19px        | 상품명                |
| Price   | 15px | 700    | auto        | 판매가                |
| Caption | 12px | 500    | auto        | 원가와 상태 보조 정보 |
| Label   | 13px | 600    | auto        | 필터와 상태 라벨      |
| Section | 16px | 700    | auto        | 상태 메시지           |

### Font Stack

- Primary: 시스템 산세리프
- Mono: 숫자에 `tabular-nums` 사용

## 4. Spacing & Layout

### Base Unit

모든 간격은 `@dadamjang/design-tokens`의 4px 기반 토큰을 우선 사용한다.

| Token        | Value | Usage                     |
| ------------ | ----- | ------------------------- |
| `spacing.xs` | 4px   | 아이콘과 라벨 사이        |
| `spacing.sm` | 8px   | 카드 내부 기본 간격       |
| `spacing.md` | 12px  | 이미지 모서리와 상태 간격 |
| `spacing.lg` | 16px  | 화면 여백과 행 간격       |
| `spacing.xl` | 24px  | 리스트 하단 여백          |

### Grid

- 화면 좌우 여백: 16px
- 상품 열: 2열, 열 너비 48%
- 상품 행 간격: 16px
- 상품 이미지: 0.78 aspect ratio, 12px radius

## 5. Components

### ProductCard

- **Structure**: 상품 본문 버튼, 이미지, 좋아요 버튼, 선택적 세일 라벨, 상품명, 가격, 선택적 배송 상태
- **Variants**: 기본, 슈퍼세일, 바로배송, 슈퍼세일+바로배송
- **Spacing**: `spacing.sm` 카드 내부, `spacing.md` 상태 텍스트
- **States**: default, pressed, liked, unliked, loading image, empty image
- **Accessibility**: 본문과 좋아요를 별도 버튼으로 제공하고 좋아요 상태를 accessibilityState로 노출
- **Motion**: React Native Pressable의 pressed 피드백만 사용
- **Layout**: 2열 grid row

### FilterChip

- **Structure**: 버튼, 라벨, 선택적 disclosure 아이콘
- **Variants**: 기본, active, mini
- **States**: default, active, pressed
- **Accessibility**: button role과 selected state 제공

## 6. Motion & Interaction

- 상품 본문과 좋아요 버튼은 서로 독립적인 Pressable이다.
- 좋아요 전환은 즉시 화면에 반영하고 서버 오류 시 이전 상태로 되돌린다.
- 별도 애니메이션은 추가하지 않는다.

## 7. Depth & Surface

### Strategy

`borders-only`

- 카드 자체에는 그림자를 사용하지 않는다.
- 이미지와 버튼은 radius, 구분선, 포인트 색으로 상태를 전달한다.

## 8. Accessibility Constraints & Accepted Debt

### Constraints

- 상품 본문과 좋아요 버튼 모두 VoiceOver가 구분할 수 있어야 한다.
- 좋아요 버튼은 `accessibilityState.selected`로 현재 상태를 노출한다.
- 본문 텍스트는 14px 이상을 유지한다.

### Accepted Debt

| Item                               | Location                              | Why accepted          | Owner / Exit                      |
| ---------------------------------- | ------------------------------------- | --------------------- | --------------------------------- |
| UI 상태 확인용 상품 seed           | `dadamjang-be/migrations/0005_catalog_demo_products.sql` | 세일·배송 상태 검증용 실제 카탈로그 데이터 | 운영 상품 데이터로 교체 |

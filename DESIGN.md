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
| Brand/Kakao     | `colors.kakao`       | `#FEE500` | 카카오 로그인 버튼 전용      |

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
- WISH 상품 열: 1열, 전체 너비
- WISH 상품 이미지: 0.64 aspect ratio, 12px radius

## 5. Components

### ProductCard

- **Structure**: 상품 본문 버튼, 이미지, 좋아요 버튼, 선택적 세일 라벨, 상품명, 가격, 선택적 배송 상태
- **Variants**: 기본, 슈퍼세일, 바로배송, 슈퍼세일+바로배송
- **Spacing**: `spacing.sm` 카드 내부, `spacing.md` 상태 텍스트
- **States**: default, pressed, liked, unliked, loading image, empty image
- **Accessibility**: 본문과 좋아요를 별도 버튼으로 제공하고 좋아요 상태를 accessibilityState로 노출
- **Motion**: React Native Pressable의 pressed 피드백만 사용
- **Layout**: 2열 grid row

### WishProductCard

- **Structure**: 상품 본문 버튼, 세로형 전체 너비 이미지, 세일·품절 상태, 브랜드명, 상품명, 가격, 선택적 배송 상태, 별도 위시 해제 버튼
- **Variants**: 저장 상품, 최근 본 상품
- **Spacing**: `spacing.sm` 카드 내부, `spacing.lg` 카드 간격
- **States**: default, pressed, on-sale, sold-out, removed
- **Accessibility**: 본문과 위시 해제 버튼을 분리하고 품절 상태를 텍스트로 제공
- **Motion**: React Native Pressable의 pressed 피드백만 사용
- **Layout**: WISH에서만 1열 row와 0.64 aspect ratio 세로형 이미지

### FilterChip

- **Structure**: 버튼, 라벨, 선택적 disclosure 아이콘
- **Variants**: 기본, active, mini
- **States**: default, active, pressed
- **Accessibility**: button role과 selected state 제공

### StyleCategoryBar

- **Structure**: `전체 / 랭킹 / 스니커즈 / 의류 / 잡화` 48px line tab
- **States**: default, selected, pressed
- **Accessibility**: selected state를 VoiceOver에 노출
- **Layout**: horizontal scroll, 화면 좌우 16px 여백

### WishCategoryBar

- **Structure**: `상품 / 스타일 / 브랜드 / 최근 본 상품` 48px line tab
- **States**: default, selected, pressed
- **Accessibility**: selected state를 VoiceOver에 노출
- **Layout**: horizontal scroll, 화면 좌우 16px 여백

### WishState

- **Structure**: 상태 제목, 보조 문구, 선택적 재시도 또는 단일 CTA 버튼
- **Variants**: 중앙 정렬 loading/error/empty, 상단 정렬 signed-out
- **Layout**: signed-out은 category bar 아래 `spacing.xxl * 4` 간격부터 시작하고 CTA는 144pt 고정 폭을 사용
- **Accessibility**: CTA는 명시적인 button label을 제공

### InlineSortBar

- **Structure**: `추천순 / 인기순 / 최신순` 오른쪽 정렬 inline controls
- **States**: default, selected, pressed
- **Rule**: 랭킹 탭에서는 숨기고 인기순으로 고정

### StylePostCard

- **Structure**: 커버, 작성자, 본문 요약, 해시태그, 연결 상품 수, 좋아요
- **Layout**: 2열 row, 상품 카드와 동일한 16px 좌우 여백과 12px 이미지 radius
- **States**: default, pressed, liked, unliked, ranking number
- **Accessibility**: 카드 본문과 좋아요를 별도 버튼으로 제공하고 selected state를 노출

### StyleComposer

- **Structure**: 카테고리, 구매 상품 form sheet, 이미지 picker, 본문, `@브랜드`, 해시태그 chip, 등록
- **States**: empty, selected, uploading, submitting, validation error
- **Rules**: 구매 상품 1~5개, 이미지 1~5장, 본문 1~1000자, 해시태그 0~10개
- **Accessibility**: 이미지 삭제, 상품 선택, 좋아요 상태를 명시적인 label과 selected state로 제공

### Storybook harness

- `StyleCategoryBar`: 전체, 랭킹, 카테고리 선택 상태
- `InlineSortBar`: 추천순, 인기순, 최신순 선택 상태
- `StylePostCard`: 기본, 랭킹, liked 상태
- `StyleComposer`: 빈 상태, 상품·이미지·태그 선택, 검증 오류 상태

### AuthStackHeader

- **Structure**: native Stack 제목, 최초 화면 `xmark` icon-only `ActionButton`, 하위 화면 native back
- **States**: root, pushed, direct-entry close
- **Rules**: root `/auth`는 제목과 하단 경계선 없이 닫기만 표시한다. iOS에서는 header item의 시스템 glass를 숨기고 `ActionButton` 자체 glass만 사용하며 16pt trailing inset과 버튼 중심축을 `ProductHeader` 오른쪽 액션에 맞춘다. `xmark`는 18pt를 사용한다. 하위 화면은 제목을 표시한다. swipe/back와 Android hardware back을 허용하고 직접 진입 닫기는 `/`로 이동

### AuthField

- **Structure**: 항상 보이는 label, input, 선택적 우측 action, 오류 문구
- **States**: empty, focused, invalid, disabled, verified
- **Accessibility**: label과 input을 연결하고 오류를 alert로 노출
- **Layout**: 최소 입력 높이 52pt, 버튼 최소 높이 48pt

### ConsentChecklist

- **Structure**: 모두 동의, 필수·선택 약관 행, 상세 이동 버튼
- **States**: checked, mixed, unchecked
- **Rules**: 모두 동의는 4개 전체를 토글하고 필수 3개만 동의해도 가입 가능
- **Accessibility**: 각 행의 checked 상태와 필수·선택 여부를 읽음

### IdentityProviderSheet

- **Structure**: Expo Router native `formSheet` 제목, 토스 인증, 카카오 인증, 네이버 인증
- **States**: idle, pending, canceled, failed, expired, verified
- **Rules**: `shop-filter-sheet.tsx`와 같은 root sheet route. 닫기·실패·만료 후에도 상위 폼 상태를 유지

### Auth social actions

- `카카오로 시작하기`만 `colors.kakao`를 사용한다.
- 이메일·가입·복구 액션은 흑백과 `borders-only` 표면을 유지한다.
- pending 중 중복 제출을 막고 error/success 상태는 화면 텍스트로 제공한다.

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

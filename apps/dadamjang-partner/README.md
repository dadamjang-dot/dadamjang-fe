# 다담장 Partner

입점 파트너가 상품 등록부터 심사 요청, 판매 상태 관리까지 처리하는 Next.js 웹 앱입니다.

## 주요 기능

- 상품 상태를 요약하는 파트너 대시보드
- 상품 초안 등록·수정과 이미지 업로드
- 옵션·SKU 가격과 재고 관리
- 상품 심사 요청, 반려 사유 확인, 게시 처리
- 파트너 계정 로그인과 세션 갱신

## 기술

- Next.js 16 App Router, React 19, TypeScript
- SEED Design, TanStack Query, GraphQL
- Feature-Sliced Design 구조
- Vitest 단위 테스트와 Playwright 사용자 흐름 테스트

## 실행

프런트엔드 저장소 루트에서 실행합니다.

```bash
pnpm install
cp apps/dadamjang-partner/.env.example apps/dadamjang-partner/.env
pnpm partner:dev
```

앱은 `http://localhost:3002`에서 실행되며 `DADAMJANG_API_URL`로 Backend 주소를 설정합니다.

## 검증

```bash
pnpm partner:lint
pnpm partner:typecheck
pnpm partner:test
pnpm partner:test:e2e
pnpm partner:build
```

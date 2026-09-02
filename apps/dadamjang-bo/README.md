# 다담장 BO

파트너와 상품 심사, 주문 운영을 담당하는 관리자용 Next.js 백오피스입니다.

## 주요 기능

- 승인 대기 업무와 최근 변경을 보여주는 대시보드
- 파트너·상품 검토와 승인·반려
- 주문 조회와 상태 변경
- 계층형 카테고리 관리
- 관리자 초대와 비밀번호 복구
- 운영 변경 이력을 확인하는 감사 로그

## 기술

- Next.js 16 App Router, React 19, TypeScript
- SEED Design, TanStack Query, GraphQL
- Feature-Sliced Design 구조
- Vitest 단위 테스트와 Playwright 사용자 흐름 테스트

## 실행

프런트엔드 저장소 루트에서 실행합니다.

```bash
pnpm install
cp apps/dadamjang-bo/.env.example apps/dadamjang-bo/.env
pnpm bo:dev
```

앱은 `http://localhost:3001`에서 실행되며 `DADAMJANG_API_URL`로 Backend 주소를 설정합니다.

## 검증

```bash
pnpm bo:lint
pnpm bo:typecheck
pnpm bo:test
pnpm bo:test:e2e
pnpm bo:build
```

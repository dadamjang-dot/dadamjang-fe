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

운영 BFF는 `DADAMJANG_TRUSTED_IP_HEADER`와 `DADAMJANG_BFF_SECRET`이 필수입니다. ingress가 실제 사용자 IP 한 개로 덮어쓰는 헤더만 지정하고 Next 직접 접근을 차단해야 합니다. 32자 이상의 동일한 서버 secret을 BO·Partner·Backend에 주입합니다. 설정이 없거나 ingress IP가 유효하지 않으면 503으로 실패합니다. HTTPS와 secret 로그 마스킹을 포함한 [공통 BFF 배포 계약](../dadamjang-bo/README.md#bopartner-bff-운영-배포-계약)을 확인하세요. 로컬 개발에서는 두 값을 모두 비워 둘 수 있습니다.

## 검증

```bash
pnpm partner:lint
pnpm partner:typecheck
pnpm partner:test
pnpm partner:test:e2e
pnpm partner:build
```

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

### BO·Partner BFF 운영 배포 계약

BO와 Partner의 운영 서버는 `DADAMJANG_TRUSTED_IP_HEADER`와 `DADAMJANG_BFF_SECRET`을 설정해야 합니다. 누락되거나 ingress IP가 유효하지 않으면 GraphQL 요청은 503으로 실패합니다. 로컬 개발에서는 두 값을 모두 비워 둘 수 있습니다.

- Next 서버로의 직접 접근을 네트워크에서 막고, 신뢰하는 ingress만 접근하게 합니다. ingress는 `X-Real-IP` 같은 전용 헤더를 연결의 실제 사용자 IP 한 개로 **덮어써야** 합니다. `DADAMJANG_TRUSTED_IP_HEADER=x-real-ip`는 이 조건을 만족할 때만 설정합니다. 클라이언트가 제공한 헤더를 보존하거나 임의 `X-Forwarded-For` 목록을 전달하는 설정은 지원하지 않습니다.
- `DADAMJANG_BFF_SECRET`에는 32자 이상의 무작위 값을 생성해 BO·Partner·Backend의 서버 전용 secret으로 동일하게 주입합니다. `NEXT_PUBLIC_` 환경변수로 노출하지 않습니다. BFF→API는 HTTPS를 사용하고, 프록시와 애플리케이션 로그에서 `x-dadamjang-bff-secret`을 마스킹합니다.
- BFF는 ingress IP를 `x-dadamjang-client-ip`로 전달하고 서버 secret으로 인증합니다. Backend는 이를 검증한 경우에만 admission IP로 사용합니다. 일반 API 클라이언트는 기존 `req.ip`를 사용합니다. Backend의 `TRUST_PROXY=true`는 기존 API ALB 한 홉용으로 유지하며 두 홉으로 늘리지 않습니다.

현재 Terraform에는 API ALB만 정의되어 있습니다. 위 Next ingress의 헤더 덮어쓰기와 직접 접근 차단은 Next 호스팅 환경에 설정해야 합니다. 두 포털에 같은 계약을 적용해야 하며, 적용 전 운영 전환하지 않습니다.

## 검증

```bash
pnpm bo:lint
pnpm bo:typecheck
pnpm bo:test
pnpm bo:test:e2e
pnpm bo:build
```

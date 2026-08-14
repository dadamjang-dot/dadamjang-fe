"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getPartnerDashboard, listProducts } from "@/shared/api";
import { myPartner } from "@/shared/auth";
import { effectiveProductState } from "@/entities/product";

const labels = [
  ["draftCount", "임시 저장"],
  ["pendingCount", "승인 대기"],
  ["rejectedCount", "승인 반려"],
  ["publishedCount", "판매 중"],
] as const;
const stateLabel = {
  DRAFT: "임시 저장",
  PENDING: "승인 대기",
  REJECTED: "승인 반려",
  APPROVED: "승인 완료",
  PUBLISHED: "판매 중",
};
export const DashboardPage = () => {
  const counts = useQuery({
    queryKey: ["dashboard"],
    queryFn: getPartnerDashboard,
  });
  const partner = useQuery({ queryKey: ["my-partner"], queryFn: myPartner });
  const recent = useQuery({
    queryKey: ["products", "recent"],
    queryFn: () => listProducts({ first: 5 }),
  });
  const rejected = useQuery({
    queryKey: ["products", "rejected-attention"],
    queryFn: () => listProducts({ state: "REJECTED", first: 1 }),
  });
  if (counts.isError)
    return (
      <section>
        <h1>대시보드</h1>
        <p role="alert">대시보드를 불러오지 못했습니다.</p>
      </section>
    );
  const metrics = counts.data?.myPartnerDashboard;
  const rejectedProduct = rejected.data?.myPartnerProducts.nodes[0];
  return (
    <section>
      <header className="between">
        <div>
          <h1>대시보드</h1>
          <p>
            {partner.data?.myPartner?.brand?.name ?? "연결 브랜드"} 상품 운영
            현황입니다.
          </p>
        </div>
        <Link className="button" href="/products/new">
          상품 등록
        </Link>
      </header>
      <div className="summary dashboard-summary" aria-label="상품 상태 현황">
        {labels.map(([key, label]) => (
          <div key={key}>
            <span>{label}</span>
            <strong>{metrics?.[key] ?? 0}</strong>
          </div>
        ))}
      </div>
      {(metrics?.rejectedCount ?? 0) > 0 && (
        <aside className="attention">
          <div>
            <strong>
              확인이 필요한 반려 상품이 {metrics?.rejectedCount}개 있습니다.
            </strong>
            <p>
              반려 사유를 확인하고 상품 정보를 수정해 다시 심사를 요청하세요.
            </p>
          </div>
          {rejectedProduct && (
            <Link href={`/products/${rejectedProduct.productId}/edit`}>
              반려 사유 확인
            </Link>
          )}
        </aside>
      )}
      <div className="status-guide">
        <h2>상품 상태 안내</h2>
        <p>
          임시 저장 → 심사 중 → 승인 후 판매 게시 순서로 진행됩니다. 반려 상품은
          수정 후 다시 요청할 수 있습니다.
        </p>
      </div>
      <h2>최근 상품</h2>
      {recent.isPending && <p>최근 상품을 불러오고 있습니다.</p>}
      {recent.isError && <p role="alert">최근 상품을 불러오지 못했습니다.</p>}
      {recent.data && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>상품명</th>
                <th>SKU</th>
                <th>상태</th>
                <th>수정일</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {recent.data.myPartnerProducts.nodes.map((product) => (
                <tr key={product.productId}>
                  <td>{product.title}</td>
                  <td>{product.skus[0]?.code ?? "-"}</td>
                  <td>{stateLabel[effectiveProductState(product)]}</td>
                  <td>
                    {new Date(product.updatedAt).toLocaleDateString("ko-KR")}
                  </td>
                  <td>
                    <Link href={`/products/${product.productId}/edit`}>
                      보기
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

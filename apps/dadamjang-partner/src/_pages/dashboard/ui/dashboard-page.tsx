"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { listProducts, requestGraphQl } from "@/shared/api";
import { effectiveProductState } from "@/entities/product";
export const DashboardPage = () => {
  const counts = useQuery({
    queryKey: ["dashboard"],
    queryFn: () =>
      requestGraphQl<{ myPartnerDashboard: Record<string, number> }>(
        `query PartnerDashboard { myPartnerDashboard { draftCount pendingCount rejectedCount approvedCount publishedCount } }`,
      ),
  });
  const recent = useQuery({
    queryKey: ["products", "recent"],
    queryFn: () => listProducts({ first: 5 }),
  });
  if (counts.isError)
    return (
      <section>
        <h1>대시보드</h1>
        <p role="alert">대시보드를 불러오지 못했습니다.</p>
      </section>
    );
  const labels = [
    ["draftCount", "임시 저장"],
    ["pendingCount", "검토 중"],
    ["rejectedCount", "반려"],
    ["approvedCount", "승인"],
    ["publishedCount", "판매 중"],
  ] as const;
  return (
    <section>
      <header>
        <h1>대시보드</h1>
        <p>상품 현황을 한눈에 확인하세요.</p>
      </header>
      <div className="cards">
        {labels.map(([k, l]) => (
          <article key={k}>
            <span>{l}</span>
            <strong>{counts.data?.myPartnerDashboard[k] ?? 0}</strong>
          </article>
        ))}
      </div>
      <h2>최근 상품</h2>
      <div className="panel">
        {recent.data?.myPartnerProducts.nodes.map((p) => (
          <Link
            className="row"
            href={`/products/${p.productId}`}
            key={p.productId}
          >
            <span>{p.title}</span>
            <b>{effectiveProductState(p)}</b>
          </Link>
        ))}
      </div>
    </section>
  );
};

"use client";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ActionButton } from "@seed-design/react";
import { listProducts } from "@/shared/api";
import { PRODUCT_STATES } from "@/entities/product";
export const ProductsPage = () => {
  const [filter, setFilter] = useState({ query: "", state: "" });
  const products = useInfiniteQuery({
    queryKey: ["products", filter],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listProducts({
        query: filter.query || undefined,
        state: filter.state || undefined,
        after: pageParam,
        first: 20,
      }),
    getNextPageParam: (p) =>
      p.myPartnerProducts.hasNextPage
        ? (p.myPartnerProducts.nextCursor ?? undefined)
        : undefined,
  });
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    setFilter({ query: String(d.get("query")), state: String(d.get("state")) });
  };
  return (
    <section>
      <header className="between">
        <div>
          <h1>상품 관리</h1>
          <p>상품을 등록하고 심사 및 판매 상태를 관리하세요.</p>
        </div>
        <Link className="button" href="/products/new">
          상품 등록
        </Link>
      </header>
      <form className="filters" onSubmit={submit}>
        <input name="query" aria-label="상품 검색" placeholder="상품명 검색" />
        <select name="state" aria-label="상품 상태">
          <option value="">전체 상태</option>
          {PRODUCT_STATES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <ActionButton type="submit">검색</ActionButton>
      </form>
      <div className="panel">
        {products.data?.pages
          .flatMap((x) => x.myPartnerProducts.nodes)
          .map((p) => (
            <Link
              className="row"
              href={`/products/${p.productId}`}
              key={p.productId}
            >
              <span>{p.title}</span>
              <span>{p.brand?.name ?? "연결 브랜드 없음"}</span>
              <b>{p.status}</b>
            </Link>
          ))}
        {products.hasNextPage && (
          <ActionButton
            variant="neutralOutline"
            loading={products.isFetchingNextPage}
            onClick={() => products.fetchNextPage()}
          >
            더 보기
          </ActionButton>
        )}
      </div>
    </section>
  );
};

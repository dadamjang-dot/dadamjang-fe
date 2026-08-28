"use client";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ActionButton } from "@seed-design/react";
import { PartnerTextField } from "@/shared/ui";
import {
  catalogOptions,
  getPartnerDashboard,
  listProducts,
} from "@/shared/api";
import { PRODUCT_STATES } from "@/entities/product";

const stateLabel = {
  DRAFT: "임시 저장",
  PENDING: "심사 중",
  REJECTED: "반려",
  APPROVED: "승인",
  PUBLISHED: "판매 중",
};

export const ProductsPage = () => {
  const [filter, setFilter] = useState({
    query: "",
    state: "",
    categoryId: "",
  });
  const options = useQuery({
    queryKey: ["catalog-options"],
    queryFn: catalogOptions,
  });
  const dashboard = useQuery({
    queryKey: ["dashboard"],
    queryFn: getPartnerDashboard,
  });
  const products = useInfiniteQuery({
    queryKey: ["products", filter],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listProducts({
        query: filter.query || undefined,
        state: filter.state || undefined,
        categoryId: filter.categoryId || undefined,
        after: pageParam,
        first: 20,
      }),
    getNextPageParam: (page) =>
      page.myPartnerProducts.hasNextPage
        ? (page.myPartnerProducts.nextCursor ?? undefined)
        : undefined,
  });
  const nodes =
    products.data?.pages.flatMap((page) => page.myPartnerProducts.nodes) ?? [];
  const categories = options.data?.catalogFilterOptions?.categories ?? [];
  const metrics = dashboard.data?.myPartnerDashboard;
  const counts = [
    ["DRAFT", metrics?.draftCount ?? 0],
    ["PENDING", metrics?.pendingCount ?? 0],
    ["REJECTED", metrics?.rejectedCount ?? 0],
    ["APPROVED", metrics?.approvedCount ?? 0],
    ["PUBLISHED", metrics?.publishedCount ?? 0],
  ] as const;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setFilter({
      query: String(data.get("query")),
      state: String(data.get("state")),
      categoryId: String(data.get("categoryId")),
    });
  };
  return (
    <section>
      <header className="between">
        <div>
          <h1>상품 관리</h1>
          <p>상품명 또는 SKU로 검색하고 판매 현황을 관리하세요.</p>
        </div>
        <Link className="button" href="/products/new">
          상품 등록
        </Link>
      </header>
      <div className="summary" aria-label="상품 상태 요약">
        {counts.map(([state, count]) => (
          <div key={state}>
            <span>{stateLabel[state]}</span>
            <strong>{count}</strong>
          </div>
        ))}
      </div>
      <form className="filters" onSubmit={submit}>
        <PartnerTextField
          label="상품 검색"
          name="query"
          placeholder="상품명 또는 SKU"
        />
        <select name="categoryId" aria-label="카테고리">
          <option value="">전체 카테고리</option>
          {categories.map((category) => (
            <option key={category.categoryId} value={category.categoryId}>
              {category.name}
            </option>
          ))}
        </select>
        <select name="state" aria-label="상품 상태">
          <option value="">전체 상태</option>
          {PRODUCT_STATES.map((state) => (
            <option key={state}>{state}</option>
          ))}
        </select>
        <ActionButton type="submit">검색</ActionButton>
      </form>
      {options.isPending && <p>필터를 불러오고 있습니다.</p>}
      {options.isError && (
        <p role="alert">
          카테고리 필터를 불러오지 못했습니다. 전체 상품은 계속 확인할 수
          있습니다.
        </p>
      )}
      {products.isPending && <p>상품을 불러오고 있습니다.</p>}
      {products.isError && <p role="alert">상품 목록을 불러오지 못했습니다.</p>}
      {!products.isPending && !products.isError && nodes.length === 0 && (
        <div className="panel empty">조건에 맞는 상품이 없습니다.</div>
      )}
      {nodes.length > 0 && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>상품</th>
                <th>카테고리</th>
                <th>판매가</th>
                <th>재고</th>
                <th>심사 상태</th>
                <th>판매 상태</th>
                <th>수정일</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {nodes.map((product) => {
                const category =
                  categories.find(
                    (item) => item.categoryId === product.categoryId,
                  )?.name ?? "미분류";
                const price = product.skus.length
                  ? Math.min(...product.skus.map((sku) => sku.price))
                  : 0;
                const stock = product.skus.reduce(
                  (sum, sku) => sum + sku.stock,
                  0,
                );
                return (
                  <tr key={product.productId}>
                    <td>
                      <div className="product-cell">
                        {product.imageUrls[0] ? (
                          <Image
                            src={product.imageUrls[0]}
                            alt=""
                            width={48}
                            height={48}
                          />
                        ) : (
                          <span className="thumbnail" aria-hidden="true" />
                        )}
                        <div>
                          <strong>{product.title}</strong>
                          <small>
                            {product.skus.map((sku) => sku.code).join(", ") ||
                              "SKU 없음"}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>{category}</td>
                    <td>{price.toLocaleString()}원</td>
                    <td>{stock}</td>
                    <td>{stateLabel[product.approvalStatus]}</td>
                    <td>
                      {product.status === "PUBLISHED" ? "판매 중" : "미게시"}
                    </td>
                    <td>
                      {new Date(product.updatedAt).toLocaleDateString("ko-KR")}
                    </td>
                    <td>
                      <Link href={`/products/${product.productId}/edit`}>
                        수정
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {products.hasNextPage && (
        <ActionButton
          variant="neutralOutline"
          loading={products.isFetchingNextPage}
          onClick={() => products.fetchNextPage()}
        >
          더 보기
        </ActionButton>
      )}
    </section>
  );
};

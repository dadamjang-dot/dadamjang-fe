"use client";

import { ActionButton } from "@seed-design/react";
import { useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { formatKrw } from "@dadamjang/domain";
import { adminStatusLabel } from "@/entities/operation-status";
import type { AdminOrder } from "@/shared/api";
import { formatDateTime } from "@/shared/lib";
import {
  AdminInput,
  AdminSelect,
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  FilterControl,
  LoadMore,
  Page,
  PageHeader,
  StatusBadge,
  TableCard,
  TableSkeleton,
  adminUiStyles,
  type DataTableColumn,
} from "@/shared/ui";
import { orderQueries, type OrderFilter } from "../api/order-queries";

const INITIAL_FILTER: OrderFilter = {
  query: "",
  status: "",
  createdFrom: "",
  createdTo: "",
};

const COLUMNS: DataTableColumn<AdminOrder>[] = [
  {
    key: "number",
    header: "주문번호",
    render: (node) => (
      <Link
        className={adminUiStyles.tableLink}
        href={`/orders/${node.orderId}`}
      >
        {node.orderNumber}
      </Link>
    ),
  },
  {
    key: "buyer",
    header: "구매자",
    render: (node) => `${node.buyerUserid} · ${node.buyerEmail}`,
  },
  {
    key: "status",
    header: "상태",
    render: (node) => (
      <StatusBadge status={node.status} label={adminStatusLabel(node.status)} />
    ),
  },
  {
    key: "amount",
    header: "결제 금액",
    numeric: true,
    render: (node) => formatKrw(node.totalAmount),
  },
  {
    key: "items",
    header: "수량",
    numeric: true,
    render: (node) => node.itemCount.toLocaleString(),
  },
  {
    key: "createdAt",
    header: "주문일",
    render: (node) => formatDateTime(node.createdAt),
  },
];

export const OrdersPage = () => {
  const [draft, setDraft] = useState<OrderFilter>(INITIAL_FILTER);
  const [filter, setFilter] = useState<OrderFilter>(INITIAL_FILTER);
  const list = useInfiniteQuery(orderQueries.list(filter));
  const nodes = list.data?.pages.flatMap((page) => page.nodes) ?? [];
  const totalCount = list.data?.pages[0]?.totalCount ?? 0;
  return (
    <Page>
      <PageHeader
        title="주문 관리"
        description={`검색 결과 ${totalCount.toLocaleString()}건`}
      />
      <FilterBar onSubmit={() => setFilter({ ...draft })}>
        <FilterControl label="검색" wide>
          <AdminInput
            placeholder="주문번호, 구매자 아이디 또는 이메일"
            value={draft.query}
            onChange={(event) =>
              setDraft({ ...draft, query: event.target.value })
            }
          />
        </FilterControl>
        <FilterControl label="상태">
          <AdminSelect
            value={draft.status}
            onChange={(event) =>
              setDraft({ ...draft, status: event.target.value })
            }
          >
            <option value="">전체</option>
            <option value="PAYMENT_PENDING">결제 대기</option>
            <option value="PAID">결제 완료</option>
            <option value="FULFILLING">처리 중</option>
            <option value="COMPLETED">처리 완료</option>
            <option value="CANCELLED">취소</option>
            <option value="FAILED">실패</option>
          </AdminSelect>
        </FilterControl>
        <FilterControl label="시작일">
          <AdminInput
            type="date"
            value={draft.createdFrom}
            onChange={(event) =>
              setDraft({ ...draft, createdFrom: event.target.value })
            }
          />
        </FilterControl>
        <FilterControl label="종료일">
          <AdminInput
            type="date"
            value={draft.createdTo}
            onChange={(event) =>
              setDraft({ ...draft, createdTo: event.target.value })
            }
          />
        </FilterControl>
        <ActionButton type="submit" variant="neutralSolid">
          조회
        </ActionButton>
      </FilterBar>
      <TableCard>
        {list.isPending ? <TableSkeleton /> : null}
        {list.isError ? <ErrorState retry={() => list.refetch()} /> : null}
        {nodes.length ? (
          <DataTable
            caption="주문 목록"
            columns={COLUMNS}
            nodes={nodes}
            rowKey={(node) => node.orderId}
          />
        ) : null}
        {!list.isPending && !list.isError && nodes.length === 0 ? (
          <EmptyState
            title="주문이 없습니다"
            description="검색 조건을 변경해보세요."
          />
        ) : null}
        {list.hasNextPage ? (
          <LoadMore
            pending={list.isFetchingNextPage}
            onClick={() => list.fetchNextPage()}
          />
        ) : null}
      </TableCard>
    </Page>
  );
};

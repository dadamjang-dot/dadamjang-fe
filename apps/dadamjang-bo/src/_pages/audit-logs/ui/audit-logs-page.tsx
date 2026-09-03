"use client";

import { ActionButton } from "@seed-design/react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  adminActionLabel,
  adminEntityLabel,
} from "@/entities/operation-status";
import type { AdminAuditLog } from "@/shared/api";
import { formatDateTime, formatMetadata } from "@/shared/lib";
import {
  AdminInput,
  AdminSelect,
  DataTable,
  DetailGrid,
  DetailPanel,
  DetailSection,
  EmptyState,
  ErrorState,
  FilterBar,
  FilterControl,
  LoadMore,
  Metadata,
  Page,
  PageHeader,
  TableCard,
  TableSkeleton,
  type DataTableColumn,
} from "@/shared/ui";
import { auditLogQueries, type AuditLogFilter } from "../api/audit-log-queries";

const EMPTY_FILTER: AuditLogFilter = {
  actorUserId: "",
  action: "",
  entityType: "",
  createdFrom: "",
  createdTo: "",
};

export const AuditLogsPage = () => {
  const [draft, setDraft] = useState<AuditLogFilter>(EMPTY_FILTER);
  const [filter, setFilter] = useState<AuditLogFilter>(EMPTY_FILTER);
  const [selected, setSelected] = useState<AdminAuditLog | null>(null);
  const logs = useInfiniteQuery(auditLogQueries.list(filter));
  const nodes = logs.data?.pages.flatMap((page) => page.nodes) ?? [];
  const totalCount = logs.data?.pages[0]?.totalCount ?? 0;
  const columns: DataTableColumn<AdminAuditLog>[] = [
    {
      key: "createdAt",
      header: "일시",
      render: (node) => formatDateTime(node.createdAt),
    },
    {
      key: "actor",
      header: "관리자",
      render: (node) => node.actorUserid ?? "시스템",
    },
    {
      key: "action",
      header: "액션",
      render: (node) => adminActionLabel(node.action),
    },
    {
      key: "entityType",
      header: "엔티티",
      render: (node) => adminEntityLabel(node.entityType),
    },
    {
      key: "entityId",
      header: "대상 ID",
      render: (node) => (
        <ActionButton
          variant="ghost"
          size="xsmall"
          onClick={() => setSelected(node)}
        >
          {node.entityId}
        </ActionButton>
      ),
    },
  ];

  return (
    <Page>
      <PageHeader
        title="감사 로그"
        description={`관리자 변경 이력 ${totalCount.toLocaleString()}건`}
      />
      <FilterBar onSubmit={() => setFilter({ ...draft })}>
        <FilterControl label="관리자 ID">
          <AdminInput
            value={draft.actorUserId}
            onChange={(event) =>
              setDraft({ ...draft, actorUserId: event.target.value })
            }
          />
        </FilterControl>
        <FilterControl label="액션">
          <AdminSelect
            value={draft.action}
            onChange={(event) =>
              setDraft({ ...draft, action: event.target.value })
            }
          >
            <option value="">전체</option>
            <option value="PARTNER_APPROVED">파트너 승인</option>
            <option value="PARTNER_REJECTED">파트너 반려</option>
            <option value="PRODUCT_APPROVED">상품 승인</option>
            <option value="PRODUCT_REJECTED">상품 반려</option>
            <option value="ORDER_STATUS_CHANGED">주문 상태 변경</option>
            <option value="CATEGORY_CREATED">카테고리 생성</option>
            <option value="CATEGORY_UPDATED">카테고리 수정</option>
            <option value="ADMIN_INVITED">관리자 초대</option>
            <option value="ADMIN_INVITE_REVOKED">관리자 초대 취소</option>
            <option value="ADMIN_INVITE_ACCEPTED">관리자 초대 수락</option>
          </AdminSelect>
        </FilterControl>
        <FilterControl label="엔티티">
          <AdminSelect
            value={draft.entityType}
            onChange={(event) =>
              setDraft({ ...draft, entityType: event.target.value })
            }
          >
            <option value="">전체</option>
            <option value="PARTNER">파트너</option>
            <option value="PRODUCT">상품</option>
            <option value="ORDER">주문</option>
            <option value="CATEGORY">카테고리</option>
            <option value="ADMIN_INVITE">관리자 초대</option>
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
        {logs.isPending ? <TableSkeleton /> : null}
        {logs.isError ? <ErrorState retry={() => logs.refetch()} /> : null}
        {nodes.length ? (
          <DataTable
            caption="감사 로그"
            columns={columns}
            nodes={nodes}
            rowKey={(node) => node.auditLogId}
          />
        ) : null}
        {!logs.isPending && !logs.isError && nodes.length === 0 ? (
          <EmptyState
            title="감사 로그가 없습니다"
            description="조건을 바꾸거나 관리자 작업 이후 다시 확인하세요."
          />
        ) : null}
        {logs.hasNextPage ? (
          <LoadMore
            pending={logs.isFetchingNextPage}
            onClick={() => logs.fetchNextPage()}
          />
        ) : null}
      </TableCard>
      <DetailPanel
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        title="감사 로그 상세"
      >
        {selected ? (
          <>
            <DetailGrid>
              <dt>일시</dt>
              <dd>{formatDateTime(selected.createdAt)}</dd>
              <dt>관리자</dt>
              <dd>{selected.actorUserid ?? "시스템"}</dd>
              <dt>액션</dt>
              <dd>{adminActionLabel(selected.action)}</dd>
              <dt>엔티티</dt>
              <dd>{adminEntityLabel(selected.entityType)}</dd>
              <dt>대상 ID</dt>
              <dd>{selected.entityId}</dd>
            </DetailGrid>
            <DetailSection title="메타데이터">
              <Metadata>{formatMetadata(selected.metadataJson)}</Metadata>
            </DetailSection>
          </>
        ) : null}
      </DetailPanel>
    </Page>
  );
};

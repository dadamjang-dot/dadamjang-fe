"use client";

import { ActionButton } from "@seed-design/react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { formatBusinessRegistrationNumber } from "@dadamjang/domain";
import {
  adminActionLabel,
  adminStatusLabel,
} from "@/entities/operation-status";
import { AdminApiError, type AdminPartner } from "@/shared/api";
import { formatDateTime, formatMetadata } from "@/shared/lib";
import {
  AdminInput,
  AdminSelect,
  AdminTextarea,
  ApiCallout,
  ConfirmDialog,
  DataTable,
  DetailGrid,
  DetailPanel,
  DetailSection,
  EmptyState,
  ErrorState,
  FilterBar,
  FilterControl,
  InlineActions,
  LoadMore,
  Metadata,
  Page,
  PageHeader,
  StatusBadge,
  TableCard,
  TableSkeleton,
  useAdminSnackbar,
  type DataTableColumn,
} from "@/shared/ui";
import { partnerQueries, type PartnerFilter } from "../api/partner-queries";
import { reviewPartner, type PartnerReviewInput } from "../api/partner-review";

const INITIAL_FILTER: PartnerFilter = {
  query: "",
  status: "PENDING",
  createdFrom: "",
  createdTo: "",
};

export const PartnersPage = () => {
  const queryClient = useQueryClient();
  const notify = useAdminSnackbar();
  const [draft, setDraft] = useState<PartnerFilter>(INITIAL_FILTER);
  const [filter, setFilter] = useState<PartnerFilter>(INITIAL_FILTER);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [decision, setDecision] = useState<{
    partnerId: string;
    approved: boolean;
  } | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const list = useInfiniteQuery(partnerQueries.list(filter));
  const detail = useQuery({
    ...partnerQueries.detail(selectedId ?? ""),
    enabled: !!selectedId,
  });
  const mutation = useMutation({
    mutationFn: reviewPartner,
    onSuccess: async (partner) => {
      notify(
        partner.status === "APPROVED"
          ? "파트너를 승인했습니다."
          : "파트너를 반려했습니다.",
      );
      setDecision(null);
      setSelectedId(null);
      setReason("");
      setReasonError("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: partnerQueries.all() }),
        queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] }),
      ]);
    },
  });
  const openDecision = (nextDecision: {
    partnerId: string;
    approved: boolean;
  }) => {
    mutation.reset();
    setReason("");
    setReasonError("");
    setDecision(nextDecision);
    setSelectedId(null);
  };
  const closeDecision = () => {
    mutation.reset();
    setDecision(null);
    setReason("");
    setReasonError("");
  };
  const nodes = list.data?.pages.flatMap((page) => page.nodes) ?? [];
  const totalCount = list.data?.pages[0]?.totalCount ?? 0;
  const columns = useMemo<DataTableColumn<AdminPartner>[]>(
    () => [
      {
        key: "tradeName",
        header: "상호",
        render: (node) => (
          <ActionButton
            variant="ghost"
            size="xsmall"
            onClick={() => setSelectedId(node.partnerId)}
          >
            {node.tradeName}
          </ActionButton>
        ),
      },
      {
        key: "businessEmail",
        header: "사업자 이메일",
        render: (node) => node.businessEmail,
      },
      { key: "owner", header: "소유자", render: (node) => node.ownerUserid },
      {
        key: "status",
        header: "상태",
        render: (node) => (
          <StatusBadge
            status={node.status}
            label={adminStatusLabel(node.status)}
          />
        ),
      },
      {
        key: "createdAt",
        header: "신청일",
        render: (node) => formatDateTime(node.createdAt),
      },
    ],
    [],
  );

  const confirm = () => {
    if (!decision) return false;
    if (
      !decision.approved &&
      (reason.trim().length < 1 || reason.trim().length > 500)
    ) {
      setReasonError("반려 사유를 1~500자로 입력해주세요.");
      return false;
    }
    const input: PartnerReviewInput = {
      partnerId: decision.partnerId,
      approved: decision.approved,
      rejectionReason: decision.approved ? undefined : reason.trim(),
    };
    mutation.mutate(input);
  };

  return (
    <Page>
      <PageHeader
        title="파트너 승인"
        description={`검색 결과 ${totalCount.toLocaleString()}건`}
      />
      <FilterBar onSubmit={() => setFilter({ ...draft })}>
        <FilterControl label="검색" wide>
          <AdminInput
            placeholder="상호, 이메일, 사업자번호"
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
            <option value="PENDING">승인 대기</option>
            <option value="APPROVED">승인 완료</option>
            <option value="REJECTED">승인 반려</option>
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
            caption="파트너 목록"
            columns={columns}
            nodes={nodes}
            rowKey={(node) => node.partnerId}
          />
        ) : null}
        {!list.isPending && !list.isError && nodes.length === 0 ? (
          <EmptyState
            title="파트너가 없습니다"
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
      <DetailPanel
        open={!!selectedId}
        onOpenChange={(open) => !open && setSelectedId(null)}
        title="파트너 상세"
      >
        {detail.isPending ? <TableSkeleton /> : null}
        {detail.isError ? <ErrorState retry={() => detail.refetch()} /> : null}
        {detail.data ? (
          <>
            <DetailGrid>
              <dt>상호</dt>
              <dd>{detail.data.tradeName}</dd>
              <dt>상태</dt>
              <dd>
                <StatusBadge
                  status={detail.data.status}
                  label={adminStatusLabel(detail.data.status)}
                />
              </dd>
              <dt>사업자번호</dt>
              <dd>
                {formatBusinessRegistrationNumber(
                  detail.data.businessRegistrationNumber,
                )}
              </dd>
              <dt>사업자 이메일</dt>
              <dd>{detail.data.businessEmail}</dd>
              <dt>소유자</dt>
              <dd>
                {detail.data.ownerUserid} · {detail.data.ownerEmail}
              </dd>
              <dt>신청일</dt>
              <dd>{formatDateTime(detail.data.createdAt)}</dd>
              <dt>검토일</dt>
              <dd>{formatDateTime(detail.data.reviewedAt)}</dd>
              {detail.data.rejectionReason ? (
                <>
                  <dt>반려 사유</dt>
                  <dd>{detail.data.rejectionReason}</dd>
                </>
              ) : null}
            </DetailGrid>
            {detail.data.status === "PENDING" ? (
              <DetailSection title="검토">
                <InlineActions>
                  <ActionButton
                    variant="neutralSolid"
                    onClick={() =>
                      openDecision({
                        partnerId: detail.data.partnerId,
                        approved: true,
                      })
                    }
                  >
                    승인
                  </ActionButton>
                  <ActionButton
                    variant="criticalSolid"
                    onClick={() =>
                      openDecision({
                        partnerId: detail.data.partnerId,
                        approved: false,
                      })
                    }
                  >
                    반려
                  </ActionButton>
                </InlineActions>
              </DetailSection>
            ) : null}
            <DetailSection title="감사 이력">
              {detail.data.auditLogs.length ? (
                detail.data.auditLogs.map((log) => (
                  <Metadata
                    key={log.auditLogId}
                  >{`${formatDateTime(log.createdAt)} · ${adminActionLabel(log.action)}\n${formatMetadata(log.metadataJson)}`}</Metadata>
                ))
              ) : (
                <p>이력이 없습니다.</p>
              )}
            </DetailSection>
          </>
        ) : null}
      </DetailPanel>
      <ConfirmDialog
        open={!!decision}
        onOpenChange={(open) => !open && closeDecision()}
        title={
          decision?.approved ? "파트너를 승인할까요?" : "파트너를 반려할까요?"
        }
        description={
          decision?.approved
            ? "승인 즉시 파트너 권한이 활성화됩니다."
            : "반려 사유는 파트너 검토 기록에 남습니다."
        }
        confirmLabel={decision?.approved ? "승인" : "반려"}
        critical={!decision?.approved}
        pending={mutation.isPending}
        onConfirm={confirm}
      >
        {!decision?.approved ? (
          <>
            <AdminTextarea
              aria-label="반려 사유"
              placeholder="반려 사유"
              maxLength={500}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                setReasonError("");
              }}
            />
            {reasonError ? <p role="alert">{reasonError}</p> : null}
          </>
        ) : null}
        {mutation.error ? (
          <ApiCallout
            message={
              mutation.error instanceof AdminApiError
                ? mutation.error.message
                : "검토를 처리하지 못했습니다."
            }
          />
        ) : null}
      </ConfirmDialog>
    </Page>
  );
};

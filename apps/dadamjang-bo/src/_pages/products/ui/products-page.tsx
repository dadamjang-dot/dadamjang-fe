"use client";

import { ActionButton } from "@seed-design/react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import Image from "next/image";
import { useMemo, useState } from "react";
import { formatKrw } from "@dadamjang/domain";
import {
  adminActionLabel,
  adminStatusLabel,
} from "@/entities/operation-status";
import { AdminApiError, type AdminProduct } from "@/shared/api";
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
import { productQueries, type ProductFilter } from "../api/product-queries";
import { reviewProduct, type ProductReviewInput } from "../api/product-review";
import styles from "../products.module.css";

const INITIAL_FILTER: ProductFilter = {
  query: "",
  approvalStatus: "PENDING",
  partnerId: "",
  categoryId: "",
  createdFrom: "",
  createdTo: "",
};

export const ProductsPage = () => {
  const queryClient = useQueryClient();
  const notify = useAdminSnackbar();
  const [draft, setDraft] = useState<ProductFilter>(INITIAL_FILTER);
  const [filter, setFilter] = useState<ProductFilter>(INITIAL_FILTER);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [decision, setDecision] = useState<{
    productId: string;
    approved: boolean;
  } | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const list = useInfiniteQuery(productQueries.list(filter));
  const detail = useQuery({
    ...productQueries.detail(selectedId ?? ""),
    enabled: !!selectedId,
  });
  const options = useQuery(productQueries.filterOptions());
  const mutation = useMutation({
    mutationFn: reviewProduct,
    onSuccess: async (product) => {
      notify(
        product.approvalStatus === "APPROVED"
          ? "상품을 승인했습니다."
          : "상품을 반려했습니다.",
      );
      setDecision(null);
      setSelectedId(null);
      setReason("");
      setReasonError("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: productQueries.all() }),
        queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] }),
      ]);
    },
  });
  const openDecision = (nextDecision: {
    productId: string;
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
  const columns = useMemo<DataTableColumn<AdminProduct>[]>(
    () => [
      {
        key: "title",
        header: "상품",
        render: (node) => (
          <div className={styles.productCell}>
            <div className={styles.thumbnail}>
              {node.thumbnailUrl ? (
                <Image src={node.thumbnailUrl} alt="" width={42} height={42} />
              ) : null}
            </div>
            <ActionButton
              variant="ghost"
              size="xsmall"
              onClick={() => setSelectedId(node.productId)}
            >
              {node.title}
            </ActionButton>
          </div>
        ),
      },
      { key: "partner", header: "파트너", render: (node) => node.partnerName },
      {
        key: "category",
        header: "카테고리",
        render: (node) => node.categoryName,
      },
      {
        key: "approval",
        header: "승인 상태",
        render: (node) => (
          <StatusBadge
            status={node.approvalStatus}
            label={adminStatusLabel(node.approvalStatus)}
          />
        ),
      },
      {
        key: "createdAt",
        header: "등록일",
        render: (node) => formatDateTime(node.createdAt),
      },
    ],
    [],
  );

  const confirm = (): boolean => {
    if (!decision) return false;
    if (
      !decision.approved &&
      (reason.trim().length < 1 || reason.trim().length > 500)
    ) {
      setReasonError("반려 사유를 1~500자로 입력해주세요.");
      return false;
    }
    const input: ProductReviewInput = {
      productId: decision.productId,
      approved: decision.approved,
      rejectionReason: decision.approved ? undefined : reason.trim(),
    };
    mutation.mutate(input);
    return true;
  };

  return (
    <Page>
      <PageHeader
        title="상품 승인"
        description={`검색 결과 ${totalCount.toLocaleString()}건`}
      />
      <FilterBar onSubmit={() => setFilter({ ...draft })}>
        <FilterControl label="검색" wide>
          <AdminInput
            placeholder="상품명"
            value={draft.query}
            onChange={(event) =>
              setDraft({ ...draft, query: event.target.value })
            }
          />
        </FilterControl>
        <FilterControl label="승인 상태">
          <AdminSelect
            value={draft.approvalStatus}
            onChange={(event) =>
              setDraft({ ...draft, approvalStatus: event.target.value })
            }
          >
            <option value="">전체</option>
            <option value="PENDING">승인 대기</option>
            <option value="APPROVED">승인 완료</option>
            <option value="REJECTED">승인 반려</option>
          </AdminSelect>
        </FilterControl>
        <FilterControl label="파트너">
          <AdminSelect
            value={draft.partnerId}
            onChange={(event) =>
              setDraft({ ...draft, partnerId: event.target.value })
            }
          >
            <option value="">전체</option>
            {options.data?.partners.map((partner) => (
              <option key={partner.partnerId} value={partner.partnerId}>
                {partner.tradeName}
              </option>
            ))}
          </AdminSelect>
        </FilterControl>
        <FilterControl label="카테고리">
          <AdminSelect
            value={draft.categoryId}
            onChange={(event) =>
              setDraft({ ...draft, categoryId: event.target.value })
            }
          >
            <option value="">전체</option>
            {options.data?.categories.map((category) => (
              <option key={category.categoryId} value={category.categoryId}>
                {category.name}
              </option>
            ))}
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
            caption="상품 목록"
            columns={columns}
            nodes={nodes}
            rowKey={(node) => node.productId}
          />
        ) : null}
        {!list.isPending && !list.isError && nodes.length === 0 ? (
          <EmptyState
            title="상품이 없습니다"
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
        title="상품 상세"
      >
        {detail.isPending ? <TableSkeleton /> : null}
        {detail.isError ? <ErrorState retry={() => detail.refetch()} /> : null}
        {detail.data ? (
          <>
            {detail.data.imageUrls.length ? (
              <div className={styles.gallery}>
                {detail.data.imageUrls.map((url, index) => (
                  <div className={styles.galleryItem} key={url}>
                    <Image
                      src={url}
                      alt={`${detail.data.title} 이미지 ${index + 1}`}
                      fill
                      sizes="180px"
                    />
                  </div>
                ))}
              </div>
            ) : null}
            <DetailGrid>
              <dt>상품명</dt>
              <dd>{detail.data.title}</dd>
              <dt>파트너</dt>
              <dd>{detail.data.partnerName}</dd>
              <dt>카테고리</dt>
              <dd>{detail.data.categoryName}</dd>
              <dt>승인 상태</dt>
              <dd>
                <StatusBadge
                  status={detail.data.approvalStatus}
                  label={adminStatusLabel(detail.data.approvalStatus)}
                />
              </dd>
              <dt>판매 상태</dt>
              <dd>
                <StatusBadge
                  status={detail.data.status}
                  label={adminStatusLabel(detail.data.status)}
                />
              </dd>
              <dt>등록일</dt>
              <dd>{formatDateTime(detail.data.createdAt)}</dd>
              {detail.data.rejectionReason ? (
                <>
                  <dt>반려 사유</dt>
                  <dd>{detail.data.rejectionReason}</dd>
                </>
              ) : null}
            </DetailGrid>
            <DetailSection title="설명">
              <p className={styles.description}>{detail.data.description}</p>
            </DetailSection>
            <DetailSection title="SKU">
              <TableCard>
                <DataTable
                  caption="SKU 목록"
                  nodes={detail.data.skus}
                  rowKey={(sku) => sku.skuId}
                  columns={[
                    { key: "code", header: "코드", render: (sku) => sku.code },
                    {
                      key: "option",
                      header: "옵션",
                      render: (sku) => sku.optionName,
                    },
                    {
                      key: "price",
                      header: "가격",
                      numeric: true,
                      render: (sku) => formatKrw(sku.price),
                    },
                    {
                      key: "stock",
                      header: "재고",
                      numeric: true,
                      render: (sku) => sku.stock.toLocaleString(),
                    },
                  ]}
                />
              </TableCard>
            </DetailSection>
            {detail.data.approvalStatus === "PENDING" ? (
              <DetailSection title="검토">
                <InlineActions>
                  <ActionButton
                    variant="neutralSolid"
                    onClick={() =>
                      openDecision({
                        productId: detail.data.productId,
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
                        productId: detail.data.productId,
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
        title={decision?.approved ? "상품을 승인할까요?" : "상품을 반려할까요?"}
        description={
          decision?.approved
            ? "승인 후 파트너가 상품을 공개할 수 있습니다."
            : "반려 사유는 상품 검토 기록에 남습니다."
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

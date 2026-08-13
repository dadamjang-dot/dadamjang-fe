"use client";

import { ActionButton } from "@seed-design/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { formatKrw } from "@dadamjang/domain";
import {
  adminActionLabel,
  adminStatusLabel,
} from "@/entities/operation-status";
import { AdminApiError } from "@/shared/api";
import { formatDateTime, formatMetadata } from "@/shared/lib";
import {
  ApiCallout,
  Card,
  ConfirmDialog,
  DataTable,
  DetailGrid,
  DetailSection,
  ErrorState,
  InlineActions,
  Metadata,
  Page,
  PageHeader,
  StatusBadge,
  TableCard,
  TableSkeleton,
  useAdminSnackbar,
} from "@/shared/ui";
import { orderQueries } from "../api/order-queries";
import { transitionOrder } from "../api/order-transition";
import styles from "../orders.module.css";

export const OrderDetailPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const queryClient = useQueryClient();
  const notify = useAdminSnackbar();
  const [nextStatus, setNextStatus] = useState<string | null>(null);
  const order = useQuery(orderQueries.detail(orderId));
  const transition = useMutation({
    mutationFn: transitionOrder,
    onSuccess: async (updated) => {
      queryClient.setQueryData(orderQueries.detail(orderId).queryKey, updated);
      setNextStatus(null);
      notify("주문 상태를 변경했습니다.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: orderQueries.lists() }),
        queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] }),
      ]);
    },
  });
  if (order.isPending)
    return (
      <Page>
        <TableCard>
          <TableSkeleton />
        </TableCard>
      </Page>
    );
  if (order.isError)
    return (
      <Page>
        <TableCard>
          <ErrorState retry={() => order.refetch()} />
        </TableCard>
      </Page>
    );
  const data = order.data;
  return (
    <Page>
      <Link className={styles.backLink} href="/orders">
        ← 주문 목록
      </Link>
      <PageHeader
        title={data.orderNumber}
        description={`주문일 ${formatDateTime(data.createdAt)}`}
        actions={
          <StatusBadge
            status={data.status}
            label={adminStatusLabel(data.status)}
          />
        }
      />
      <div className={styles.summary}>
        <div className={styles.summaryItem}>
          <span>결제 금액</span>
          <strong>{formatKrw(data.totalAmount)}</strong>
        </div>
        <div className={styles.summaryItem}>
          <span>구매자</span>
          <strong>{data.buyerUserid}</strong>
        </div>
        <div className={styles.summaryItem}>
          <span>결제 상태</span>
          <strong>{data.paymentStatus}</strong>
        </div>
      </div>
      <Card title="주문 정보">
        <DetailGrid>
          <dt>구매자 이메일</dt>
          <dd>{data.buyerEmail}</dd>
          <dt>상품 수량</dt>
          <dd>{data.itemCount.toLocaleString()}</dd>
          <dt>결제 실패 사유</dt>
          <dd>{data.paymentFailureReason ?? "—"}</dd>
        </DetailGrid>
      </Card>
      <Card title="주문 상품">
        <TableCard>
          <DataTable
            caption="주문 상품"
            nodes={data.items}
            rowKey={(item) => item.orderItemId}
            columns={[
              {
                key: "title",
                header: "상품",
                render: (item) => item.productTitle,
              },
              {
                key: "option",
                header: "옵션",
                render: (item) => item.skuOptionName,
              },
              {
                key: "price",
                header: "단가",
                numeric: true,
                render: (item) => formatKrw(item.unitPrice),
              },
              {
                key: "quantity",
                header: "수량",
                numeric: true,
                render: (item) => item.quantity.toLocaleString(),
              },
              {
                key: "total",
                header: "합계",
                numeric: true,
                render: (item) => formatKrw(item.unitPrice * item.quantity),
              },
            ]}
          />
        </TableCard>
      </Card>
      <Card title="상태 전환">
        {data.allowedNextStatuses.length ? (
          <InlineActions>
            {data.allowedNextStatuses.map((status) => (
              <ActionButton
                key={status}
                variant={
                  status === "CANCELLED" || status === "FAILED"
                    ? "criticalSolid"
                    : "neutralSolid"
                }
                onClick={() => setNextStatus(status)}
              >
                {adminStatusLabel(status)}
              </ActionButton>
            ))}
          </InlineActions>
        ) : (
          <p>가능한 다음 상태가 없습니다.</p>
        )}
      </Card>
      <Card title="감사 이력">
        <DetailSection title="변경 기록">
          {data.auditLogs.length ? (
            data.auditLogs.map((log) => (
              <Metadata
                key={log.auditLogId}
              >{`${formatDateTime(log.createdAt)} · ${adminActionLabel(log.action)}\n${formatMetadata(log.metadataJson)}`}</Metadata>
            ))
          ) : (
            <p>이력이 없습니다.</p>
          )}
        </DetailSection>
      </Card>
      <ConfirmDialog
        open={!!nextStatus}
        onOpenChange={(open) => !open && setNextStatus(null)}
        title={`주문 상태를 ${adminStatusLabel(nextStatus ?? "")} 상태로 변경할까요?`}
        description="상태 전환은 감사 로그에 기록되며 이전 상태로 되돌릴 수 없을 수 있습니다."
        confirmLabel="상태 변경"
        critical={nextStatus === "CANCELLED" || nextStatus === "FAILED"}
        pending={transition.isPending}
        onConfirm={() =>
          nextStatus && transition.mutate({ orderId, nextStatus })
        }
      >
        {transition.error ? (
          <ApiCallout
            message={
              transition.error instanceof AdminApiError
                ? transition.error.message
                : "상태를 변경하지 못했습니다."
            }
          />
        ) : null}
      </ConfirmDialog>
    </Page>
  );
};

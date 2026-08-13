"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  adminActionLabel,
  adminEntityLabel,
} from "@/entities/operation-status";
import { formatDateTime } from "@/shared/lib";
import {
  DataTable,
  EmptyState,
  ErrorState,
  Page,
  PageHeader,
  TableCard,
  TableSkeleton,
  type DataTableColumn,
} from "@/shared/ui";
import type { AdminAuditLog } from "@/shared/api";
import { dashboardQueries } from "../api/dashboard-queries";
import styles from "../dashboard.module.css";

const AUDIT_COLUMNS: DataTableColumn<AdminAuditLog>[] = [
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
    key: "entity",
    header: "대상",
    render: (node) => `${adminEntityLabel(node.entityType)} · ${node.entityId}`,
  },
];

export const DashboardPage = () => {
  const dashboard = useQuery(dashboardQueries.overview());
  if (dashboard.isError)
    return (
      <Page>
        <PageHeader
          title="대시보드"
          description="오늘 확인할 운영 항목입니다."
        />
        <TableCard>
          <ErrorState retry={() => dashboard.refetch()} />
        </TableCard>
      </Page>
    );
  return (
    <Page>
      <PageHeader title="대시보드" description="오늘 확인할 운영 항목입니다." />
      <div className={styles.metrics}>
        {[
          [
            "승인 대기 파트너",
            dashboard.data?.pendingPartnerCount,
            "/partners",
          ],
          ["승인 대기 상품", dashboard.data?.pendingProductCount, "/products"],
          ["처리 중 주문", dashboard.data?.processingOrderCount, "/orders"],
          ["유효한 관리자 초대", dashboard.data?.activeInviteCount, "/admins"],
        ].map(([label, value, href]) => (
          <article className={styles.metric} key={String(label)}>
            <span className={styles.metricLabel}>{label}</span>
            <strong className={styles.metricValue}>{value ?? "—"}</strong>
            <Link className={styles.metricLink} href={String(href)}>
              목록 보기
            </Link>
          </article>
        ))}
      </div>
      <TableCard>
        {dashboard.isPending ? <TableSkeleton /> : null}
        {dashboard.data?.recentAuditLogs.length ? (
          <DataTable
            caption="최근 감사 로그"
            columns={AUDIT_COLUMNS}
            nodes={dashboard.data.recentAuditLogs}
            rowKey={(node) => node.auditLogId}
          />
        ) : null}
        {dashboard.data && dashboard.data.recentAuditLogs.length === 0 ? (
          <EmptyState
            title="기록된 변경이 없습니다"
            description="관리자 변경이 발생하면 최근 기록이 표시됩니다."
          />
        ) : null}
      </TableCard>
    </Page>
  );
};

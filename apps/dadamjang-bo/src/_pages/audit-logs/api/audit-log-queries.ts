import { infiniteQueryOptions } from "@tanstack/react-query";
import {
  requestGraphQl,
  type AdminAuditLog,
  type Connection,
} from "@/shared/api";

export type AuditLogFilter = {
  actorUserId?: string;
  action?: string;
  entityType?: string;
  createdFrom?: string;
  createdTo?: string;
};

const AUDIT_LOGS_QUERY = `
  query AdminAuditLogs($filter: AdminAuditLogFilterInput) {
    adminAuditLogs(filter: $filter) {
      nodes { auditLogId actorUserId actorUserid action entityType entityId metadataJson createdAt }
      nextCursor hasNextPage totalCount
    }
  }
`;

export const auditLogQueries = {
  all: () => ["admin-audit-logs"] as const,
  list: (filter: AuditLogFilter) =>
    infiniteQueryOptions({
      queryKey: [...auditLogQueries.all(), filter],
      queryFn: async ({ pageParam }) =>
        (
          await requestGraphQl<
            { adminAuditLogs: Connection<AdminAuditLog> },
            { filter: AuditLogFilter & { after: string | null; first: number } }
          >(AUDIT_LOGS_QUERY, {
            filter: { ...filter, after: pageParam, first: 30 },
          })
        ).adminAuditLogs,
      initialPageParam: null as string | null,
      getNextPageParam: (lastPage) =>
        lastPage.hasNextPage ? lastPage.nextCursor : undefined,
    }),
};

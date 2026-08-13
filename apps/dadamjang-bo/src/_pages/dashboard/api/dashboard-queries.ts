import { queryOptions } from "@tanstack/react-query";
import { requestGraphQl, type AdminDashboard } from "@/shared/api";

const DASHBOARD_QUERY = `
  query AdminDashboard {
    adminDashboard {
      pendingPartnerCount
      pendingProductCount
      processingOrderCount
      activeInviteCount
      recentAuditLogs { auditLogId actorUserid action entityType entityId metadataJson createdAt }
    }
  }
`;

export const dashboardQueries = {
  all: () => ["admin-dashboard"] as const,
  overview: () =>
    queryOptions({
      queryKey: dashboardQueries.all(),
      queryFn: async () =>
        (
          await requestGraphQl<{ adminDashboard: AdminDashboard }>(
            DASHBOARD_QUERY,
          )
        ).adminDashboard,
    }),
};

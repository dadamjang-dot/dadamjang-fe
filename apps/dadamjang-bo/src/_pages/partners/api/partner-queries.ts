import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import {
  requestGraphQl,
  type AdminPartner,
  type AdminPartnerDetail,
  type Connection,
} from "@/shared/api";

export type PartnerFilter = {
  query?: string;
  status?: string;
  createdFrom?: string;
  createdTo?: string;
};

const PARTNERS_QUERY = `
  query AdminPartners($filter: AdminPartnerFilterInput) {
    adminPartners(filter: $filter) {
      nodes {
        partnerId ownerUserId ownerUserid ownerEmail businessEmail businessRegistrationNumber
        tradeName status rejectionReason reviewedAt createdAt
      }
      nextCursor hasNextPage totalCount
    }
  }
`;

const PARTNER_QUERY = `
  query AdminPartner($partnerId: String!) {
    adminPartner(partnerId: $partnerId) {
      partnerId ownerUserId ownerUserid ownerEmail businessEmail businessRegistrationNumber
      tradeName status rejectionReason reviewedAt createdAt
      auditLogs { auditLogId actorUserid action entityType entityId metadataJson createdAt }
    }
  }
`;

export const partnerQueries = {
  all: () => ["admin-partners"] as const,
  lists: () => [...partnerQueries.all(), "list"] as const,
  list: (filter: PartnerFilter) =>
    infiniteQueryOptions({
      queryKey: [...partnerQueries.lists(), filter],
      queryFn: async ({ pageParam }) =>
        (
          await requestGraphQl<
            { adminPartners: Connection<AdminPartner> },
            { filter: PartnerFilter & { after: string | null; first: number } }
          >(PARTNERS_QUERY, {
            filter: { ...filter, after: pageParam, first: 30 },
          })
        ).adminPartners,
      initialPageParam: null as string | null,
      getNextPageParam: (lastPage) =>
        lastPage.hasNextPage ? lastPage.nextCursor : undefined,
    }),
  detail: (partnerId: string) =>
    queryOptions({
      queryKey: [...partnerQueries.all(), "detail", partnerId],
      queryFn: async () =>
        (
          await requestGraphQl<
            { adminPartner: AdminPartnerDetail },
            { partnerId: string }
          >(PARTNER_QUERY, { partnerId })
        ).adminPartner,
    }),
};

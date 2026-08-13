import { infiniteQueryOptions } from "@tanstack/react-query";
import {
  requestGraphQl,
  type AdminInvite,
  type Connection,
} from "@/shared/api";

export type InviteFilter = { query?: string; status?: string };

const INVITES_QUERY = `
  query AdminInvites($filter: AdminInviteFilterInput) {
    adminInvites(filter: $filter) {
      nodes { inviteId email status invitedByUserId invitedByUserid expiresAt acceptedAt revokedAt createdAt }
      nextCursor hasNextPage totalCount
    }
  }
`;

export const inviteQueries = {
  all: () => ["admin-invites"] as const,
  list: (filter: InviteFilter) =>
    infiniteQueryOptions({
      queryKey: [...inviteQueries.all(), filter],
      queryFn: async ({ pageParam }) =>
        (
          await requestGraphQl<
            { adminInvites: Connection<AdminInvite> },
            { filter: InviteFilter & { after: string | null; first: number } }
          >(INVITES_QUERY, {
            filter: { ...filter, after: pageParam, first: 30 },
          })
        ).adminInvites,
      initialPageParam: null as string | null,
      getNextPageParam: (lastPage) =>
        lastPage.hasNextPage ? lastPage.nextCursor : undefined,
    }),
};

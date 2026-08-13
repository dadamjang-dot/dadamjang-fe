import { queryOptions } from "@tanstack/react-query";
import { requestGraphQl } from "@/shared/api";

export type AdminSession = {
  userId: string;
  userid: string;
  email: string;
  role: string;
};

const ME_QUERY = `
  query AdminMe {
    me { userId userid email role }
  }
`;

export const adminSessionQuery = () =>
  queryOptions({
    queryKey: ["admin-session"],
    queryFn: async () =>
      (await requestGraphQl<{ me: AdminSession }>(ME_QUERY)).me,
    staleTime: 60_000,
    retry: false,
  });

const LOGOUT_MUTATION = `mutation AdminLogout { logout }`;

export const logoutAdminSession = async () =>
  (await requestGraphQl<{ logout: boolean }>(LOGOUT_MUTATION)).logout;

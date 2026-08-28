import { queryOptions } from "@tanstack/react-query";
import { requestGraphQl } from "@/shared/api";
import { invalidateSession } from "./session-invalidation";

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
    refetchOnWindowFocus: "always",
  });

const LOGOUT_MUTATION = `mutation AdminLogout { logout }`;

export const logoutAdminSession = async () => {
  const result = (
    await requestGraphQl<{ logout: boolean }>(LOGOUT_MUTATION)
  ).logout;
  invalidateSession();
  return result;
};

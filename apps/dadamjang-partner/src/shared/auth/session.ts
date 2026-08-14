import { queryOptions } from "@tanstack/react-query";
import { requestGraphQl } from "@/shared/api";
export type Session = {
  userId: string;
  userid: string;
  email: string;
  role: string;
};
export const sessionQuery = () =>
  queryOptions({
    queryKey: ["partner-session"],
    queryFn: async () =>
      (
        await requestGraphQl<{ me: Session }>(
          `query PartnerMe { me { userId userid email role } }`,
        )
      ).me,
    retry: false,
    staleTime: 60_000,
  });
export const signin = (userid: string, password: string) =>
  requestGraphQl<{ signin: { role: string } }>(
    `mutation Signin($input: SigninAuthInput!) { signin(input: $input) { role } }`,
    { input: { userid, password, portal: "PARTNER" } },
  );
export const logout = () => requestGraphQl(`mutation Logout { logout }`);
export const myPartner = () =>
  requestGraphQl<{
    myPartner: {
      partnerId: string;
      tradeName: string;
      status: string;
      brand: { brandId: string; name: string; slug: string } | null;
    } | null;
  }>(
    `query MyPartner { myPartner { partnerId tradeName status brand { brandId name slug } } }`,
  );

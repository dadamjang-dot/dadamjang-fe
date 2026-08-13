import { requestGraphQl } from "@/shared/api";

const REQUEST_CODE = `
  mutation RequestPasswordResetCode($input: RequestEmailCodeInput!) {
    requestPasswordResetCode(input: $input) { ok }
  }
`;

const VERIFY_CODE = `
  mutation VerifyPasswordResetCode($input: VerifyEmailCodeInput!) {
    verifyPasswordResetCode(input: $input) { emailVerificationToken }
  }
`;

const RESET_PASSWORD = `
  mutation ResetPassword($input: ResetPasswordInput!) {
    resetPassword(input: $input) { ok }
  }
`;

export const requestPasswordResetCode = async (email: string) =>
  (
    await requestGraphQl<
      { requestPasswordResetCode: { ok: boolean } },
      { input: { email: string } }
    >(REQUEST_CODE, { input: { email } })
  ).requestPasswordResetCode;

export const verifyPasswordResetCode = async (input: {
  email: string;
  code: string;
}) =>
  (
    await requestGraphQl<
      { verifyPasswordResetCode: { emailVerificationToken: string } },
      { input: typeof input }
    >(VERIFY_CODE, { input })
  ).verifyPasswordResetCode;

export const resetAdminPassword = async (input: {
  token: string;
  password: string;
}) =>
  (
    await requestGraphQl<
      { resetPassword: { ok: boolean } },
      { input: typeof input }
    >(RESET_PASSWORD, { input })
  ).resetPassword;

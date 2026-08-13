import { getDeviceId, graphqlRequest } from "@dadamjang/graphql-client";

export const findFoEmail = async (identityVerificationToken: string) => {
  const deviceId = await getDeviceId();
  const data = await graphqlRequest<{
    findFoEmail: { found: boolean; maskedEmail: string | null };
  }>(
    `mutation FindFoEmail($identityVerificationToken: String!) {
      findFoEmail(identityVerificationToken: $identityVerificationToken) { found maskedEmail }
    }`,
    { identityVerificationToken },
    { "x-device-id": deviceId },
  );
  return data.findFoEmail;
};

export const requestPasswordResetCode = async (email: string) => {
  const data = await graphqlRequest<{ requestPasswordResetCode: { ok: boolean } }>(
    `mutation RequestPasswordResetCode($input: RequestEmailCodeInput!) {
      requestPasswordResetCode(input: $input) { ok }
    }`,
    { input: { email } },
  );
  return data.requestPasswordResetCode;
};

export const verifyPasswordResetCode = async (email: string, code: string) => {
  const data = await graphqlRequest<{
    verifyPasswordResetCode: { emailVerificationToken: string };
  }>(
    `mutation VerifyPasswordResetCode($input: VerifyEmailCodeInput!) {
      verifyPasswordResetCode(input: $input) { emailVerificationToken }
    }`,
    { input: { email, code } },
  );
  return data.verifyPasswordResetCode;
};

export const resetPassword = async (token: string, password: string) => {
  const data = await graphqlRequest<{ resetPassword: { ok: boolean } }>(
    `mutation ResetPassword($input: ResetPasswordInput!) {
      resetPassword(input: $input) { ok }
    }`,
    { input: { token, password } },
  );
  return data.resetPassword;
};

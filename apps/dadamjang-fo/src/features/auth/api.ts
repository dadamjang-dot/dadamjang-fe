import {
  getDeviceId,
  graphqlRequest,
  setAuthTokens,
} from "@dadamjang/graphql-client";

import type {
  ConsentAcceptance,
  CurrentUser,
  SignInFoResult,
  SignupConsentDocument,
  TokenPayload,
} from "./types";

export const getCurrentUser = async (signal?: AbortSignal) => {
  const data = await graphqlRequest<{ me: CurrentUser }>(
    "query Me { me { userId userid email role } }",
    undefined,
    { signal },
  );
  return data.me;
};

export const signInFo = async (email: string, password: string) => {
  const deviceId = await getDeviceId();
  const data = await graphqlRequest<{ signinFo: SignInFoResult }>(
    `mutation SigninFo($input: SigninFoInput!) {
      signinFo(input: $input) {
        status
        tokenPayload { accessToken refreshToken role }
        reactivationToken
      }
    }`,
    { input: { email, password } },
    { requestHeaders: { "x-device-id": deviceId } },
  );
  if (data.signinFo.status === "SIGNED_IN")
    await setAuthTokens(data.signinFo.tokenPayload);
  return data.signinFo;
};

export const reactivateFoAccount = async (reactivationToken: string) => {
  const deviceId = await getDeviceId();
  const data = await graphqlRequest<{ reactivateFoAccount: TokenPayload }>(
    `mutation ReactivateFoAccount($token: String!) {
      reactivateFoAccount(reactivationToken: $token) { accessToken refreshToken role }
    }`,
    { token: reactivationToken },
    { requestHeaders: { "x-device-id": deviceId } },
  );
  await setAuthTokens(data.reactivateFoAccount);
  return data.reactivateFoAccount;
};

export const requestSignupEmailCode = async (email: string) => {
  const data = await graphqlRequest<{
    requestSignupEmailCode: { ok: boolean };
  }>(
    `mutation RequestSignupEmailCode($input: RequestEmailCodeInput!) {
      requestSignupEmailCode(input: $input) { ok }
    }`,
    { input: { email } },
  );
  return data.requestSignupEmailCode;
};

export const verifySignupEmailCode = async (email: string, code: string) => {
  const data = await graphqlRequest<{
    verifySignupEmailCode: { emailVerificationToken: string };
  }>(
    `mutation VerifySignupEmailCode($input: VerifyEmailCodeInput!) {
      verifySignupEmailCode(input: $input) { emailVerificationToken }
    }`,
    { input: { email, code } },
  );
  return data.verifySignupEmailCode;
};

export const getActiveSignupConsentDocuments = async (signal?: AbortSignal) => {
  const data = await graphqlRequest<{
    activeSignupConsentDocuments: SignupConsentDocument[];
  }>(
    `query ActiveSignupConsentDocuments {
    activeSignupConsentDocuments { documentId type title body version required activeFrom }
  }`,
    undefined,
    { signal },
  );
  return data.activeSignupConsentDocuments;
};

export const signUpFo = async (input: {
  email: string;
  password: string;
  emailVerificationToken: string;
  identityVerificationToken: string;
  consents: ConsentAcceptance[];
}) => {
  const deviceId = await getDeviceId();
  const data = await graphqlRequest<{ signupFo: TokenPayload }>(
    `mutation SignupFo($input: SignupFoInput!) {
      signupFo(input: $input) { accessToken refreshToken role }
    }`,
    { input },
    { requestHeaders: { "x-device-id": deviceId } },
  );
  await setAuthTokens(data.signupFo);
  return data.signupFo;
};

export * from "./identity-api";
export * from "./kakao-api";
export * from "./recovery-api";

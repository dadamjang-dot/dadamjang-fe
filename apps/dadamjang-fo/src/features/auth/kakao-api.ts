import {
  getDeviceId,
  graphqlRequest,
  setAuthTokens,
} from "@dadamjang/graphql-client";

import type {
  ConsentAcceptance,
  KakaoLoginResult,
  TokenPayload,
} from "./types";

export const startKakaoLogin = async () => {
  const deviceId = await getDeviceId();
  const data = await graphqlRequest<{
    startKakaoLogin: { flowId: string; authUrl: string; expiresAt: string };
  }>(
    `mutation StartKakaoLogin {
      startKakaoLogin { flowId authUrl expiresAt }
    }`,
    undefined,
    { requestHeaders: { "x-device-id": deviceId } },
  );
  return data.startKakaoLogin;
};

export const completeKakaoLogin = async (
  flowId: string,
  callbackToken: string,
) => {
  const deviceId = await getDeviceId();
  const data = await graphqlRequest<{ completeKakaoLogin: KakaoLoginResult }>(
    `mutation CompleteKakaoLogin($input: CompleteKakaoLoginInput!) {
      completeKakaoLogin(input: $input) {
        status
        tokenPayload { accessToken refreshToken role }
        kakaoSignupToken
        email
        emailVerificationRequired
        reactivationToken
      }
    }`,
    { input: { flowId, callbackToken } },
    { requestHeaders: { "x-device-id": deviceId } },
  );
  if (data.completeKakaoLogin.status === "SIGNED_IN")
    await setAuthTokens(data.completeKakaoLogin.tokenPayload);
  return data.completeKakaoLogin;
};

export const completeKakaoSignupFo = async (input: {
  kakaoSignupToken: string;
  email?: string;
  emailVerificationToken?: string;
  identityVerificationToken: string;
  consents: ConsentAcceptance[];
}) => {
  const deviceId = await getDeviceId();
  const data = await graphqlRequest<{ completeKakaoSignupFo: TokenPayload }>(
    `mutation CompleteKakaoSignupFo($input: CompleteKakaoSignupFoInput!) {
      completeKakaoSignupFo(input: $input) { accessToken refreshToken role }
    }`,
    { input },
    { requestHeaders: { "x-device-id": deviceId } },
  );
  await setAuthTokens(data.completeKakaoSignupFo);
  return data.completeKakaoSignupFo;
};

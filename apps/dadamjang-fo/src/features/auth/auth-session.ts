import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import {
  completeIdentityVerification,
  completeKakaoLogin,
  getIdentityVerificationStatus,
  startIdentityVerification,
  startKakaoLogin,
} from "./api";
import type {
  IdentityVerificationProvider,
  IdentityVerificationPurpose,
  KakaoLoginResult,
} from "./types";

export class AuthSessionCancelledError extends Error {
  constructor(message = "인증을 취소했어요.") {
    super(message);
    this.name = "AuthSessionCancelledError";
  }
}

const callbackParams = (url: string) => {
  const parsed = new URL(url);
  return parsed.searchParams;
};

export const runIdentityVerificationSession = async (
  purpose: IdentityVerificationPurpose,
  provider: IdentityVerificationProvider,
) => {
  const started = await startIdentityVerification(purpose, provider);
  const redirectUrl = Linking.createURL("auth/identity-callback");
  const result = await WebBrowser.openAuthSessionAsync(
    started.launchUrl,
    redirectUrl,
  );
  if (result.type !== "success")
    throw new AuthSessionCancelledError("본인 인증을 취소했어요.");
  const params = callbackParams(result.url);
  const callbackToken = params.get("callbackToken");
  if (
    params.get("sessionId") !== started.sessionId ||
    params.get("status") !== "verified" ||
    !callbackToken
  )
    throw new Error("본인 인증에 실패했어요. 다시 시도해 주세요.");
  const status = await getIdentityVerificationStatus(started.sessionId);
  if (status.status === "EXPIRED")
    throw new Error("본인 인증 시간이 만료되었습니다. 다시 시도해 주세요.");
  if (status.status !== "VERIFIED")
    throw new Error("본인 인증 완료 상태를 확인하지 못했어요.");
  return (await completeIdentityVerification(started.sessionId, callbackToken))
    .identityVerificationToken;
};

export const runKakaoLoginSession = async (): Promise<KakaoLoginResult> => {
  const started = await startKakaoLogin();
  const redirectUrl = Linking.createURL("auth/kakao-callback");
  const result = await WebBrowser.openAuthSessionAsync(
    started.authUrl,
    redirectUrl,
  );
  if (result.type !== "success")
    throw new AuthSessionCancelledError("카카오 로그인을 취소했어요.");
  const params = callbackParams(result.url);
  const flowId = params.get("flowId");
  const callbackToken = params.get("callbackToken");
  if (flowId !== started.flowId || !callbackToken)
    throw new Error("카카오 로그인 흐름이 유효하지 않아요.");
  return completeKakaoLogin(flowId, callbackToken);
};

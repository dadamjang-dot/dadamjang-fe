import * as WebBrowser from "expo-web-browser";

import {
  completeIdentityVerification,
  completeKakaoLogin,
  getIdentityVerificationStatus,
  startIdentityVerification,
  startKakaoLogin,
} from "@/features/auth/api";
import {
  AuthSessionCancelledError,
  runIdentityVerificationSession,
  runKakaoLoginSession,
} from "@/features/auth/auth-session";

jest.mock("expo-web-browser", () => ({
  openAuthSessionAsync: jest.fn(),
  maybeCompleteAuthSession: jest.fn(),
  WebBrowserResultType: { CANCEL: "cancel" },
}));

jest.mock("@/features/auth/api", () => ({
  startIdentityVerification: jest.fn(),
  getIdentityVerificationStatus: jest.fn(),
  completeIdentityVerification: jest.fn(),
  startKakaoLogin: jest.fn(),
  completeKakaoLogin: jest.fn(),
}));

describe("auth browser sessions", () => {
  beforeEach(() => {
    jest.mocked(startIdentityVerification).mockResolvedValue({
      sessionId: "identity-session",
      launchUrl: "https://identity.example/start",
      expiresAt: "2026-08-13T00:10:00.000Z",
    });
    jest.mocked(getIdentityVerificationStatus).mockResolvedValue({
      sessionId: "identity-session",
      status: "VERIFIED",
      expiresAt: "2026-08-13T00:10:00.000Z",
    });
    jest.mocked(completeIdentityVerification).mockResolvedValue({
      identityVerificationToken: "identity-proof",
    });
  });

  it("completes identity only after the matching verified callback", async () => {
    jest.mocked(WebBrowser.openAuthSessionAsync).mockResolvedValue({
      type: "success",
      url: "dadamjang://auth/identity-callback?sessionId=identity-session&status=verified",
    });

    await expect(runIdentityVerificationSession("SIGNUP", "TOSS")).resolves.toBe("identity-proof");
    expect(startIdentityVerification).toHaveBeenCalledWith("SIGNUP", "TOSS");
    expect(completeIdentityVerification).toHaveBeenCalledWith("identity-session");
  });

  it("preserves cancellation and expiration as distinct failures", async () => {
    jest.mocked(WebBrowser.openAuthSessionAsync).mockResolvedValueOnce({
      type: WebBrowser.WebBrowserResultType.CANCEL,
    });
    await expect(runIdentityVerificationSession("SIGNUP", "KAKAO")).rejects.toBeInstanceOf(
      AuthSessionCancelledError,
    );

    jest.mocked(WebBrowser.openAuthSessionAsync).mockResolvedValueOnce({
      type: "success",
      url: "dadamjang://auth/identity-callback?sessionId=identity-session&status=verified",
    });
    jest.mocked(getIdentityVerificationStatus).mockResolvedValueOnce({
      sessionId: "identity-session",
      status: "EXPIRED",
      expiresAt: "2026-08-13T00:00:00.000Z",
    });
    await expect(runIdentityVerificationSession("SIGNUP", "NAVER")).rejects.toThrow(
      "본인 인증 시간이 만료되었습니다. 다시 시도해 주세요.",
    );
  });

  it("exchanges only the matching one-time Kakao flow", async () => {
    jest.mocked(startKakaoLogin).mockResolvedValue({
      flowId: "flow-1",
      authUrl: "https://kakao.example/start",
      expiresAt: "2026-08-13T00:10:00.000Z",
    });
    jest.mocked(WebBrowser.openAuthSessionAsync).mockResolvedValue({
      type: "success",
      url: "dadamjang://auth/kakao-callback?flowId=flow-1",
    });
    jest.mocked(completeKakaoLogin).mockResolvedValue({
      status: "SIGNED_IN",
      tokenPayload: { accessToken: "access", refreshToken: "refresh", role: "USER" },
      kakaoSignupToken: null,
      email: null,
      emailVerificationRequired: false,
    });

    await expect(runKakaoLoginSession()).resolves.toMatchObject({ status: "SIGNED_IN" });
    expect(completeKakaoLogin).toHaveBeenCalledWith("flow-1");
  });
});

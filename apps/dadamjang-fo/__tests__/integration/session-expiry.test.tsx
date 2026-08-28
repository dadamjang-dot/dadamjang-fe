import { useQueryClient } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react-native";
import * as SecureStore from "expo-secure-store";
import type { PropsWithChildren } from "react";

import { graphqlRequest, setAuthTokens } from "@dadamjang/graphql-client";

import {
  IdentitySheetDismissedError,
  useAuthFlow,
  useSignOut,
} from "@/features/auth";
import { AppProviders } from "@/providers/app-providers";

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: { addEventListener: jest.fn(() => jest.fn()) },
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const unauthorizedResponse = () =>
  new Response(JSON.stringify({ errors: [{ message: "Unauthorized" }] }), {
    headers: { "content-type": "application/json" },
    status: 401,
  });

const AppProvidersWrapper = ({ children }: PropsWithChildren) => (
  <AppProviders>{children}</AppProviders>
);

const useProviderState = () => ({
  authFlow: useAuthFlow(),
  queryClient: useQueryClient(),
  signOut: useSignOut(),
});

describe("expired auth session", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    jest
      .mocked(SecureStore.getItemAsync)
      .mockImplementation(async (key) => storage.get(key) ?? null);
    jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async (key) => {
      storage.delete(key);
    });
    jest
      .mocked(SecureStore.setItemAsync)
      .mockImplementation(async (key, value) => {
        storage.set(key, value);
      });
    global.fetch = async () => unauthorizedResponse();
  });

  it("clears provider state when refresh fails", async () => {
    const { result, unmount } = renderHook(useProviderState, {
      wrapper: AppProvidersWrapper,
    });
    await act(async () => {
      await setAuthTokens({
        accessToken: "expired-access",
        refreshToken: "expired-refresh",
      });
    });
    result.current.queryClient.setQueryData(["viewer"], { id: "viewer-1" });
    result.current.queryClient
      .getMutationCache()
      .build(result.current.queryClient, {
        gcTime: Infinity,
        mutationKey: ["update-profile"],
        mutationFn: async () => ({ email: "secret@example.com" }),
      });
    act(() => {
      result.current.authFlow.setKakaoSignup({
        kakaoSignupToken: "kakao-signup-token",
        email: "secret@example.com",
        emailVerificationRequired: false,
      });
    });

    let requestError: unknown;
    await act(async () => {
      try {
        await graphqlRequest("query Viewer { viewer { id } }");
      } catch (error) {
        requestError = error;
      }
    });

    expect(requestError).toMatchObject({ status: 401 });
    expect(result.current.queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(result.current.queryClient.getMutationCache().getAll()).toHaveLength(
      0,
    );
    expect(result.current.authFlow.kakaoSignup).toBeUndefined();
    unmount();
  });

  it("clears query, mutation, Kakao, and pending identity state on manual reset", async () => {
    const { result, unmount } = renderHook(useProviderState, {
      wrapper: AppProvidersWrapper,
    });
    await act(async () => {
      await setAuthTokens({
        accessToken: "access-1",
        refreshToken: "refresh-1",
      });
    });
    result.current.queryClient.setQueryData(["viewer"], { id: "viewer-1" });
    result.current.queryClient
      .getMutationCache()
      .build(result.current.queryClient, {
        gcTime: Infinity,
        mutationKey: ["update-profile"],
        mutationFn: async () => ({ email: "secret@example.com" }),
      });
    act(() => {
      result.current.authFlow.setKakaoSignup({
        kakaoSignupToken: "kakao-signup-token",
        email: "secret@example.com",
        emailVerificationRequired: false,
      });
    });
    let identityRequest: Promise<string> | undefined;
    act(() => {
      identityRequest =
        result.current.authFlow.openIdentityProviderSheet("SIGNUP");
    });
    const identityResult = identityRequest?.then(
      () => undefined,
      (error: unknown) => error,
    );

    await act(async () => {
      await result.current.signOut();
    });

    const kakaoSignupAfterReset = result.current.authFlow.kakaoSignup;
    const identityRequestAfterReset = result.current.authFlow.identityRequest;
    if (identityRequestAfterReset) {
      act(() => result.current.authFlow.cancelIdentityRequest());
    }
    expect(result.current.queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(result.current.queryClient.getMutationCache().getAll()).toHaveLength(
      0,
    );
    expect(kakaoSignupAfterReset).toBeUndefined();
    expect(identityRequestAfterReset).toBeUndefined();
    await expect(identityResult).resolves.toBeInstanceOf(
      IdentitySheetDismissedError,
    );
    unmount();
  });

  it("clears provider state before replacing an account session", async () => {
    const { result, unmount } = renderHook(useProviderState, {
      wrapper: AppProvidersWrapper,
    });
    await act(async () => {
      await setAuthTokens({
        accessToken: "access-a",
        refreshToken: "refresh-a",
      });
    });
    result.current.queryClient.setQueryData(["viewer"], { id: "viewer-a" });
    result.current.queryClient
      .getMutationCache()
      .build(result.current.queryClient, {
        gcTime: Infinity,
        mutationKey: ["update-profile"],
        mutationFn: async () => ({ email: "a@example.com" }),
      });
    act(() => {
      result.current.authFlow.setKakaoSignup({
        kakaoSignupToken: "kakao-a",
        email: "a@example.com",
        emailVerificationRequired: false,
      });
    });

    await act(async () => {
      await setAuthTokens({
        accessToken: "access-b",
        refreshToken: "refresh-b",
      });
    });

    expect(result.current.queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(result.current.queryClient.getMutationCache().getAll()).toHaveLength(
      0,
    );
    expect(result.current.authFlow.kakaoSignup).toBeUndefined();
    expect(storage.get("dadamjang.auth-session")).toBe(
      JSON.stringify({
        version: 1,
        accessToken: "access-b",
        refreshToken: "refresh-b",
      }),
    );
    unmount();
  });
});

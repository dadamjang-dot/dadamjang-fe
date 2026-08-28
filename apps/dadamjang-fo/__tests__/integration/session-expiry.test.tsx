import { useQueryClient } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react-native";
import * as SecureStore from "expo-secure-store";
import type { PropsWithChildren } from "react";

import { graphqlRequest } from "@dadamjang/graphql-client";

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

describe("expired auth session", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.set("dadamjang.access-token", "expired-access");
    storage.set("dadamjang.refresh-token", "expired-refresh");
    jest
      .mocked(SecureStore.getItemAsync)
      .mockImplementation(async (key) => storage.get(key) ?? null);
    jest
      .mocked(SecureStore.deleteItemAsync)
      .mockImplementation(async (key) => {
        storage.delete(key);
      });
    global.fetch = async () => unauthorizedResponse();
  });

  it("clears the provider cache when refresh fails", async () => {
    const { result, unmount } = renderHook(() => useQueryClient(), {
      wrapper: AppProvidersWrapper,
    });
    const queryClient = result.current;
    queryClient.setQueryData(["viewer"], { id: "viewer-1" });

    await expect(
      graphqlRequest("query Viewer { viewer { id } }"),
    ).rejects.toMatchObject({ status: 401 });

    expect(queryClient.getQueryData(["viewer"])).toBeUndefined();
    unmount();
  });
});

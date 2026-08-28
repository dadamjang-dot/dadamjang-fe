import * as SecureStore from "expo-secure-store";

import {
  createAuthenticatedGraphqlClient,
  GraphqlError,
  type AuthenticatedGraphqlClient,
} from "@dadamjang/graphql-client";

import {
  badUserInputResponse,
  installSecureStoreMocks,
  installTransport,
  invalidationKey,
  jsonResponse,
  sessionKey,
  storedSession,
  testStorageNamespace,
  unauthenticatedResponse,
  unauthorizedResponse,
} from "./graphql-client-test-helpers";

describe("GraphQL authentication", () => {
  const storage = new Map<string, string>();
  let client: AuthenticatedGraphqlClient;

  beforeEach(() => {
    storage.clear();
    installSecureStoreMocks(storage);
    client = createAuthenticatedGraphqlClient({
      storage: SecureStore,
      storageNamespace: testStorageNamespace,
    });
  });

  it("does not refresh or retry BAD_USER_INPUT failures", async () => {
    storage.set(sessionKey, storedSession("access-1", "refresh-1"));
    const requests = installTransport([
      badUserInputResponse(),
      jsonResponse({
        data: {
          refresh: { accessToken: "access-2", refreshToken: "refresh-2" },
        },
      }),
      jsonResponse({ data: { viewer: { id: "viewer-1" } } }),
    ]);

    await expect(
      client.graphqlRequest("query Viewer { viewer { id } }"),
    ).rejects.toMatchObject<Partial<GraphqlError>>({
      message: "Invalid input",
      name: "GraphqlError",
      status: 200,
    });
    expect(requests).toHaveLength(1);
  });

  it("refreshes once and returns the retried operation", async () => {
    storage.set(sessionKey, storedSession("expired-access", "refresh-1"));
    const requests = installTransport([
      unauthorizedResponse(),
      jsonResponse({
        data: {
          refresh: { accessToken: "access-2", refreshToken: "refresh-2" },
        },
      }),
      jsonResponse({ data: { viewer: { id: "viewer-1" } } }),
    ]);

    await expect(
      client.graphqlRequest<{ viewer: { id: string } }>(
        "query Viewer { viewer { id } }",
      ),
    ).resolves.toEqual({ viewer: { id: "viewer-1" } });
    expect(requests.map(({ authorization }) => authorization)).toEqual([
      "Bearer expired-access",
      "Bearer refresh-1",
      "Bearer access-2",
    ]);
    expect(storage.get(sessionKey)).toBe(
      storedSession("access-2", "refresh-2"),
    );
  });

  it("refreshes GraphQL UNAUTHENTICATED and retries once", async () => {
    storage.set(sessionKey, storedSession("expired-access", "refresh-1"));
    const requests = installTransport([
      unauthenticatedResponse(),
      jsonResponse({
        data: {
          refresh: { accessToken: "access-2", refreshToken: "refresh-2" },
        },
      }),
      jsonResponse({ data: { viewer: { id: "viewer-1" } } }),
    ]);

    await expect(
      client.graphqlRequest<{ viewer: { id: string } }>(
        "query Viewer { viewer { id } }",
      ),
    ).resolves.toEqual({ viewer: { id: "viewer-1" } });
    expect(requests.map(({ authorization }) => authorization)).toEqual([
      "Bearer expired-access",
      "Bearer refresh-1",
      "Bearer access-2",
    ]);
  });
  it("clears stale tokens when refresh fails", async () => {
    storage.set(sessionKey, storedSession("expired-access", "expired-refresh"));
    installTransport([
      unauthorizedResponse(),
      jsonResponse({ errors: [{ message: "Refresh expired" }] }, 401),
    ]);

    await expect(
      client.graphqlRequest("query Viewer { viewer { id } }"),
    ).rejects.toMatchObject<Partial<GraphqlError>>({ status: 401 });
    expect(storage.get(sessionKey)).toBe(JSON.stringify({ version: 1 }));
  });

  it.each([
    ["network", new TypeError("Network request failed")],
    [
      "timeout",
      Object.assign(new Error("The request timed out"), {
        name: "TimeoutError",
      }),
    ],
  ])(
    "preserves credentials when refresh hits a %s failure",
    async (_, failure) => {
      storage.set(sessionKey, storedSession("expired-access", "refresh-1"));
      const cleanup = jest.fn();
      client.setSessionResetHandler(cleanup);
      let requestCount = 0;
      global.fetch = jest.fn(async () => {
        requestCount += 1;
        if (requestCount === 1) return unauthorizedResponse();
        throw failure;
      }) as typeof fetch;

      await expect(
        client.graphqlRequest("query Viewer { viewer { id } }"),
      ).rejects.toMatchObject({ message: failure.message, name: failure.name });
      await expect(client.getAccessToken()).resolves.toBe("expired-access");
      await expect(client.getRefreshToken()).resolves.toBe("refresh-1");
      expect(cleanup).not.toHaveBeenCalled();
      expect(storage.get(sessionKey)).toBe(
        storedSession("expired-access", "refresh-1"),
      );
      expect(storage.has(invalidationKey)).toBe(false);
    },
  );

  it("preserves credentials when refresh receives HTTP 503", async () => {
    storage.set(sessionKey, storedSession("expired-access", "refresh-1"));
    const cleanup = jest.fn();
    client.setSessionResetHandler(cleanup);
    installTransport([
      unauthorizedResponse(),
      jsonResponse({ errors: [{ message: "Service unavailable" }] }, 503),
    ]);

    await expect(
      client.graphqlRequest("query Viewer { viewer { id } }"),
    ).rejects.toMatchObject<Partial<GraphqlError>>({
      message: "Service unavailable",
      name: "GraphqlError",
      status: 503,
    });
    expect(cleanup).not.toHaveBeenCalled();
    expect(storage.get(sessionKey)).toBe(
      storedSession("expired-access", "refresh-1"),
    );
    expect(storage.has(invalidationKey)).toBe(false);
  });

  it("invalidates credentials when refresh returns malformed tokens", async () => {
    storage.set(sessionKey, storedSession("expired-access", "refresh-1"));
    installTransport([
      unauthorizedResponse(),
      jsonResponse({
        data: { refresh: { accessToken: "", refreshToken: "refresh-2" } },
      }),
    ]);

    await expect(
      client.graphqlRequest("query Viewer { viewer { id } }"),
    ).rejects.toMatchObject<Partial<GraphqlError>>({ status: 401 });
    expect(storage.get(sessionKey)).toBe(JSON.stringify({ version: 1 }));
  });

  it("fails closed after one retry receives HTTP 401", async () => {
    storage.set(sessionKey, storedSession("expired-access", "refresh-1"));
    const requests = installTransport([
      unauthorizedResponse(),
      jsonResponse({
        data: {
          refresh: { accessToken: "access-2", refreshToken: "refresh-2" },
        },
      }),
      unauthorizedResponse(),
    ]);

    await expect(
      client.graphqlRequest("query Viewer { viewer { id } }"),
    ).rejects.toMatchObject<Partial<GraphqlError>>({
      message: "인증 세션이 만료되었어요. 다시 로그인해 주세요.",
      name: "GraphqlError",
      status: 401,
    });
    expect(requests.map(({ authorization }) => authorization)).toEqual([
      "Bearer expired-access",
      "Bearer refresh-1",
      "Bearer access-2",
    ]);
    expect(storage.get(sessionKey)).toBe(JSON.stringify({ version: 1 }));
  });

  it("fails closed after one retry receives GraphQL UNAUTHENTICATED", async () => {
    storage.set(sessionKey, storedSession("expired-access", "refresh-1"));
    const cleanup = jest.fn();
    client.setSessionResetHandler(cleanup);
    const requests = installTransport([
      unauthenticatedResponse(),
      jsonResponse({
        data: {
          refresh: { accessToken: "access-2", refreshToken: "refresh-2" },
        },
      }),
      unauthenticatedResponse(),
    ]);

    await expect(
      client.graphqlRequest("query Viewer { viewer { id } }"),
    ).rejects.toMatchObject<Partial<GraphqlError>>({
      message: "인증 세션이 만료되었어요. 다시 로그인해 주세요.",
      name: "GraphqlError",
      status: 401,
    });
    expect(requests).toHaveLength(3);
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(storage.get(sessionKey)).toBe(JSON.stringify({ version: 1 }));
  });
});

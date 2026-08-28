import * as SecureStore from "expo-secure-store";

import {
  createAuthenticatedGraphqlClient,
  GraphqlError,
  type AuthenticatedGraphqlClient,
} from "@dadamjang/graphql-client";

type CapturedRequest = {
  body: string;
  authorization: string | null;
};

const testStorageNamespace = "test-auth";
const sessionKey = `${testStorageNamespace}.auth-session`;
const invalidationKey = `${testStorageNamespace}.auth-session-invalidated`;
const legacyAccessTokenKey = `${testStorageNamespace}.access-token`;
const legacyRefreshTokenKey = `${testStorageNamespace}.refresh-token`;
const storedSession = (accessToken: string, refreshToken: string) =>
  JSON.stringify({ version: 1, accessToken, refreshToken });

const jsonResponse = (body: object, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });

const unauthorizedResponse = () => jsonResponse({ errors: [{}] }, 401);

const unauthenticatedResponse = () =>
  jsonResponse({
    errors: [
      {
        extensions: { code: "UNAUTHENTICATED" },
        message: "Unauthenticated",
      },
    ],
  });

const badUserInputResponse = () =>
  jsonResponse({
    errors: [
      {
        extensions: { code: "BAD_USER_INPUT" },
        message: "Invalid input",
      },
    ],
  });

const installTransport = (responses: readonly Response[]) => {
  const requests: CapturedRequest[] = [];
  let responseIndex = 0;

  global.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
    const response = responses[responseIndex];
    if (!response) throw new Error("Missing GraphQL test response");

    requests.push({
      authorization: new Headers(init?.headers).get("Authorization"),
      body: String(init?.body),
    });
    responseIndex += 1;
    return response;
  };

  return requests;
};

const createTestStorage = (entries: Record<string, string>) => {
  const values = new Map(Object.entries(entries));
  return {
    storage: {
      deleteItemAsync: async (key: string) => {
        values.delete(key);
      },
      getItemAsync: async (key: string) => values.get(key) ?? null,
      setItemAsync: async (key: string, value: string) => {
        values.set(key, value);
      },
    },
    values,
  };
};

describe("GraphQL authentication", () => {
  const storage = new Map<string, string>();
  let client: AuthenticatedGraphqlClient;

  beforeEach(() => {
    storage.clear();
    jest
      .mocked(SecureStore.getItemAsync)
      .mockImplementation(async (key) => storage.get(key) ?? null);
    jest
      .mocked(SecureStore.setItemAsync)
      .mockImplementation(async (key, value) => {
        storage.set(key, value);
      });
    jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async (key) => {
      storage.delete(key);
    });
    client = createAuthenticatedGraphqlClient({
      storage: SecureStore,
      storageNamespace: testStorageNamespace,
    });
  });

  it("persists access and refresh tokens as one atomic record", async () => {
    await client.setAuthTokens({
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });

    expect(storage.get(sessionKey)).toBe(
      storedSession("access-1", "refresh-1"),
    );
    expect(storage.has(legacyAccessTokenKey)).toBe(false);
    expect(storage.has(legacyRefreshTokenKey)).toBe(false);
    expect(storage.has(invalidationKey)).toBe(false);
  });

  it("does not expose partial token setters", () => {
    expect(client).not.toHaveProperty("setAccessToken");
    expect(client).not.toHaveProperty("setRefreshToken");
  });

  it("reserves the default storage namespace for the singleton", () => {
    expect(() =>
      createAuthenticatedGraphqlClient({
        storage: SecureStore,
        storageNamespace: "dadamjang",
      }),
    ).toThrow("The default storage namespace is reserved");
  });

  it("migrates a complete legacy token pair to the atomic record", async () => {
    storage.set(legacyAccessTokenKey, "legacy-access");
    storage.set(legacyRefreshTokenKey, "legacy-refresh");

    await expect(client.getAccessToken()).resolves.toBe("legacy-access");
    expect(storage.get(sessionKey)).toBe(
      storedSession("legacy-access", "legacy-refresh"),
    );
    expect(storage.has(legacyAccessTokenKey)).toBe(false);
    expect(storage.has(legacyRefreshTokenKey)).toBe(false);
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

  it("shares one refresh across parallel unauthorized failures", async () => {
    storage.set(sessionKey, storedSession("expired-access", "refresh-1"));
    const requests: CapturedRequest[] = [];
    let expiredRequestCount = 0;
    let releaseExpiredRequests: () => void = () => undefined;
    const expiredRequests = new Promise<void>((resolve) => {
      releaseExpiredRequests = resolve;
    });

    global.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
      const request = {
        authorization: new Headers(init?.headers).get("Authorization"),
        body: String(init?.body),
      };
      requests.push(request);

      if (request.authorization === "Bearer expired-access") {
        expiredRequestCount += 1;
        if (expiredRequestCount === 2) releaseExpiredRequests();
        await expiredRequests;
        return unauthorizedResponse();
      }
      if (request.body.includes("mutation Refresh")) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        return jsonResponse({
          data: {
            refresh: { accessToken: "access-2", refreshToken: "refresh-2" },
          },
        });
      }
      return jsonResponse({ data: { viewer: { id: "viewer-1" } } });
    };

    await expect(
      Promise.all([
        client.graphqlRequest<{ viewer: { id: string } }>(
          "query Viewer { viewer { id } }",
        ),
        client.graphqlRequest<{ viewer: { id: string } }>(
          "query Viewer { viewer { id } }",
        ),
      ]),
    ).resolves.toEqual([
      { viewer: { id: "viewer-1" } },
      { viewer: { id: "viewer-1" } },
    ]);
    expect(
      requests.filter(({ body }) => body.includes("mutation Refresh")),
    ).toHaveLength(1);
  });

  it("reuses a rotated token for a staggered unauthorized response", async () => {
    storage.set(sessionKey, storedSession("expired-access", "refresh-1"));
    const requests: CapturedRequest[] = [];
    let expiredRequestCount = 0;
    let releaseSecondFailure: () => void = () => undefined;
    const secondFailure = new Promise<void>((resolve) => {
      releaseSecondFailure = resolve;
    });

    global.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
      const request = {
        authorization: new Headers(init?.headers).get("Authorization"),
        body: String(init?.body),
      };
      requests.push(request);

      if (request.authorization === "Bearer expired-access") {
        expiredRequestCount += 1;
        if (expiredRequestCount === 2) await secondFailure;
        return unauthorizedResponse();
      }
      if (request.body.includes("mutation Refresh")) {
        return jsonResponse({
          data: {
            refresh: { accessToken: "access-2", refreshToken: "refresh-2" },
          },
        });
      }
      releaseSecondFailure();
      return jsonResponse({ data: { viewer: { id: "viewer-1" } } });
    };

    await expect(
      Promise.all([
        client.graphqlRequest<{ viewer: { id: string } }>(
          "query Viewer { viewer { id } }",
        ),
        client.graphqlRequest<{ viewer: { id: string } }>(
          "query Viewer { viewer { id } }",
        ),
      ]),
    ).resolves.toEqual([
      { viewer: { id: "viewer-1" } },
      { viewer: { id: "viewer-1" } },
    ]);
    expect(
      requests.filter(({ body }) => body.includes("mutation Refresh")),
    ).toHaveLength(1);
    expect(
      requests.filter(
        ({ authorization }) => authorization === "Bearer access-2",
      ),
    ).toHaveLength(2);
  });

  it("reuses current credentials after a refresh-token-only rotation", async () => {
    storage.set(sessionKey, storedSession("access-a", "refresh-1"));
    const requests: CapturedRequest[] = [];
    let operationRequestCount = 0;
    let releaseInitialRequests: () => void = () => undefined;
    let releaseSecondFailure: () => void = () => undefined;
    const initialRequests = new Promise<void>((resolve) => {
      releaseInitialRequests = resolve;
    });
    const secondFailure = new Promise<void>((resolve) => {
      releaseSecondFailure = resolve;
    });

    global.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
      const request = {
        authorization: new Headers(init?.headers).get("Authorization"),
        body: String(init?.body),
      };
      requests.push(request);

      if (request.body.includes("mutation Refresh")) {
        const refreshCount = requests.filter(({ body }) =>
          body.includes("mutation Refresh"),
        ).length;
        if (refreshCount > 1) return unauthorizedResponse();
        return jsonResponse({
          data: {
            refresh: { accessToken: "access-a", refreshToken: "refresh-2" },
          },
        });
      }

      operationRequestCount += 1;
      if (operationRequestCount === 1) {
        await initialRequests;
        return unauthorizedResponse();
      }
      if (operationRequestCount === 2) {
        releaseInitialRequests();
        await secondFailure;
        return unauthorizedResponse();
      }

      releaseSecondFailure();
      return jsonResponse({ data: { viewer: { id: "viewer-1" } } });
    };

    await expect(
      Promise.all([
        client.graphqlRequest<{ viewer: { id: string } }>(
          "query Viewer { viewer { id } }",
        ),
        client.graphqlRequest<{ viewer: { id: string } }>(
          "query Viewer { viewer { id } }",
        ),
      ]),
    ).resolves.toEqual([
      { viewer: { id: "viewer-1" } },
      { viewer: { id: "viewer-1" } },
    ]);
    expect(
      requests.filter(({ body }) => body.includes("mutation Refresh")),
    ).toHaveLength(1);
    await expect(client.getAccessToken()).resolves.toBe("access-a");
    await expect(client.getRefreshToken()).resolves.toBe("refresh-2");
    expect(storage.get(sessionKey)).toBe(
      storedSession("access-a", "refresh-2"),
    );
  });

  it("does not restore or retry a session after logout during refresh", async () => {
    storage.set(sessionKey, storedSession("access-a", "refresh-a"));
    let releaseRefresh: () => void = () => undefined;
    let markRefreshStarted: () => void = () => undefined;
    const refreshStarted = new Promise<void>((resolve) => {
      markRefreshStarted = resolve;
    });
    const refreshResponse = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });

    global.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
      const request = {
        authorization: new Headers(init?.headers).get("Authorization"),
        body: String(init?.body),
      };
      if (request.body.includes("mutation Refresh")) {
        markRefreshStarted();
        await refreshResponse;
        return jsonResponse({
          data: {
            refresh: { accessToken: "access-a2", refreshToken: "refresh-a2" },
          },
        });
      }
      if (request.authorization === "Bearer access-a")
        return unauthorizedResponse();
      return jsonResponse({ data: { viewer: { id: "viewer-a" } } });
    };

    const request = client.graphqlRequest("query Viewer { viewer { id } }");
    await refreshStarted;
    await client.resetAuthSession();
    releaseRefresh();

    await expect(request).rejects.toMatchObject<Partial<GraphqlError>>({
      name: "GraphqlError",
      status: 401,
    });
    expect(storage.get(sessionKey)).toBe(JSON.stringify({ version: 1 }));
  });

  it("does not let a session A refresh overwrite session B login", async () => {
    storage.set(sessionKey, storedSession("access-a", "refresh-a"));
    const requests: CapturedRequest[] = [];
    let releaseRefresh: () => void = () => undefined;
    let markRefreshStarted: () => void = () => undefined;
    const refreshStarted = new Promise<void>((resolve) => {
      markRefreshStarted = resolve;
    });
    const refreshResponse = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });

    global.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
      const request = {
        authorization: new Headers(init?.headers).get("Authorization"),
        body: String(init?.body),
      };
      requests.push(request);
      if (request.body.includes("mutation Refresh")) {
        markRefreshStarted();
        await refreshResponse;
        return jsonResponse({
          data: {
            refresh: { accessToken: "access-a2", refreshToken: "refresh-a2" },
          },
        });
      }
      if (request.authorization === "Bearer access-a")
        return unauthorizedResponse();
      return jsonResponse({ data: { viewer: { id: "viewer" } } });
    };

    const request = client.graphqlRequest("query Viewer { viewer { id } }");
    await refreshStarted;
    await client.setAuthTokens({
      accessToken: "access-b",
      refreshToken: "refresh-b",
    });
    releaseRefresh();

    await expect(request).rejects.toMatchObject<Partial<GraphqlError>>({
      message: "인증 세션이 만료되었어요. 다시 로그인해 주세요.",
      name: "GraphqlError",
      status: 401,
    });
    expect(storage.get(sessionKey)).toBe(
      storedSession("access-b", "refresh-b"),
    );
    expect(
      requests.some(({ authorization }) => authorization === "Bearer access-b"),
    ).toBe(false);
  });

  it("isolates refresh flights, tokens, and reset handlers between clients", async () => {
    const firstStorage = createTestStorage({
      "first.auth-session": storedSession("access-a", "refresh-a"),
    });
    const secondStorage = createTestStorage({
      "second.auth-session": storedSession("access-b", "refresh-b"),
    });
    const firstClient = createAuthenticatedGraphqlClient({
      storage: firstStorage.storage,
      storageNamespace: "first",
    });
    const secondClient = createAuthenticatedGraphqlClient({
      storage: secondStorage.storage,
      storageNamespace: "second",
    });
    const firstCleanup = jest.fn();
    const secondCleanup = jest.fn();
    firstClient.setSessionResetHandler(firstCleanup);
    secondClient.setSessionResetHandler(secondCleanup);
    const refreshAuthorizations: string[] = [];

    global.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
      const authorization = new Headers(init?.headers).get("Authorization");
      const body = String(init?.body);
      if (body.includes("mutation Refresh")) {
        if (authorization) refreshAuthorizations.push(authorization);
        const suffix = authorization === "Bearer refresh-a" ? "a" : "b";
        return jsonResponse({
          data: {
            refresh: {
              accessToken: `access-${suffix}2`,
              refreshToken: `refresh-${suffix}2`,
            },
          },
        });
      }
      if (
        authorization === "Bearer access-a" ||
        authorization === "Bearer access-b"
      ) {
        return unauthorizedResponse();
      }
      return jsonResponse({ data: { viewer: { id: authorization } } });
    };

    await expect(
      Promise.all([
        firstClient.graphqlRequest("query Viewer { viewer { id } }"),
        secondClient.graphqlRequest("query Viewer { viewer { id } }"),
      ]),
    ).resolves.toHaveLength(2);
    expect(refreshAuthorizations.sort()).toEqual([
      "Bearer refresh-a",
      "Bearer refresh-b",
    ]);
    expect(firstStorage.values.get("first.auth-session")).toBe(
      storedSession("access-a2", "refresh-a2"),
    );
    expect(secondStorage.values.get("second.auth-session")).toBe(
      storedSession("access-b2", "refresh-b2"),
    );

    await firstClient.resetAuthSession();

    expect(firstCleanup).toHaveBeenCalledTimes(1);
    expect(secondCleanup).not.toHaveBeenCalled();
    expect(firstStorage.values.get("first.auth-session")).toBe(
      JSON.stringify({ version: 1 }),
    );
    expect(secondStorage.values.get("second.auth-session")).toBe(
      storedSession("access-b2", "refresh-b2"),
    );
  });

  it("isolates two clients racing on the same storage with explicit namespaces", async () => {
    const shared = createTestStorage({});
    const firstClient = createAuthenticatedGraphqlClient({
      storage: shared.storage,
      storageNamespace: "account-a",
    });
    const secondClient = createAuthenticatedGraphqlClient({
      storage: shared.storage,
      storageNamespace: "account-b",
    });

    await Promise.all([
      firstClient.setAuthTokens({
        accessToken: "access-a",
        refreshToken: "refresh-a",
      }),
      secondClient.setAuthTokens({
        accessToken: "access-b",
        refreshToken: "refresh-b",
      }),
    ]);

    const restartedFirstClient = createAuthenticatedGraphqlClient({
      storage: shared.storage,
      storageNamespace: "account-a",
    });
    const restartedSecondClient = createAuthenticatedGraphqlClient({
      storage: shared.storage,
      storageNamespace: "account-b",
    });
    await expect(restartedFirstClient.getAccessToken()).resolves.toBe(
      "access-a",
    );
    await expect(restartedSecondClient.getAccessToken()).resolves.toBe(
      "access-b",
    );
  });

  it("fails closed when reading SecureStore rejects", async () => {
    storage.set(sessionKey, storedSession("access-1", "refresh-1"));
    jest
      .mocked(SecureStore.getItemAsync)
      .mockRejectedValueOnce(new Error("native read failed"));
    const cleanup = jest.fn();
    client.setSessionResetHandler(cleanup);
    global.fetch = jest.fn();

    await expect(
      client.graphqlRequest("query Viewer { viewer { id } }"),
    ).rejects.toMatchObject<Partial<GraphqlError>>({
      message: "인증 세션이 만료되었어요. 다시 로그인해 주세요.",
      name: "GraphqlError",
      status: 401,
    });
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(storage.get(invalidationKey)).toBe("1");
    expect(storage.get(sessionKey)).toBe(JSON.stringify({ version: 1 }));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("keeps a failed logout invalidated across restart", async () => {
    storage.set(legacyAccessTokenKey, "access-1");
    storage.set(legacyRefreshTokenKey, "refresh-1");
    await client.getAccessToken();
    const cleanup = jest.fn();
    client.setSessionResetHandler(cleanup);
    jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async (key) => {
      if (key === legacyAccessTokenKey || key === legacyRefreshTokenKey)
        throw new Error("native delete failed");
      storage.delete(key);
    });

    await expect(client.resetAuthSession()).rejects.toMatchObject({
      message: "인증 정보를 안전하게 정리하지 못했어요. 다시 시도해 주세요.",
    });

    expect(await client.getAccessToken()).toBeNull();
    expect(await client.getRefreshToken()).toBeNull();
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
      legacyAccessTokenKey,
    );
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
      legacyRefreshTokenKey,
    );
    const restartedClient = createAuthenticatedGraphqlClient({
      storage: SecureStore,
      storageNamespace: testStorageNamespace,
    });
    await expect(restartedClient.getAccessToken()).resolves.toBeNull();
    await expect(restartedClient.getRefreshToken()).resolves.toBeNull();
  });

  it("keeps a durable marker when tombstone and token deletion fail", async () => {
    storage.set(sessionKey, storedSession("access-1", "refresh-1"));
    storage.set(legacyAccessTokenKey, "legacy-access");
    storage.set(legacyRefreshTokenKey, "legacy-refresh");
    jest
      .mocked(SecureStore.setItemAsync)
      .mockImplementation(async (key, value) => {
        if (key === sessionKey && value === JSON.stringify({ version: 1 })) {
          throw new Error("native tombstone write failed");
        }
        storage.set(key, value);
      });
    jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async (key) => {
      if (
        key === sessionKey ||
        key === legacyAccessTokenKey ||
        key === legacyRefreshTokenKey
      ) {
        throw new Error("native delete failed");
      }
      storage.delete(key);
    });

    await expect(client.resetAuthSession()).rejects.toMatchObject({
      message: "인증 정보를 안전하게 정리하지 못했어요. 다시 시도해 주세요.",
    });
    expect(storage.get(invalidationKey)).toBe("1");
    expect(storage.get(sessionKey)).toBe(
      storedSession("access-1", "refresh-1"),
    );
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(sessionKey);

    const restartedClient = createAuthenticatedGraphqlClient({
      storage: SecureStore,
      storageNamespace: testStorageNamespace,
    });
    await expect(restartedClient.getAccessToken()).resolves.toBeNull();
  });

  it("propagates reset-handler failure after invalidating persisted tokens", async () => {
    storage.set(sessionKey, storedSession("access-1", "refresh-1"));
    client.setSessionResetHandler(async () => {
      throw new Error("query cleanup failed");
    });

    await expect(client.resetAuthSession()).rejects.toMatchObject({
      message: "인증 정보를 안전하게 정리하지 못했어요. 다시 시도해 주세요.",
    });
    expect(storage.get(sessionKey)).toBe(JSON.stringify({ version: 1 }));
    expect(storage.get(invalidationKey)).toBe("1");

    const restartedClient = createAuthenticatedGraphqlClient({
      storage: SecureStore,
      storageNamespace: testStorageNamespace,
    });
    await expect(restartedClient.getAccessToken()).resolves.toBeNull();
  });

  it("fails closed across restart when an atomic session write rejects", async () => {
    storage.set(sessionKey, storedSession("access-a", "refresh-a"));
    const cleanup = jest.fn();
    client.setSessionResetHandler(cleanup);
    let rejectedReplacement = false;
    jest
      .mocked(SecureStore.setItemAsync)
      .mockImplementation(async (key, value) => {
        if (
          key === sessionKey &&
          value === storedSession("access-b", "refresh-b") &&
          !rejectedReplacement
        ) {
          rejectedReplacement = true;
          throw new Error("native write failed");
        }
        storage.set(key, value);
      });

    await expect(
      client.setAuthTokens({
        accessToken: "access-b",
        refreshToken: "refresh-b",
      }),
    ).rejects.toMatchObject<Partial<GraphqlError>>({
      message: "인증 세션이 만료되었어요. 다시 로그인해 주세요.",
      name: "GraphqlError",
      status: 401,
    });
    expect(await client.getAccessToken()).toBeNull();
    expect(await client.getRefreshToken()).toBeNull();
    expect(storage.get(sessionKey)).toBe(JSON.stringify({ version: 1 }));
    expect(storage.get(invalidationKey)).toBe("1");
    expect(cleanup).toHaveBeenCalledTimes(1);
    const restartedClient = createAuthenticatedGraphqlClient({
      storage: SecureStore,
      storageNamespace: testStorageNamespace,
    });
    await expect(restartedClient.getAccessToken()).resolves.toBeNull();
    await expect(restartedClient.getRefreshToken()).resolves.toBeNull();
  });

  it("does not cache a stale load after an atomic session replacement", async () => {
    const values = new Map([
      [sessionKey, storedSession("access-a", "refresh-a")],
    ]);
    let releaseRead: () => void = () => undefined;
    let markReadStarted: () => void = () => undefined;
    const readStarted = new Promise<void>((resolve) => {
      markReadStarted = resolve;
    });
    const readRelease = new Promise<void>((resolve) => {
      releaseRead = resolve;
    });
    const racingStorage = {
      deleteItemAsync: async (key: string) => {
        values.delete(key);
      },
      getItemAsync: async (key: string) => {
        const value = values.get(key) ?? null;
        if (key === sessionKey) {
          markReadStarted();
          await readRelease;
        }
        return value;
      },
      setItemAsync: async (key: string, value: string) => {
        values.set(key, value);
      },
    };
    const racingClient = createAuthenticatedGraphqlClient({
      storage: racingStorage,
      storageNamespace: testStorageNamespace,
    });

    const staleRead = racingClient.getAccessToken();
    await readStarted;
    await racingClient.setAuthTokens({
      accessToken: "access-b",
      refreshToken: "refresh-b",
    });
    releaseRead();

    await expect(staleRead).rejects.toMatchObject<Partial<GraphqlError>>({
      status: 401,
    });
    await expect(racingClient.getAccessToken()).resolves.toBe("access-b");
    expect(values.get(sessionKey)).toBe(storedSession("access-b", "refresh-b"));
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

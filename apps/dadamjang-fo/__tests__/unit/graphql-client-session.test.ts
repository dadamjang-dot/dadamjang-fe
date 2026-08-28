import * as SecureStore from "expo-secure-store";

import {
  createAuthenticatedGraphqlClient,
  GraphqlError,
  type AuthenticatedGraphqlClient,
} from "@dadamjang/graphql-client";

import {
  createTestStorage,
  installSecureStoreMocks,
  invalidationKey,
  jsonResponse,
  legacyAccessTokenKey,
  legacyRefreshTokenKey,
  sessionKey,
  storedSession,
  testStorageNamespace,
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
});

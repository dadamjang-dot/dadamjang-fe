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
    client = createAuthenticatedGraphqlClient({ storage: SecureStore });
  });

  it("persists access and refresh tokens", async () => {
    await client.setAuthTokens({
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });

    expect(storage.get("dadamjang.access-token")).toBe("access-1");
    expect(storage.get("dadamjang.refresh-token")).toBe("refresh-1");
  });

  it("does not refresh or retry BAD_USER_INPUT failures", async () => {
    storage.set("dadamjang.access-token", "access-1");
    storage.set("dadamjang.refresh-token", "refresh-1");
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
    storage.set("dadamjang.access-token", "expired-access");
    storage.set("dadamjang.refresh-token", "refresh-1");
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
    expect(storage.get("dadamjang.access-token")).toBe("access-2");
    expect(storage.get("dadamjang.refresh-token")).toBe("refresh-2");
  });

  it("refreshes GraphQL UNAUTHENTICATED and retries once", async () => {
    storage.set("dadamjang.access-token", "expired-access");
    storage.set("dadamjang.refresh-token", "refresh-1");
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
    storage.set("dadamjang.access-token", "expired-access");
    storage.set("dadamjang.refresh-token", "refresh-1");
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
    storage.set("dadamjang.access-token", "expired-access");
    storage.set("dadamjang.refresh-token", "refresh-1");
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

  it("does not restore or retry a session after logout during refresh", async () => {
    storage.set("dadamjang.access-token", "access-a");
    storage.set("dadamjang.refresh-token", "refresh-a");
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
    expect(storage.has("dadamjang.access-token")).toBe(false);
    expect(storage.has("dadamjang.refresh-token")).toBe(false);
  });

  it("does not let a session A refresh overwrite session B login", async () => {
    storage.set("dadamjang.access-token", "access-a");
    storage.set("dadamjang.refresh-token", "refresh-a");
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
    expect(storage.get("dadamjang.access-token")).toBe("access-b");
    expect(storage.get("dadamjang.refresh-token")).toBe("refresh-b");
    expect(
      requests.some(({ authorization }) => authorization === "Bearer access-b"),
    ).toBe(false);
  });

  it("isolates refresh flights, tokens, and reset handlers between clients", async () => {
    const firstStorage = createTestStorage({
      "dadamjang.access-token": "access-a",
      "dadamjang.refresh-token": "refresh-a",
    });
    const secondStorage = createTestStorage({
      "dadamjang.access-token": "access-b",
      "dadamjang.refresh-token": "refresh-b",
    });
    const firstClient = createAuthenticatedGraphqlClient({
      storage: firstStorage.storage,
    });
    const secondClient = createAuthenticatedGraphqlClient({
      storage: secondStorage.storage,
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
    expect(firstStorage.values.get("dadamjang.access-token")).toBe("access-a2");
    expect(secondStorage.values.get("dadamjang.access-token")).toBe(
      "access-b2",
    );

    await firstClient.resetAuthSession();

    expect(firstCleanup).toHaveBeenCalledTimes(1);
    expect(secondCleanup).not.toHaveBeenCalled();
    expect(firstStorage.values.size).toBe(0);
    expect(secondStorage.values.get("dadamjang.access-token")).toBe(
      "access-b2",
    );
  });

  it("fails closed when reading SecureStore rejects", async () => {
    storage.set("dadamjang.access-token", "access-1");
    storage.set("dadamjang.refresh-token", "refresh-1");
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
    expect(storage.size).toBe(0);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("invalidates memory and completes cleanup when one SecureStore delete rejects", async () => {
    storage.set("dadamjang.access-token", "access-1");
    storage.set("dadamjang.refresh-token", "refresh-1");
    await client.getAccessToken();
    const cleanup = jest.fn();
    client.setSessionResetHandler(cleanup);
    jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async (key) => {
      if (key === "dadamjang.access-token")
        throw new Error("native delete failed");
      storage.delete(key);
    });

    await expect(client.resetAuthSession()).resolves.toBeUndefined();

    expect(await client.getAccessToken()).toBeNull();
    expect(await client.getRefreshToken()).toBeNull();
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
      "dadamjang.access-token",
    );
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
      "dadamjang.refresh-token",
    );
  });

  it("fails closed and removes partial tokens when one SecureStore set rejects", async () => {
    storage.set("dadamjang.access-token", "access-a");
    storage.set("dadamjang.refresh-token", "refresh-a");
    const cleanup = jest.fn();
    client.setSessionResetHandler(cleanup);
    jest
      .mocked(SecureStore.setItemAsync)
      .mockImplementation(async (key, value) => {
        if (key === "dadamjang.access-token")
          throw new Error("native write failed");
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
    expect(storage.size).toBe(0);
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "dadamjang.access-token",
      "access-b",
    );
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "dadamjang.refresh-token",
      "refresh-b",
    );
  });

  it("clears stale tokens when refresh fails", async () => {
    storage.set("dadamjang.access-token", "expired-access");
    storage.set("dadamjang.refresh-token", "expired-refresh");
    installTransport([
      unauthorizedResponse(),
      jsonResponse({ errors: [{ message: "Refresh expired" }] }, 401),
    ]);

    await expect(
      client.graphqlRequest("query Viewer { viewer { id } }"),
    ).rejects.toMatchObject<Partial<GraphqlError>>({ status: 401 });
    expect(storage.has("dadamjang.access-token")).toBe(false);
    expect(storage.has("dadamjang.refresh-token")).toBe(false);
  });

  it("fails closed after one retry receives HTTP 401", async () => {
    storage.set("dadamjang.access-token", "expired-access");
    storage.set("dadamjang.refresh-token", "refresh-1");
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
    expect(storage.has("dadamjang.access-token")).toBe(false);
    expect(storage.has("dadamjang.refresh-token")).toBe(false);
  });

  it("fails closed after one retry receives GraphQL UNAUTHENTICATED", async () => {
    storage.set("dadamjang.access-token", "expired-access");
    storage.set("dadamjang.refresh-token", "refresh-1");
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
    expect(storage.has("dadamjang.access-token")).toBe(false);
    expect(storage.has("dadamjang.refresh-token")).toBe(false);
  });
});

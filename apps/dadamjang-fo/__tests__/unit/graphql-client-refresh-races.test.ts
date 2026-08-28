import * as SecureStore from "expo-secure-store";

import {
  createAuthenticatedGraphqlClient,
  GraphqlError,
  type AuthenticatedGraphqlClient,
} from "@dadamjang/graphql-client";

import {
  type CapturedRequest,
  installSecureStoreMocks,
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

  it("does not reset newer credentials after a stale retry is unauthorized", async () => {
    storage.set(sessionKey, storedSession("access-0", "refresh-0"));
    const cleanup = jest.fn();
    client.setSessionResetHandler(cleanup);
    const refreshAuthorizations: (string | null)[] = [];
    const operationOneAuthorizations: (string | null)[] = [];
    const operationTwoAuthorizations: (string | null)[] = [];
    let operationOneAttempt = 0;
    let operationTwoAttempt = 0;
    let markOperationOneRetryStarted: () => void = () => undefined;
    let releaseOperationOneRetry: () => void = () => undefined;
    const operationOneRetryStarted = new Promise<void>((resolve) => {
      markOperationOneRetryStarted = resolve;
    });
    const operationOneRetryRelease = new Promise<void>((resolve) => {
      releaseOperationOneRetry = resolve;
    });

    global.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
      const authorization = new Headers(init?.headers).get("Authorization");
      const body = String(init?.body);

      if (body.includes("mutation Refresh")) {
        refreshAuthorizations.push(authorization);
        if (authorization === "Bearer refresh-0") {
          return jsonResponse({
            data: {
              refresh: { accessToken: "access-1", refreshToken: "refresh-1" },
            },
          });
        }
        if (authorization === "Bearer refresh-1") {
          return jsonResponse({
            data: {
              refresh: { accessToken: "access-2", refreshToken: "refresh-2" },
            },
          });
        }
        throw new Error(`Unexpected refresh authorization: ${authorization}`);
      }

      if (body.includes("query OperationOne")) {
        operationOneAuthorizations.push(authorization);
        operationOneAttempt += 1;
        if (operationOneAttempt === 1) return unauthorizedResponse();
        markOperationOneRetryStarted();
        await operationOneRetryRelease;
        return unauthenticatedResponse();
      }

      if (body.includes("query OperationTwo")) {
        operationTwoAuthorizations.push(authorization);
        operationTwoAttempt += 1;
        if (operationTwoAttempt === 1) return unauthorizedResponse();
        return jsonResponse({ data: { viewer: { id: "viewer-2" } } });
      }

      throw new Error(`Unexpected GraphQL operation: ${body}`);
    };

    const operationOne = client.graphqlRequest(
      "query OperationOne { viewer { id } }",
    );
    await operationOneRetryStarted;

    await expect(
      client.graphqlRequest<{ viewer: { id: string } }>(
        "query OperationTwo { viewer { id } }",
      ),
    ).resolves.toEqual({ viewer: { id: "viewer-2" } });
    releaseOperationOneRetry();

    await expect(operationOne).rejects.toMatchObject<Partial<GraphqlError>>({
      name: "GraphqlError",
      status: 401,
    });
    expect(refreshAuthorizations).toEqual([
      "Bearer refresh-0",
      "Bearer refresh-1",
    ]);
    expect(operationOneAuthorizations).toEqual([
      "Bearer access-0",
      "Bearer access-1",
    ]);
    expect(operationTwoAuthorizations).toEqual([
      "Bearer access-1",
      "Bearer access-2",
    ]);
    expect(cleanup).not.toHaveBeenCalled();
    await expect(client.getAccessToken()).resolves.toBe("access-2");
    await expect(client.getRefreshToken()).resolves.toBe("refresh-2");
    expect(storage.get(sessionKey)).toBe(
      storedSession("access-2", "refresh-2"),
    );
    expect(storage.has(invalidationKey)).toBe(false);
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
});

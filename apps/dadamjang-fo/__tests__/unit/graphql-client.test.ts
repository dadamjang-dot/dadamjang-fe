import * as SecureStore from "expo-secure-store";

import {
  GraphqlError,
  graphqlRequest,
  setAuthTokens,
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

  global.fetch = async (
    _input: RequestInfo | URL,
    init?: RequestInit,
  ) => {
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

describe("GraphQL authentication", () => {
  const storage = new Map<string, string>();

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
    jest
      .mocked(SecureStore.deleteItemAsync)
      .mockImplementation(async (key) => {
        storage.delete(key);
      });
  });

  it("persists access and refresh tokens", async () => {
    await setAuthTokens({ accessToken: "access-1", refreshToken: "refresh-1" });

    expect(storage.get("dadamjang.access-token")).toBe("access-1");
    expect(storage.get("dadamjang.refresh-token")).toBe("refresh-1");
  });

  it("does not refresh or retry BAD_USER_INPUT failures", async () => {
    storage.set("dadamjang.access-token", "access-1");
    storage.set("dadamjang.refresh-token", "refresh-1");
    const requests = installTransport([
      badUserInputResponse(),
      jsonResponse({
        data: { refresh: { accessToken: "access-2", refreshToken: "refresh-2" } },
      }),
      jsonResponse({ data: { viewer: { id: "viewer-1" } } }),
    ]);

    await expect(
      graphqlRequest("query Viewer { viewer { id } }"),
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
        data: { refresh: { accessToken: "access-2", refreshToken: "refresh-2" } },
      }),
      jsonResponse({ data: { viewer: { id: "viewer-1" } } }),
    ]);

    await expect(
      graphqlRequest<{ viewer: { id: string } }>("query Viewer { viewer { id } }"),
    ).resolves.toEqual({ viewer: { id: "viewer-1" } });
    expect(requests.map(({ authorization }) => authorization)).toEqual([
      "Bearer expired-access",
      "Bearer refresh-1",
      "Bearer access-2",
    ]);
    expect(storage.get("dadamjang.access-token")).toBe("access-2");
    expect(storage.get("dadamjang.refresh-token")).toBe("refresh-2");
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

    global.fetch = async (
      _input: RequestInfo | URL,
      init?: RequestInit,
    ) => {
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
          data: { refresh: { accessToken: "access-2", refreshToken: "refresh-2" } },
        });
      }
      return jsonResponse({ data: { viewer: { id: "viewer-1" } } });
    };

    await expect(
      Promise.all([
        graphqlRequest<{ viewer: { id: string } }>("query Viewer { viewer { id } }"),
        graphqlRequest<{ viewer: { id: string } }>("query Viewer { viewer { id } }"),
      ]),
    ).resolves.toEqual([
      { viewer: { id: "viewer-1" } },
      { viewer: { id: "viewer-1" } },
    ]);
    expect(requests.filter(({ body }) => body.includes("mutation Refresh"))).toHaveLength(1);
  });

  it("clears stale tokens when refresh fails", async () => {
    storage.set("dadamjang.access-token", "expired-access");
    storage.set("dadamjang.refresh-token", "expired-refresh");
    installTransport([
      unauthorizedResponse(),
      jsonResponse({ errors: [{ message: "Refresh expired" }] }, 401),
    ]);

    await expect(
      graphqlRequest("query Viewer { viewer { id } }"),
    ).rejects.toMatchObject<Partial<GraphqlError>>({ status: 401 });
    expect(storage.has("dadamjang.access-token")).toBe(false);
    expect(storage.has("dadamjang.refresh-token")).toBe(false);
  });

  it("surfaces GraphqlError after the single retry fails", async () => {
    storage.set("dadamjang.access-token", "expired-access");
    storage.set("dadamjang.refresh-token", "refresh-1");
    const requests = installTransport([
      unauthorizedResponse(),
      jsonResponse({
        data: { refresh: { accessToken: "access-2", refreshToken: "refresh-2" } },
      }),
      unauthorizedResponse(),
    ]);

    await expect(
      graphqlRequest("query Viewer { viewer { id } }"),
    ).rejects.toMatchObject<Partial<GraphqlError>>({
      message: "GraphQL 요청에 실패했어요.",
      name: "GraphqlError",
      status: 401,
    });
    expect(requests.map(({ authorization }) => authorization)).toEqual([
      "Bearer expired-access",
      "Bearer refresh-1",
      "Bearer access-2",
    ]);
  });
});

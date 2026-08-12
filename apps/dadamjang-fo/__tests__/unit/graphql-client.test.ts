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
  });

  it("persists access and refresh tokens", async () => {
    await setAuthTokens({ accessToken: "access-1", refreshToken: "refresh-1" });

    expect(storage.get("dadamjang.access-token")).toBe("access-1");
    expect(storage.get("dadamjang.refresh-token")).toBe("refresh-1");
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

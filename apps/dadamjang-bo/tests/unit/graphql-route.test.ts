import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleGraphQlPost } from "@/_app/api-routes/graphql";

const request = (query: string, headers: Record<string, string> = {}) =>
  new Request("http://localhost:3001/api/graphql", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ query }),
  });

const graphqlResponse = (
  body: unknown,
  cookies: string[] = [],
  status = 200,
) => {
  const headers = new Headers({ "content-type": "application/json" });
  cookies.forEach((cookie) => headers.append("set-cookie", cookie));
  return new Response(JSON.stringify(body), { status, headers });
};

describe("GraphQL BFF", () => {
  beforeEach(() => {
    process.env.DADAMJANG_API_URL = "http://backend.test/graphql";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("rejects cross-origin, non-JSON, and oversized requests before forwarding", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(
      (
        await handleGraphQlPost(
          request("{ me { userId } }", { origin: "https://evil.test" }),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await handleGraphQlPost(
          new Request("http://localhost:3001/api/graphql", {
            method: "POST",
            headers: { "content-type": "text/plain" },
            body: "{}",
          }),
        )
      ).status,
    ).toBe(415);
    expect(
      (
        await handleGraphQlPost(
          request("{ me { userId } }", { "content-length": "1048577" }),
        )
      ).status,
    ).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refreshes once, forwards refreshed cookies, and retries the original operation", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        graphqlResponse(
          {
            errors: [
              { message: "expired", extensions: { code: "UNAUTHENTICATED" } },
            ],
          },
          ["access_token=expired; Path=/; HttpOnly"],
        ),
      )
      .mockResolvedValueOnce(
        graphqlResponse({ data: { refresh: { role: "ADMIN" } } }, [
          "access_token=fresh; Path=/; HttpOnly",
          "refresh_token=rotated; Path=/; HttpOnly",
        ]),
      )
      .mockResolvedValueOnce(
        graphqlResponse({
          data: { adminDashboard: { pendingPartnerCount: 1 } },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const response = await handleGraphQlPost(
      request(
        "query AdminDashboard { adminDashboard { pendingPartnerCount } }",
        {
          cookie: "refresh_token=original; bo_device_id=device-1",
        },
      ),
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(await response.json()).toEqual({
      data: { adminDashboard: { pendingPartnerCount: 1 } },
    });
    const refreshCall = fetchMock.mock.calls[1] as [string, RequestInit];
    const retryCall = fetchMock.mock.calls[2] as [string, RequestInit];
    expect(refreshCall[1].body).toContain("mutation Refresh");
    expect(new Headers(retryCall[1].headers).get("cookie")).toContain(
      "access_token=fresh",
    );
    expect(new Headers(retryCall[1].headers).get("x-device-id")).toBe(
      "device-1",
    );
    expect(response.headers.get("set-cookie")).toContain(
      "refresh_token=rotated",
    );
  });

  it("clears session cookies when refresh fails", async () => {
    const unauthenticated = {
      errors: [{ message: "expired", extensions: { code: "UNAUTHENTICATED" } }],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(graphqlResponse(unauthenticated))
      .mockResolvedValueOnce(graphqlResponse(unauthenticated));
    vi.stubGlobal("fetch", fetchMock);

    const response = await handleGraphQlPost(
      request("query Me { me { role } }"),
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(response.headers.get("set-cookie")).toContain(
      "access_token=; Path=/; Max-Age=0",
    );
    expect(response.headers.get("set-cookie")).toContain(
      "refresh_token=; Path=/; Max-Age=0",
    );
  });

  it("does not attempt refresh for public authentication operations", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      graphqlResponse({
        errors: [
          { message: "denied", extensions: { code: "UNAUTHENTICATED" } },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await handleGraphQlPost(
      request("mutation Signin { signin(input: {}) { role } }"),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

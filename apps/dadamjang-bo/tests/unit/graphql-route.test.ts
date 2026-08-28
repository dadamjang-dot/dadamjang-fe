import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleGraphQlPost } from "@/_app/api-routes/graphql";

const DEVICE_ID = "00000000-0000-4000-8000-000000000001";

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
      .fn<typeof fetch>()
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
          cookie: `refresh_token=original; bo_device_id=${DEVICE_ID}`,
        },
      ),
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(await response.json()).toEqual({
      data: { adminDashboard: { pendingPartnerCount: 1 } },
    });
    const refreshOptions = fetchMock.mock.calls.at(1)?.[1];
    const retryOptions = fetchMock.mock.calls.at(2)?.[1];
    if (!refreshOptions || !retryOptions)
      throw new Error("Expected refresh and retry requests");
    expect(refreshOptions.body).toContain("mutation Refresh");
    expect(new Headers(retryOptions.headers).get("cookie")).toContain(
      "access_token=fresh",
    );
    expect(new Headers(retryOptions.headers).get("x-device-id")).toBe(
      DEVICE_ID,
    );
    expect(response.headers.get("set-cookie")).toContain(
      "refresh_token=rotated",
    );
  });

  it("shares one refresh across parallel requests and preserves cookie order", async () => {
    const unauthenticated = {
      errors: [{ extensions: { code: "UNAUTHENTICATED" } }],
    };
    let initialCalls = 0;
    let refreshCalls = 0;
    let releaseRefresh = () => {};
    const refreshReleased = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });
    const fetchMock = vi.fn<typeof fetch>(async (_input, options) => {
      const body = String(options?.body ?? "");
      const cookie = new Headers(options?.headers).get("cookie") ?? "";
      if (body.includes("mutation Refresh")) {
        const call = ++refreshCalls;
        if (call === 1) await refreshReleased;
        return call === 1
          ? graphqlResponse({ data: { refresh: { role: "ADMIN" } } }, [
              "access_token=fresh; Path=/; HttpOnly",
              "refresh_token=rotated; Path=/; HttpOnly",
            ])
          : graphqlResponse(unauthenticated);
      }
      if (cookie.includes("access_token=fresh"))
        return graphqlResponse({ data: { me: { role: "ADMIN" } } }, [
          "request_state=settled; Path=/",
        ]);
      initialCalls += 1;
      return graphqlResponse(unauthenticated);
    });
    vi.stubGlobal("fetch", fetchMock);
    const headers = {
      cookie: `refresh_token=original; bo_device_id=${DEVICE_ID}`,
    };

    const pending = [
      handleGraphQlPost(request("query Me { me { role } }", headers)),
      handleGraphQlPost(request("query Me { me { role } }", headers)),
    ];
    await vi.waitFor(() => expect(initialCalls).toBe(2));
    await vi.waitFor(() => expect(refreshCalls).toBeGreaterThan(0));
    releaseRefresh();
    const responses = await Promise.all(pending);

    expect(refreshCalls).toBe(1);
    for (const response of responses) {
      await expect(response.json()).resolves.toEqual({
        data: { me: { role: "ADMIN" } },
      });
      expect(response.headers.getSetCookie()).toEqual([
        "access_token=fresh; Path=/; HttpOnly",
        "refresh_token=rotated; Path=/; HttpOnly",
        "request_state=settled; Path=/",
      ]);
    }
  });

  it("ignores null error entries while detecting an unauthenticated response", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        graphqlResponse({
          errors: [
            null,
            { message: "expired", extensions: { code: "UNAUTHENTICATED" } },
          ],
        }),
      )
      .mockResolvedValueOnce(
        graphqlResponse({ data: { refresh: { role: "ADMIN" } } }),
      )
      .mockResolvedValueOnce(graphqlResponse({ data: { me: null } }));
    vi.stubGlobal("fetch", fetchMock);

    await handleGraphQlPost(request("query Me { me { role } }"));

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it.each(["%", "not-a-uuid", "00000000-0000-9000-f000-000000000001"])(
    "replaces an invalid device cookie value of %s",
    async (cookieValue) => {
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(graphqlResponse({ data: { me: null } }));
      vi.stubGlobal("fetch", fetchMock);

      const response = await handleGraphQlPost(
        request("query Me { me { role } }", {
          cookie: `bo_device_id=${cookieValue}`,
        }),
      );

      const options = fetchMock.mock.calls.at(0)?.[1];
      if (!options) throw new Error("Expected an upstream request");
      const replacement = new Headers(options.headers).get("x-device-id");
      expect(replacement).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(response.headers.getSetCookie().join("\n")).toContain(
        `bo_device_id=${replacement}`,
      );
    },
  );

  it("drops malformed cookie pairs before refresh and retry", async () => {
    const unauthenticated = {
      errors: [{ extensions: { code: "UNAUTHENTICATED" } }],
    };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        graphqlResponse(unauthenticated, [
          "broken",
          "access_token=expired; Path=/; HttpOnly",
        ]),
      )
      .mockResolvedValueOnce(
        graphqlResponse({ data: { refresh: { role: "ADMIN" } } }, [
          "also-broken",
          "access_token=fresh; Path=/; HttpOnly",
        ]),
      )
      .mockResolvedValueOnce(graphqlResponse({ data: { me: null } }));
    vi.stubGlobal("fetch", fetchMock);

    await handleGraphQlPost(
      request("query Me { me { role } }", {
        cookie: `malformed; refresh_token=original; =missing-name; bo_device_id=${DEVICE_ID}`,
      }),
    );

    const refreshOptions = fetchMock.mock.calls.at(1)?.[1];
    const retryOptions = fetchMock.mock.calls.at(2)?.[1];
    if (!refreshOptions || !retryOptions)
      throw new Error("Expected refresh and retry requests");
    const forwarded = [
      new Headers(refreshOptions.headers).get("cookie"),
      new Headers(retryOptions.headers).get("cookie"),
    ].join("; ");
    expect(forwarded).toContain("refresh_token=original");
    expect(forwarded).toContain("access_token=fresh");
    expect(forwarded).not.toMatch(/malformed|missing-name|broken/);
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
      request("query Me { me { role } }", {
        cookie: `refresh_token=invalid; bo_device_id=${DEVICE_ID}`,
      }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(response.headers.getSetCookie()).toEqual([
      "access_token=; Path=/; Max-Age=0; HttpOnly",
      "refresh_token=; Path=/; Max-Age=0; HttpOnly",
    ]);
  });

  it("preserves cookies when refresh returns a transient HTTP failure", async () => {
    const unauthenticated = {
      errors: [{ extensions: { code: "UNAUTHENTICATED" } }],
    };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(graphqlResponse(unauthenticated))
      .mockResolvedValueOnce(
        graphqlResponse(
          { errors: [{ extensions: { code: "SERVICE_UNAVAILABLE" } }] },
          [],
          503,
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const response = await handleGraphQlPost(
      request("query Me { me { role } }", {
        cookie: `refresh_token=original; bo_device_id=${DEVICE_ID}`,
      }),
    );

    expect(response.status).toBe(503);
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("preserves cookies when refresh transport fails", async () => {
    const unauthenticated = {
      errors: [{ extensions: { code: "UNAUTHENTICATED" } }],
    };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(graphqlResponse(unauthenticated))
      .mockRejectedValueOnce(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);

    const response = await handleGraphQlPost(
      request("query Me { me { role } }", {
        cookie: `refresh_token=original; bo_device_id=${DEVICE_ID}`,
      }),
    );

    expect(response.status).toBe(503);
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it.each([
    ["null", null],
    ["scalar", "ADMIN"],
    ["array", [{ role: "ADMIN" }]],
    ["missing role", {}],
    ["non-string role", { role: 1 }],
  ])("rejects %s refresh data", async (_, refreshData) => {
    const unauthenticated = {
      errors: [{ extensions: { code: "UNAUTHENTICATED" } }],
    };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(graphqlResponse(unauthenticated))
      .mockResolvedValueOnce(
        graphqlResponse({ data: { refresh: refreshData } }),
      )
      .mockResolvedValueOnce(graphqlResponse({ data: { me: null } }));
    vi.stubGlobal("fetch", fetchMock);

    await handleGraphQlPost(request("query Me { me { role } }"));

    expect(fetchMock).toHaveBeenCalledTimes(2);
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

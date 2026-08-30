import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleGraphQlPost } from "@/_app/api-routes/graphql";
import { isPublicOperation } from "@/_app/api-routes/graphql-operation";

const DEVICE_ID = "00000000-0000-4000-8000-000000000001";

const payloadRequest = (
  payload: Record<string, unknown>,
  headers: Record<string, string> = {},
  signal?: AbortSignal,
) =>
  new Request("http://localhost:3001/api/graphql", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(payload),
    signal,
  });

const request = (
  query: string,
  headers: Record<string, string> = {},
  signal?: AbortSignal,
) => payloadRequest({ query }, headers, signal);

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

  it("isolates browser auth cookies from the partner portal", async () => {
    let upstreamCookie = "";
    const fetchMock = vi.fn<typeof fetch>(async (_input, options) => {
      upstreamCookie = new Headers(options?.headers).get("cookie") ?? "";
      return graphqlResponse({ data: { me: { role: "ADMIN" } } }, [
        "access_token=new-admin; Path=/; HttpOnly",
        "refresh_token=new-admin-refresh; Path=/; HttpOnly",
      ]);
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await handleGraphQlPost(
      request("query AdminMe { me { role } }", {
        cookie:
          "bo_access_token=admin; bo_refresh_token=bo-refresh; partner_access_token=partner; partner_refresh_token=partner-refresh",
      }),
    );

    expect(upstreamCookie).toBe("access_token=admin; refresh_token=bo-refresh");
    const responseCookies = response.headers.getSetCookie();
    expect(responseCookies).toEqual(
      expect.arrayContaining([
        "bo_access_token=new-admin; Path=/; HttpOnly",
        "bo_refresh_token=new-admin-refresh; Path=/; HttpOnly",
      ]),
    );
    expect(
      responseCookies.some((cookie) => cookie.startsWith("bo_device_id=")),
    ).toBe(true);
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

  it("cancels a chunked body as soon as the streaming limit is exceeded", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const read = vi
      .fn()
      .mockResolvedValueOnce({
        done: false,
        value: new Uint8Array(600 * 1024),
      })
      .mockResolvedValueOnce({
        done: false,
        value: new Uint8Array(600 * 1024),
      });
    const cancel = vi.fn().mockResolvedValue(undefined);
    const text = vi.fn().mockResolvedValue("x".repeat(1024 * 1024 + 1));
    const chunkedRequest = {
      url: "http://localhost:3001/api/graphql",
      headers: new Headers({ "content-type": "application/json" }),
      body: { getReader: () => ({ read, cancel }) },
      text,
    } as unknown as Request;

    const response = await handleGraphQlPost(chunkedRequest);

    expect(response.status).toBe(413);
    expect(read).toHaveBeenCalledTimes(2);
    expect(cancel).toHaveBeenCalledOnce();
    expect(text).not.toHaveBeenCalled();
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
          cookie: `bo_refresh_token=original; bo_device_id=${DEVICE_ID}`,
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
      "bo_refresh_token=rotated",
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
      cookie: `bo_refresh_token=original; bo_device_id=${DEVICE_ID}`,
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
        "bo_access_token=fresh; Path=/; HttpOnly",
        "bo_refresh_token=rotated; Path=/; HttpOnly",
        "request_state=settled; Path=/",
      ]);
    }
  });

  it("keeps a shared refresh alive when its first client disconnects", async () => {
    const controller = new AbortController();
    const unauthenticated = {
      errors: [{ extensions: { code: "UNAUTHENTICATED" } }],
    };
    let initialCalls = 0;
    let refreshCalls = 0;
    let refreshSignal: AbortSignal | undefined;
    let releaseRefresh = () => {};
    const fetchMock = vi.fn<typeof fetch>(async (_input, options) => {
      if (options?.signal?.aborted) throw options.signal.reason;
      const body = String(options?.body ?? "");
      const cookie = new Headers(options?.headers).get("cookie") ?? "";
      if (body.includes("mutation Refresh")) {
        refreshCalls += 1;
        return new Promise<Response>((resolve, reject) => {
          refreshSignal = options?.signal ?? undefined;
          releaseRefresh = () =>
            resolve(
              graphqlResponse({ data: { refresh: { role: "ADMIN" } } }, [
                "access_token=fresh; Path=/; HttpOnly",
              ]),
            );
          refreshSignal?.addEventListener(
            "abort",
            () => reject(refreshSignal?.reason),
            { once: true },
          );
        });
      }
      if (cookie.includes("access_token=fresh"))
        return graphqlResponse({ data: { me: { role: "ADMIN" } } });
      initialCalls += 1;
      return graphqlResponse(unauthenticated);
    });
    vi.stubGlobal("fetch", fetchMock);
    const headers = {
      cookie: `bo_refresh_token=original; bo_device_id=${DEVICE_ID}`,
    };

    const disconnected = handleGraphQlPost(
      request("query Me { me { role } }", headers, controller.signal),
    );
    await vi.waitFor(() => expect(refreshCalls).toBe(1));
    const live = handleGraphQlPost(
      request("query Me { me { role } }", headers),
    );
    await vi.waitFor(() => expect(initialCalls).toBe(2));
    controller.abort();

    expect(refreshSignal?.aborted).toBe(false);
    releaseRefresh();
    const [disconnectedResponse, liveResponse] = await Promise.all([
      disconnected,
      live,
    ]);
    expect(disconnectedResponse.status).toBe(499);
    await expect(liveResponse.json()).resolves.toEqual({
      data: { me: { role: "ADMIN" } },
    });
    expect(refreshCalls).toBe(1);
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
        cookie: `malformed; bo_refresh_token=original; =missing-name; bo_device_id=${DEVICE_ID}`,
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
        cookie: `bo_refresh_token=invalid; bo_device_id=${DEVICE_ID}`,
      }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(response.headers.getSetCookie()).toEqual([
      "bo_access_token=; Path=/; Max-Age=0; HttpOnly",
      "bo_refresh_token=; Path=/; Max-Age=0; HttpOnly",
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
        cookie: `bo_refresh_token=original; bo_device_id=${DEVICE_ID}`,
      }),
    );

    expect(response.status).toBe(503);
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("treats a shared-backend refresh race as transient without clearing cookies", async () => {
    const unauthenticated = {
      errors: [{ extensions: { code: "UNAUTHENTICATED" } }],
    };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(graphqlResponse(unauthenticated))
      .mockResolvedValueOnce(
        graphqlResponse({ errors: [{ extensions: { code: "CONFLICT" } }] }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const response = await handleGraphQlPost(
      request("query Me { me { role } }", {
        cookie: `bo_refresh_token=original; bo_device_id=${DEVICE_ID}`,
      }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
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
        cookie: `bo_refresh_token=original; bo_device_id=${DEVICE_ID}`,
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

  it.each([
    [
      "comment",
      "query AdminDashboard { adminDashboard { pendingPartnerCount } } # signin",
    ],
    [
      "alias",
      "query AdminDashboard { signin: adminDashboard { pendingPartnerCount } }",
    ],
    [
      "string value",
      'query AuditLogs { adminAuditLogs(filter: { query: "signin" }) { totalCount } }',
    ],
  ])(
    "does not classify a protected operation by a public %s",
    async (_, query) => {
      const unauthenticated = {
        errors: [{ extensions: { code: "UNAUTHENTICATED" } }],
      };
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(graphqlResponse(unauthenticated))
        .mockResolvedValueOnce(
          graphqlResponse({ data: { refresh: { role: "ADMIN" } } }),
        )
        .mockResolvedValueOnce(graphqlResponse({ data: { ok: true } }));
      vi.stubGlobal("fetch", fetchMock);

      await handleGraphQlPost(request(query));

      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(fetchMock.mock.calls.at(1)?.[1]?.body).toContain(
        "mutation Refresh",
      );
    },
  );

  it("uses operationName and root fields instead of public text elsewhere", async () => {
    const unauthenticated = {
      errors: [{ extensions: { code: "UNAUTHENTICATED" } }],
    };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(graphqlResponse(unauthenticated))
      .mockResolvedValueOnce(
        graphqlResponse({ data: { refresh: { role: "ADMIN" } } }),
      )
      .mockResolvedValueOnce(graphqlResponse({ data: { ok: true } }));
    vi.stubGlobal("fetch", fetchMock);

    await handleGraphQlPost(
      payloadRequest({
        operationName: "Protected",
        query:
          "mutation Public { signin(input: {}) { role } } query Protected { adminDashboard { pendingPartnerCount } }",
      }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("returns 504 when the upstream deadline aborts", async () => {
    const deadline = new AbortController();
    const timeout = vi
      .spyOn(AbortSignal, "timeout")
      .mockReturnValue(deadline.signal);
    const fetchMock = vi.fn(
      (_input, options: RequestInit | undefined) =>
        new Promise((_resolve, reject) =>
          options?.signal?.addEventListener(
            "abort",
            () => reject(options.signal?.reason),
            { once: true },
          ),
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const pending = handleGraphQlPost(request("query AdminMe { me { role } }"));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(timeout).toHaveBeenCalledWith(10_000));
    deadline.abort(new DOMException("deadline", "TimeoutError"));
    const response = await pending;

    expect(response.status).toBe(504);
    await expect(response.json()).resolves.toEqual({
      error: "Upstream request timed out",
    });
  });

  it("returns 499 when the incoming request aborts", async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn(
      (_input, options: RequestInit | undefined) =>
        new Promise((_resolve, reject) =>
          options?.signal?.addEventListener(
            "abort",
            () => reject(options.signal?.reason),
            { once: true },
          ),
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const pending = handleGraphQlPost(
      request("query AdminMe { me { role } }", {}, controller.signal),
    );
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeDefined();
    controller.abort();
    const response = await pending;

    expect(response.status).toBe(499);
    await expect(response.json()).resolves.toEqual({
      error: "Client request aborted",
    });
  });

  it("returns 502 and cancels an oversized upstream response", async () => {
    const cancel = vi.fn();
    const read = vi
      .fn()
      .mockResolvedValueOnce({
        done: false,
        value: new Uint8Array(1024 * 1024),
      })
      .mockResolvedValueOnce({ done: false, value: new Uint8Array(1) });
    const text = vi.fn().mockResolvedValue("x".repeat(1024 * 1024 + 1));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        body: { getReader: () => ({ read, cancel }) },
        headers: new Headers({ "content-type": "application/json" }),
        ok: true,
        status: 200,
        text,
      } as unknown as Response),
    );

    const response = await handleGraphQlPost(
      request("query AdminMe { me { role } }"),
    );

    expect(response.status).toBe(502);
    expect(cancel).toHaveBeenCalledOnce();
    expect(text).not.toHaveBeenCalled();
  });

  it("returns 502 for a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));

    const response = await handleGraphQlPost(
      request("query AdminMe { me { role } }"),
    );

    expect(response.status).toBe(502);
  });

  it("returns 502 for malformed successful upstream JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("not-json", {
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const response = await handleGraphQlPost(
      request("query AdminMe { me { role } }"),
    );

    expect(response.status).toBe(502);
  });
});

describe("public GraphQL operation classification", () => {
  it.each([
    [
      true,
      'mutation Signin { signin(input: { password: "adminDashboard" }) { role } }',
      undefined,
    ],
    [true, "mutation Signin { login: signin(input: {}) { role } }", undefined],
    [
      true,
      "query Protected { adminDashboard { pendingPartnerCount } } mutation Signin { signin(input: {}) { role } }",
      "Signin",
    ],
    [
      true,
      "mutation Signin { ...Public } fragment Public on Mutation { signin(input: {}) { role } }",
      undefined,
    ],
    [
      false,
      "query AdminDashboard { adminDashboard { pendingPartnerCount } } # signin",
      undefined,
    ],
    [
      false,
      "query AdminDashboard { signin: adminDashboard { pendingPartnerCount } }",
      undefined,
    ],
    [
      false,
      'query AuditLogs { adminAuditLogs(filter: { query: "signin" }) { totalCount } }',
      undefined,
    ],
    [
      false,
      "mutation Signin { inviteAdmin(input: {}) { invitationId } }",
      undefined,
    ],
    [
      false,
      "mutation Signin { signin(input: {}) { role } inviteAdmin(input: {}) { invitationId } }",
      undefined,
    ],
    [
      false,
      "mutation Signin { signin(input: {}) { role } } query Protected { adminDashboard { pendingPartnerCount } }",
      "Protected",
    ],
    [
      false,
      "mutation Signin { ...Cycle } fragment Cycle on Mutation { ...Cycle }",
      undefined,
    ],
  ])(
    "returns %s for the selected operation root fields",
    (expected, query, operationName) => {
      expect(isPublicOperation({ query, operationName })).toBe(expected);
    },
  );
});

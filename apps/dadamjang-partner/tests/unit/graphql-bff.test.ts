import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleGraphQlPost } from "@/_app/api-routes/graphql";

const DEVICE_ID = "00000000-0000-4000-8000-000000000001";

const response = (body: unknown, cookies: string[] = [], status = 200) => {
  const headers = new Headers({ "content-type": "application/json" });
  cookies.forEach((cookie) => headers.append("set-cookie", cookie));
  return new Response(JSON.stringify(body), { headers, status });
};

const request = (
  cookie = `refresh_token=refresh; partner_device_id=${DEVICE_ID}`,
  signal?: AbortSignal,
) =>
  new Request("http://partner.test/api/graphql", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie,
      origin: "http://partner.test",
    },
    body: JSON.stringify({ query: "query PartnerMe { me { role } }" }),
    signal,
  });

describe("partner GraphQL BFF refresh", () => {
  beforeEach(() => {
    vi.stubEnv("DADAMJANG_API_URL", "http://api.test/graphql");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("refreshes once and retries the original operation with rotated cookies", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        response({ errors: [{ extensions: { code: "UNAUTHENTICATED" } }] }),
      )
      .mockResolvedValueOnce(
        response({ data: { refresh: { role: "PARTNER" } } }, [
          "access_token=new-access; Path=/; HttpOnly",
          "refresh_token=new-refresh; Path=/; HttpOnly",
        ]),
      )
      .mockResolvedValueOnce(response({ data: { me: { role: "PARTNER" } } }));

    const result = await handleGraphQlPost(request());

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1]?.[1]?.body).toContain("mutation Refresh");
    expect(fetchMock.mock.calls[2]?.[1]?.headers).toMatchObject({
      cookie: `refresh_token=new-refresh; partner_device_id=${DEVICE_ID}; access_token=new-access`,
      "x-device-id": DEVICE_ID,
    });
    await expect(result.json()).resolves.toEqual({
      data: { me: { role: "PARTNER" } },
    });
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
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (_input, options) => {
        const body = String(options?.body ?? "");
        const cookie = new Headers(options?.headers).get("cookie") ?? "";
        if (body.includes("mutation Refresh")) {
          const call = ++refreshCalls;
          if (call === 1) await refreshReleased;
          return call === 1
            ? response({ data: { refresh: { role: "PARTNER" } } }, [
                "access_token=fresh; Path=/; HttpOnly",
                "refresh_token=rotated; Path=/; HttpOnly",
              ])
            : response(unauthenticated);
        }
        if (cookie.includes("access_token=fresh"))
          return response({ data: { me: { role: "PARTNER" } } }, [
            "request_state=settled; Path=/",
          ]);
        initialCalls += 1;
        return response(unauthenticated);
      });

    const pending = [
      handleGraphQlPost(request()),
      handleGraphQlPost(request()),
    ];
    await vi.waitFor(() => expect(initialCalls).toBe(2));
    await vi.waitFor(() => expect(refreshCalls).toBeGreaterThan(0));
    releaseRefresh();
    const results = await Promise.all(pending);

    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(refreshCalls).toBe(1);
    for (const result of results) {
      await expect(result.json()).resolves.toEqual({
        data: { me: { role: "PARTNER" } },
      });
      expect(result.headers.getSetCookie()).toEqual([
        "access_token=fresh; Path=/; HttpOnly",
        "refresh_token=rotated; Path=/; HttpOnly",
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
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async (_input, options) => {
        if (options?.signal?.aborted) throw options.signal.reason;
        const body = String(options?.body ?? "");
        const cookie = new Headers(options?.headers).get("cookie") ?? "";
        if (body.includes("mutation Refresh")) {
          refreshCalls += 1;
          return new Promise<Response>((resolve, reject) => {
            refreshSignal = options?.signal ?? undefined;
            releaseRefresh = () =>
              resolve(
                response({ data: { refresh: { role: "PARTNER" } } }, [
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
          return response({ data: { me: { role: "PARTNER" } } });
        initialCalls += 1;
        return response(unauthenticated);
      },
    );

    const disconnected = handleGraphQlPost(
      request(undefined, controller.signal),
    );
    await vi.waitFor(() => expect(refreshCalls).toBe(1));
    const live = handleGraphQlPost(request());
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
      data: { me: { role: "PARTNER" } },
    });
    expect(refreshCalls).toBe(1);
  });

  it("ignores null error entries while detecting an unauthenticated response", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        response({
          errors: [null, { extensions: { code: "UNAUTHENTICATED" } }],
        }),
      )
      .mockResolvedValueOnce(
        response({ data: { refresh: { role: "PARTNER" } } }),
      )
      .mockResolvedValueOnce(response({ data: { me: null } }));

    await handleGraphQlPost(request());

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it.each(["%", "not-a-uuid", "00000000-0000-9000-f000-000000000001"])(
    "replaces an invalid device cookie value of %s",
    async (cookieValue) => {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(response({ data: { me: null } }));

      const result = await handleGraphQlPost(
        request(`partner_device_id=${cookieValue}`),
      );

      const options = fetchMock.mock.calls.at(0)?.[1];
      if (!options) throw new Error("Expected an upstream request");
      const replacement = new Headers(options.headers).get("x-device-id");
      expect(replacement).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(result.headers.getSetCookie().join("\n")).toContain(
        `partner_device_id=${replacement}`,
      );
    },
  );

  it("drops malformed cookie pairs before refresh and retry", async () => {
    const unauthenticated = {
      errors: [{ extensions: { code: "UNAUTHENTICATED" } }],
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        response(unauthenticated, [
          "broken",
          "access_token=expired; Path=/; HttpOnly",
        ]),
      )
      .mockResolvedValueOnce(
        response({ data: { refresh: { role: "PARTNER" } } }, [
          "also-broken",
          "access_token=fresh; Path=/; HttpOnly",
        ]),
      )
      .mockResolvedValueOnce(response({ data: { me: null } }));

    await handleGraphQlPost(
      request(
        `malformed; refresh_token=refresh; =missing-name; partner_device_id=${DEVICE_ID}`,
      ),
    );

    const refreshOptions = fetchMock.mock.calls.at(1)?.[1];
    const retryOptions = fetchMock.mock.calls.at(2)?.[1];
    if (!refreshOptions || !retryOptions)
      throw new Error("Expected refresh and retry requests");
    const forwarded = [
      new Headers(refreshOptions.headers).get("cookie"),
      new Headers(retryOptions.headers).get("cookie"),
    ].join("; ");
    expect(forwarded).toContain("refresh_token=refresh");
    expect(forwarded).toContain("access_token=fresh");
    expect(forwarded).not.toMatch(/malformed|missing-name|broken/);
  });

  it("clears auth cookies when refresh fails", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        response({ errors: [{ extensions: { code: "UNAUTHENTICATED" } }] }),
      )
      .mockResolvedValueOnce(
        response({ errors: [{ extensions: { code: "UNAUTHENTICATED" } }] }),
      );

    const result = await handleGraphQlPost(request());
    expect(result.headers.getSetCookie()).toEqual([
      "access_token=; Path=/; Max-Age=0; HttpOnly",
      "refresh_token=; Path=/; Max-Age=0; HttpOnly",
    ]);
  });

  it("preserves cookies when refresh returns a transient HTTP failure", async () => {
    const unauthenticated = {
      errors: [{ extensions: { code: "UNAUTHENTICATED" } }],
    };
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(unauthenticated))
      .mockResolvedValueOnce(
        response(
          { errors: [{ extensions: { code: "SERVICE_UNAVAILABLE" } }] },
          [],
          503,
        ),
      );

    const result = await handleGraphQlPost(request());

    expect(result.status).toBe(503);
    expect(result.headers.getSetCookie()).toEqual([]);
  });

  it("preserves cookies when refresh transport fails", async () => {
    const unauthenticated = {
      errors: [{ extensions: { code: "UNAUTHENTICATED" } }],
    };
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(unauthenticated))
      .mockRejectedValueOnce(new TypeError("fetch failed"));

    const result = await handleGraphQlPost(request());

    expect(result.status).toBe(503);
    expect(result.headers.getSetCookie()).toEqual([]);
  });

  it.each([
    ["null", null],
    ["scalar", "PARTNER"],
    ["array", [{ role: "PARTNER" }]],
    ["missing role", {}],
    ["non-string role", { role: 1 }],
  ])("rejects %s refresh data", async (_, refreshData) => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        response({ errors: [{ extensions: { code: "UNAUTHENTICATED" } }] }),
      )
      .mockResolvedValueOnce(response({ data: { refresh: refreshData } }))
      .mockResolvedValueOnce(response({ data: { me: null } }));

    await handleGraphQlPost(request());

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not recursively refresh public authentication operations", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        response({ errors: [{ extensions: { code: "UNAUTHENTICATED" } }] }),
      );
    const signin = new Request("http://partner.test/api/graphql", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query:
          'mutation Signin { signin(userid: "p", password: "x") { role } }',
      }),
    });

    await handleGraphQlPost(signin);

    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("does not treat a protected alias containing signin as public", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        response({ errors: [{ extensions: { code: "UNAUTHENTICATED" } }] }),
      )
      .mockResolvedValueOnce(
        response({ data: { refresh: { role: "PARTNER" } } }),
      )
      .mockResolvedValueOnce(
        response({ data: { signin: { role: "PARTNER" } } }),
      );
    const aliased = new Request("http://partner.test/api/graphql", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: "query PartnerMe { signin: me { role } }",
      }),
    });

    await handleGraphQlPost(aliased);

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not trust a public operation name with a protected root field", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        response({ errors: [{ extensions: { code: "UNAUTHENTICATED" } }] }),
      )
      .mockResolvedValueOnce(
        response({ data: { refresh: { role: "PARTNER" } } }),
      )
      .mockResolvedValueOnce(
        response({ data: { publishPartnerProduct: null } }),
      );
    const forged = new Request("http://partner.test/api/graphql", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query:
          'mutation Signin { publishPartnerProduct(productId: "product-1") { productId } }',
      }),
    });

    await handleGraphQlPost(forged);

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("uses operationName to select the actual public operation", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        response({ errors: [{ extensions: { code: "UNAUTHENTICATED" } }] }),
      );
    const selected = new Request("http://partner.test/api/graphql", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        operationName: "Signin",
        query:
          'mutation Protected { publishPartnerProduct(productId: "product-1") { productId } } mutation Signin { signin(userid: "p", password: "x") { role } }',
      }),
    });

    await handleGraphQlPost(selected);

    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("refreshes the selected protected operation after a public definition", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        response({ errors: [{ extensions: { code: "UNAUTHENTICATED" } }] }),
      )
      .mockResolvedValueOnce(
        response({ data: { refresh: { role: "PARTNER" } } }),
      )
      .mockResolvedValueOnce(
        response({ data: { publishPartnerProduct: null } }),
      );
    const selected = new Request("http://partner.test/api/graphql", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        operationName: "Protected",
        query:
          'mutation Signin { signin(userid: "p", password: "x") { role } } mutation Protected { publishPartnerProduct(productId: "product-1") { productId } }',
      }),
    });

    await handleGraphQlPost(selected);

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it.each([
    [
      "fragment spread",
      'mutation Signin { signin(userid: "p", password: "x") { role } ...Protected } fragment Protected on Mutation { publishPartnerProduct(productId: "product-1") { productId } }',
    ],
    [
      "inline fragment",
      'mutation Signin { signin(userid: "p", password: "x") { role } ... on Mutation { publishPartnerProduct(productId: "product-1") { productId } } }',
    ],
  ])(
    "refreshes when a %s contains a protected root field",
    async (_, query) => {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          response({ errors: [{ extensions: { code: "UNAUTHENTICATED" } }] }),
        )
        .mockResolvedValueOnce(
          response({ data: { refresh: { role: "PARTNER" } } }),
        )
        .mockResolvedValueOnce(
          response({ data: { publishPartnerProduct: null } }),
        );
      const selected = new Request("http://partner.test/api/graphql", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query }),
      });

      await handleGraphQlPost(selected);

      expect(fetchMock).toHaveBeenCalledTimes(3);
    },
  );

  it("recognizes a public root field expressed through a fragment", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        response({ errors: [{ extensions: { code: "UNAUTHENTICATED" } }] }),
      );
    const selected = new Request("http://partner.test/api/graphql", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query:
          'mutation Signin { ...Public } fragment Public on Mutation { signin(userid: "p", password: "x") { role } }',
      }),
    });

    await handleGraphQlPost(selected);

    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("memoizes repeated acyclic public fragments", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        response({ errors: [{ extensions: { code: "UNAUTHENTICATED" } }] }),
      );
    const fragments = [
      'fragment Public0 on Mutation { signin(userid: "p", password: "x") { role } }',
      ...Array.from(
        { length: 22 },
        (_, index) =>
          `fragment Public${index + 1} on Mutation { ...Public${index} ...Public${index} }`,
      ),
    ].join(" ");
    const selected = new Request("http://partner.test/api/graphql", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: `mutation Signin { ...Public22 } ${fragments}`,
      }),
    });

    await handleGraphQlPost(selected);

    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("fails closed when fragment nesting exceeds the traversal limit", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        response({ errors: [{ extensions: { code: "UNAUTHENTICATED" } }] }),
      )
      .mockResolvedValueOnce(
        response({ data: { refresh: { role: "PARTNER" } } }),
      )
      .mockResolvedValueOnce(response({ data: { signin: null } }));
    const fragments = Array.from({ length: 80 }, (_, index) =>
      index === 79
        ? 'fragment Deep79 on Mutation { signin(userid: "p", password: "x") { role } }'
        : `fragment Deep${index} on Mutation { ...Deep${index + 1} }`,
    ).join(" ");
    const selected = new Request("http://partner.test/api/graphql", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: `mutation Signin { ...Deep0 } ${fragments}`,
      }),
    });

    await handleGraphQlPost(selected);

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("rejects an oversized body without forwarding it", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const oversized = new Request("http://partner.test/api/graphql", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "x".repeat(1024 * 1024 + 1),
    });

    const result = await handleGraphQlPost(oversized);

    expect(result.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 504 when the upstream deadline aborts", async () => {
    const deadline = new AbortController();
    const timeout = vi
      .spyOn(AbortSignal, "timeout")
      .mockReturnValue(deadline.signal);
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(
        (_input, options) =>
          new Promise((_resolve, reject) =>
            options?.signal?.addEventListener(
              "abort",
              () => reject(options.signal?.reason),
              { once: true },
            ),
          ),
      );

    const pending = handleGraphQlPost(request());
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(timeout).toHaveBeenCalledWith(10_000));
    deadline.abort(new DOMException("deadline", "TimeoutError"));
    const result = await pending;

    expect(result.status).toBe(504);
    await expect(result.json()).resolves.toEqual({
      error: "Upstream request timed out",
    });
  });

  it("returns 499 when the incoming request aborts", async () => {
    const controller = new AbortController();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(
        (_input, options) =>
          new Promise((_resolve, reject) =>
            options?.signal?.addEventListener(
              "abort",
              () => reject(options.signal?.reason),
              { once: true },
            ),
          ),
      );

    const pending = handleGraphQlPost(request(undefined, controller.signal));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeDefined();
    controller.abort();
    const result = await pending;

    expect(result.status).toBe(499);
    await expect(result.json()).resolves.toEqual({
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
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      body: { getReader: () => ({ read, cancel }) },
      headers: new Headers({ "content-type": "application/json" }),
      ok: true,
      status: 200,
      text,
    } as unknown as Response);

    const result = await handleGraphQlPost(request());

    expect(result.status).toBe(502);
    expect(cancel).toHaveBeenCalledOnce();
    expect(text).not.toHaveBeenCalled();
  });

  it("returns 502 for a network failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("offline"));

    const result = await handleGraphQlPost(request());

    expect(result.status).toBe(502);
  });

  it("returns 502 for malformed successful upstream JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("not-json", {
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await handleGraphQlPost(request());

    expect(result.status).toBe(502);
  });
});

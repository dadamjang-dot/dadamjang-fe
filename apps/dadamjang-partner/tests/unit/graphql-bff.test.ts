import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleGraphQlPost } from "@/_app/api-routes/graphql";

const response = (body: unknown, cookies: string[] = []) => {
  const headers = new Headers({ "content-type": "application/json" });
  cookies.forEach((cookie) => headers.append("set-cookie", cookie));
  return new Response(JSON.stringify(body), { headers });
};

const request = (
  cookie = "refresh_token=refresh; partner_device_id=device-1",
) =>
  new Request("http://partner.test/api/graphql", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie,
      origin: "http://partner.test",
    },
    body: JSON.stringify({ query: "query PartnerMe { me { role } }" }),
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
      cookie:
        "refresh_token=new-refresh; partner_device_id=device-1; access_token=new-access",
      "x-device-id": "device-1",
    });
    await expect(result.json()).resolves.toEqual({
      data: { me: { role: "PARTNER" } },
    });
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
        "malformed; refresh_token=refresh; =missing-name; partner_device_id=device-1",
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
    const cookies = result.headers.getSetCookie().join("\n");

    expect(cookies).toContain("access_token=");
    expect(cookies).toContain("refresh_token=");
    expect(cookies).toContain("Max-Age=0");
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
});

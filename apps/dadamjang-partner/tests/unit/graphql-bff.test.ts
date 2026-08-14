import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleGraphQlPost } from "@/_app/api-routes/graphql";

const response = (body: unknown, cookies: string[] = []) => {
  const headers = new Headers({ "content-type": "application/json" });
  cookies.forEach((cookie) => headers.append("set-cookie", cookie));
  return new Response(JSON.stringify(body), { headers });
};

const request = () =>
  new Request("http://partner.test/api/graphql", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: "refresh_token=refresh; partner_device_id=device-1",
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

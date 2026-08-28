import { ClientError } from "graphql-request";
import { GraphQLError } from "graphql";
import { afterEach, describe, expect, it, vi } from "vitest";
import { requestGraphQl } from "@/shared/api";
import {
  SESSION_INVALIDATION_STORAGE_KEY,
  subscribeToSessionInvalidation,
} from "@/shared/auth";

const graphQl = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock("graphql-request", async (importOriginal) => {
  const actual = await importOriginal<typeof import("graphql-request")>();
  return {
    ...actual,
    GraphQLClient: class {
      request = graphQl.request;
    },
  };
});

describe("partner GraphQL client session invalidation", () => {
  afterEach(() => {
    graphQl.request.mockReset();
    vi.restoreAllMocks();
  });

  it("broadcasts an unauthenticated response to other tabs", async () => {
    const listener = vi.fn();
    const storage = vi.spyOn(Storage.prototype, "setItem");
    const unsubscribe = subscribeToSessionInvalidation(listener);
    graphQl.request.mockRejectedValue(
      new ClientError(
        {
          status: 200,
          headers: new Headers(),
          body: JSON.stringify({
            errors: [{ message: "Authentication required" }],
          }),
          errors: [
            new GraphQLError("Authentication required", {
              extensions: { code: "UNAUTHENTICATED" },
            }),
          ],
        },
        { query: "query PartnerMe { me { role } }", variables: {} },
      ),
    );

    await expect(
      requestGraphQl("query PartnerMe { me { role } }"),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });

    expect(listener).toHaveBeenCalledOnce();
    expect(storage).toHaveBeenCalledWith(
      SESSION_INVALIDATION_STORAGE_KEY,
      expect.any(String),
    );
    unsubscribe();
  });
});

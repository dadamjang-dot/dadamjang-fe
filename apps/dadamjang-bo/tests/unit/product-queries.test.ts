import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { productQueries } from "@/_pages/products/api/product-queries";

const { requestGraphQl } = vi.hoisted(() => ({
  requestGraphQl: vi.fn(),
}));

vi.mock("@/shared/api", () => ({ requestGraphQl }));

const connection = (
  nodes: Array<{ partnerId: string }>,
  nextCursor: string | null,
) => ({
  nodes,
  nextCursor,
  hasNextPage: nextCursor !== null,
  totalCount: 101,
});

describe("product filter options", () => {
  beforeEach(() => requestGraphQl.mockReset());

  it("loads every partner page instead of truncating after 100", async () => {
    requestGraphQl
      .mockResolvedValueOnce({
        adminCategories: [{ categoryId: "category-1", name: "상의" }],
        adminPartners: connection(
          Array.from({ length: 100 }, (_, index) => ({
            partnerId: `partner-${index + 1}`,
          })),
          "partner-100",
        ),
      })
      .mockResolvedValueOnce({
        adminPartners: connection([{ partnerId: "partner-101" }], null),
      });
    const client = new QueryClient();

    const result = await client.fetchQuery(productQueries.filterOptions());

    expect(result.partners).toHaveLength(101);
    expect(result.partners.at(-1)?.partnerId).toBe("partner-101");
    expect(requestGraphQl).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("query AdminProductFilterPartners"),
      { filter: { after: "partner-100", first: 100 } },
    );
  });
});

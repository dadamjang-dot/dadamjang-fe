import { describe, expect, it } from "vitest";
import type { AdminCategory } from "@/shared/api";
import { flattenCategoryTree } from "@/_pages/categories/model/category-tree";

const category = (
  categoryId: string,
  parentId: string | null,
  sortOrder: number,
): AdminCategory => ({
  categoryId,
  parentId,
  sortOrder,
  name: categoryId,
  slug: categoryId,
  isActive: true,
  createdAt: "2026-08-13T00:00:00.000Z",
  updatedAt: "2026-08-13T00:00:00.000Z",
});

describe("category tree", () => {
  it("sorts siblings and flattens descendants with depth", () => {
    const rows = flattenCategoryTree([
      category("child", "root", 0),
      category("second", null, 2),
      category("root", null, 1),
    ]);
    expect(
      rows.map(({ categoryId, depth }) => ({ categoryId, depth })),
    ).toEqual([
      { categoryId: "root", depth: 0 },
      { categoryId: "child", depth: 1 },
      { categoryId: "second", depth: 0 },
    ]);
  });

  it("does not recurse forever on malformed cyclic data", () => {
    expect(
      flattenCategoryTree([
        category("one", "two", 0),
        category("two", "one", 0),
      ]),
    ).toHaveLength(2);
  });
});

import { queryOptions } from "@tanstack/react-query";
import { requestGraphQl, type AdminCategory } from "@/shared/api";

const CATEGORIES_QUERY = `
  query AdminCategories {
    adminCategories { categoryId name slug parentId sortOrder isActive createdAt updatedAt }
  }
`;

export const categoryQueries = {
  all: () => ["admin-categories"] as const,
  list: () =>
    queryOptions({
      queryKey: categoryQueries.all(),
      queryFn: async () =>
        (
          await requestGraphQl<{ adminCategories: AdminCategory[] }>(
            CATEGORIES_QUERY,
          )
        ).adminCategories,
    }),
};

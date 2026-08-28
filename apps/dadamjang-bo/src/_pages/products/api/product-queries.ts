import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import {
  requestGraphQl,
  type AdminCategory,
  type AdminPartner,
  type AdminProduct,
  type AdminProductDetail,
  type Connection,
} from "@/shared/api";

export type ProductFilter = {
  query?: string;
  approvalStatus?: string;
  partnerId?: string;
  categoryId?: string;
  createdFrom?: string;
  createdTo?: string;
};

const PRODUCTS_QUERY = `
  query AdminProducts($filter: AdminProductFilterInput) {
    adminProducts(filter: $filter) {
      nodes {
        productId partnerId partnerName categoryId categoryName title status approvalStatus
        rejectionReason thumbnailUrl createdAt
      }
      nextCursor hasNextPage totalCount
    }
  }
`;

const PRODUCT_QUERY = `
  query AdminProduct($productId: String!) {
    adminProduct(productId: $productId) {
      productId partnerId partnerName categoryId categoryName title description imageUrls status approvalStatus
      rejectionReason thumbnailUrl createdAt
      skus { skuId code optionName price stock isActive }
      auditLogs { auditLogId actorUserid action entityType entityId metadataJson createdAt }
    }
  }
`;

const FILTER_OPTIONS_QUERY = `
  query AdminProductFilterOptions {
    adminCategories { categoryId name slug parentId sortOrder isActive createdAt updatedAt }
    adminPartners(filter: { first: 100 }) {
      nodes { partnerId ownerUserId ownerUserid ownerEmail businessEmail businessRegistrationNumber tradeName status rejectionReason reviewedAt createdAt }
      nextCursor hasNextPage totalCount
    }
  }
`;

const FILTER_PARTNERS_QUERY = `
  query AdminProductFilterPartners($filter: AdminPartnerFilterInput) {
    adminPartners(filter: $filter) {
      nodes { partnerId ownerUserId ownerUserid ownerEmail businessEmail businessRegistrationNumber tradeName status rejectionReason reviewedAt createdAt }
      nextCursor hasNextPage totalCount
    }
  }
`;

export const productQueries = {
  all: () => ["admin-products"] as const,
  lists: () => [...productQueries.all(), "list"] as const,
  list: (filter: ProductFilter) =>
    infiniteQueryOptions({
      queryKey: [...productQueries.lists(), filter],
      queryFn: async ({ pageParam }) =>
        (
          await requestGraphQl<
            { adminProducts: Connection<AdminProduct> },
            { filter: ProductFilter & { after: string | null; first: number } }
          >(PRODUCTS_QUERY, {
            filter: { ...filter, after: pageParam, first: 30 },
          })
        ).adminProducts,
      initialPageParam: null as string | null,
      getNextPageParam: (lastPage) =>
        lastPage.hasNextPage ? lastPage.nextCursor : undefined,
    }),
  detail: (productId: string) =>
    queryOptions({
      queryKey: [...productQueries.all(), "detail", productId],
      queryFn: async () =>
        (
          await requestGraphQl<
            { adminProduct: AdminProductDetail },
            { productId: string }
          >(PRODUCT_QUERY, { productId })
        ).adminProduct,
    }),
  filterOptions: () =>
    queryOptions({
      queryKey: [...productQueries.all(), "filter-options"],
      staleTime: 5 * 60_000,
      queryFn: async () => {
        const data = await requestGraphQl<{
          adminCategories: AdminCategory[];
          adminPartners: Connection<AdminPartner>;
        }>(FILTER_OPTIONS_QUERY);
        const partners = [...data.adminPartners.nodes];
        let page = data.adminPartners;
        while (page.hasNextPage && page.nextCursor) {
          page = (
            await requestGraphQl<
              { adminPartners: Connection<AdminPartner> },
              { filter: { after: string; first: number } }
            >(FILTER_PARTNERS_QUERY, {
              filter: { after: page.nextCursor, first: 100 },
            })
          ).adminPartners;
          partners.push(...page.nodes);
        }
        return {
          categories: data.adminCategories,
          partners,
        };
      },
    }),
};

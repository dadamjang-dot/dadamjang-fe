import { useRouter } from "expo-router";

import { useShopFilters, type ProductSort } from "@/features/catalog";
import { ProductSortSheet } from "@/features/shop";

const ShopSortSheetRoute = () => {
  const router = useRouter();
  const { filters, updateFilters } = useShopFilters();

  const handleSelectSort = (sort: ProductSort) => {
    updateFilters({ sort });
    router.back();
  };

  return (
    <ProductSortSheet selectedSort={filters.sort} onSelect={handleSelectSort} />
  );
};

export default ShopSortSheetRoute;

import { createContext, use, useState, type ReactNode } from "react";

import type { ProductFilter, ProductSort } from "./types";

export type ShopFilterMode =
  "category" | "brand" | "color" | "size" | "price" | "sort";
export type ShopCategorySource = "navigation" | "filter";

export type ShopFilters = {
  categoryId?: string;
  categoryIds: string[];
  categorySource?: ShopCategorySource;
  brandIds: string[];
  colorIds: string[];
  sizeIds: string[];
  saleOnly: boolean;
  expressOnly: boolean;
  minPrice?: number;
  maxPrice?: number;
  sort: ProductSort;
};

type ShopFiltersContextValue = {
  filters: ShopFilters;
  draftFilters: ShopFilters;
  updateFilters: (updates: Partial<ShopFilters>) => void;
  startDraft: () => void;
  updateDraft: (updates: Partial<ShopFilters>) => void;
  applyDraft: () => void;
  cancelDraft: () => void;
};

export const defaultShopFilters: ShopFilters = {
  categoryIds: [],
  brandIds: [],
  colorIds: [],
  sizeIds: [],
  saleOnly: false,
  expressOnly: false,
  sort: "RECOMMENDED",
};

export const normalizeShopFilters = (filters: ShopFilters): ShopFilters => ({
  ...filters,
  categoryIds: [...(filters.categoryIds ?? [])].sort(),
  brandIds: [...filters.brandIds].sort(),
  colorIds: [...filters.colorIds].sort(),
  sizeIds: [...filters.sizeIds].sort(),
});

export const toProductFilter = (filters: ShopFilters): ProductFilter => {
  const categoryIds = filters.categoryIds ?? [];

  return {
    categoryId: categoryIds.length === 0 ? filters.categoryId : undefined,
    categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
    brandIds: filters.brandIds.length > 0 ? filters.brandIds : undefined,
    colorIds: filters.colorIds.length > 0 ? filters.colorIds : undefined,
    sizeIds: filters.sizeIds.length > 0 ? filters.sizeIds : undefined,
    saleOnly: filters.saleOnly || undefined,
    expressOnly: filters.expressOnly || undefined,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    sort: filters.sort,
  };
};

const ShopFiltersContext = createContext<ShopFiltersContextValue | undefined>(
  undefined,
);

export const ShopFiltersProvider = ({ children }: { children: ReactNode }) => {
  const [filters, setFilters] = useState<ShopFilters>(defaultShopFilters);
  const [draftFilters, setDraftFilters] =
    useState<ShopFilters>(defaultShopFilters);

  const updateFilters = (updates: Partial<ShopFilters>) => {
    setFilters((current) => normalizeShopFilters({ ...current, ...updates }));
  };

  const startDraft = () => {
    setDraftFilters(filters);
  };

  const updateDraft = (updates: Partial<ShopFilters>) => {
    setDraftFilters((current) =>
      normalizeShopFilters({ ...current, ...updates }),
    );
  };

  const applyDraft = () => {
    const nextFilters = normalizeShopFilters(draftFilters);
    setFilters(nextFilters);
    setDraftFilters(nextFilters);
  };

  const cancelDraft = () => {
    setDraftFilters(filters);
  };

  const value = {
    filters,
    draftFilters,
    updateFilters,
    startDraft,
    updateDraft,
    applyDraft,
    cancelDraft,
  };

  return (
    <ShopFiltersContext.Provider value={value}>
      {children}
    </ShopFiltersContext.Provider>
  );
};

export const useShopFilters = () => {
  const value = use(ShopFiltersContext);
  if (!value) throw new Error("ShopFiltersProvider is required");
  return value;
};

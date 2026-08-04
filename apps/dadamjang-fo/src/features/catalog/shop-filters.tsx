import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react';

import type { ProductFilter, ProductSort } from './types';

export type ShopFilterMode = 'category' | 'brand' | 'color' | 'size' | 'price' | 'sort';
export type ShopCategorySource = 'navigation' | 'filter';

export type ShopFilters = {
  categoryId?: string;
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
  brandIds: [],
  colorIds: [],
  sizeIds: [],
  saleOnly: false,
  expressOnly: false,
  sort: 'RECOMMENDED',
};

export const normalizeShopFilters = (filters: ShopFilters): ShopFilters => ({
  ...filters,
  brandIds: [...filters.brandIds].sort(),
  colorIds: [...filters.colorIds].sort(),
  sizeIds: [...filters.sizeIds].sort(),
});

export const toProductFilter = (filters: ShopFilters): ProductFilter => ({
  categoryId: filters.categoryId,
  brandIds: filters.brandIds.length > 0 ? filters.brandIds : undefined,
  colorIds: filters.colorIds.length > 0 ? filters.colorIds : undefined,
  sizeIds: filters.sizeIds.length > 0 ? filters.sizeIds : undefined,
  saleOnly: filters.saleOnly || undefined,
  expressOnly: filters.expressOnly || undefined,
  minPrice: filters.minPrice,
  maxPrice: filters.maxPrice,
  sort: filters.sort,
});

const ShopFiltersContext = createContext<ShopFiltersContextValue | undefined>(undefined);

export const ShopFiltersProvider = ({ children }: { children: ReactNode }) => {
  const [filters, setFilters] = useState<ShopFilters>(defaultShopFilters);
  const [draftFilters, setDraftFilters] = useState<ShopFilters>(defaultShopFilters);

  const updateFilters = useCallback((updates: Partial<ShopFilters>) => {
    setFilters((current) => normalizeShopFilters({ ...current, ...updates }));
  }, []);

  const startDraft = useCallback(() => {
    setDraftFilters(filters);
  }, [filters]);

  const updateDraft = useCallback((updates: Partial<ShopFilters>) => {
    setDraftFilters((current) => normalizeShopFilters({ ...current, ...updates }));
  }, []);

  const applyDraft = useCallback(() => {
    const nextFilters = normalizeShopFilters(draftFilters);
    setFilters(nextFilters);
    setDraftFilters(nextFilters);
  }, [draftFilters]);

  const cancelDraft = useCallback(() => {
    setDraftFilters(filters);
  }, [filters]);

  const value = useMemo(
    () => ({
      filters,
      draftFilters,
      updateFilters,
      startDraft,
      updateDraft,
      applyDraft,
      cancelDraft,
    }),
    [
      applyDraft,
      cancelDraft,
      draftFilters,
      filters,
      startDraft,
      updateDraft,
      updateFilters,
    ],
  );

  return <ShopFiltersContext.Provider value={value}>{children}</ShopFiltersContext.Provider>;
};

export const useShopFilters = () => {
  const value = use(ShopFiltersContext);
  if (!value) throw new Error('ShopFiltersProvider is required');
  return value;
};

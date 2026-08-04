export type ProductSku = {
  skuId: string;
  code: string;
  colorId: string | null;
  sizeId: string | null;
  optionName: string;
  price: number;
  stock: number;
};

export type Product = {
  productId: string;
  partnerId: string;
  brandId: string | null;
  categoryId: string;
  title: string;
  description: string;
  imageUrls: string[];
  status: string;
  isOnSale: boolean;
  isExpressDelivery: boolean;
  skus: ProductSku[];
  createdAt: string;
};

export type ProductConnection = {
  nodes: Product[];
  totalCount: number;
  nextCursor: string | null;
  hasNextPage: boolean;
};

export type PersonalizedFeedConnection = Omit<ProductConnection, 'totalCount'> & {
  totalCount?: number;
};

export type Category = {
  categoryId: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
};

export type ProductSort = 'RECOMMENDED' | 'LATEST' | 'LOW_PRICE' | 'HIGH_PRICE' | 'POPULAR';

export type ProductFilter = {
  categoryId?: string;
  query?: string;
  brandIds?: string[];
  colorIds?: string[];
  sizeIds?: string[];
  saleOnly?: boolean;
  expressOnly?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sort?: ProductSort;
  after?: string;
  first?: number;
};

export type CatalogFilterOption = {
  id: string;
  name: string;
};

export type CatalogBrandOption = {
  brandId: string;
  name: string;
  slug: string;
};

export type CatalogColorOption = {
  colorId: string;
  name: string;
  slug: string;
  hexCode: string | null;
};

export type CatalogSizeOption = {
  sizeId: string;
  name: string;
  slug: string;
  sortOrder: number;
};

export type CatalogFilterOptions = {
  categories: Category[];
  brands: CatalogBrandOption[];
  colors: CatalogColorOption[];
  sizes: CatalogSizeOption[];
};

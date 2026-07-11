export type ProductSku = {
  skuId: string;
  code: string;
  optionName: string;
  price: number;
  stock: number;
};

export type Product = {
  productId: string;
  partnerId: string;
  categoryId: string;
  title: string;
  description: string;
  imageUrls: string[];
  status: string;
  skus: ProductSku[];
  createdAt: string;
};

export type ProductConnection = {
  nodes: Product[];
  nextCursor: string | null;
  hasNextPage: boolean;
};

export type Category = {
  categoryId: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
};

export type ProductSort = 'LATEST' | 'LOW_PRICE' | 'POPULAR';

export type ProductFilter = {
  categoryId?: string;
  query?: string;
  sort?: ProductSort;
  after?: string;
  first?: number;
};

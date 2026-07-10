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

export type ProductFilter = {
  categoryId?: string;
  query?: string;
  after?: string;
  first?: number;
};

export const catalogQueryKeys = {
  feed: () => ['feed', 'personalized'] as const,
  products: (query: string, categoryId?: string, sort?: string) => ['products', query, categoryId, sort] as const,
  product: (productId: string) => ['product', productId] as const,
  categories: () => ['categories'] as const,
};

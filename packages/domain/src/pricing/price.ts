export const formatKrw = (value: number) => `${value.toLocaleString()}원`;

export const isDiscounted = (originalPrice: number, salePrice: number) =>
  originalPrice > salePrice;

export const calculateDiscountRate = (originalPrice: number, salePrice: number) => {
  if (originalPrice <= 0) return 0;
  if (!isDiscounted(originalPrice, salePrice)) return 0;

  return Math.floor(((originalPrice - salePrice) / originalPrice) * 100);
};

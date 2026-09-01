import { useLocalSearchParams, useRouter } from "expo-router";

import { ProductDetail } from "@/features/product-detail";

const ProductScreen = () => {
  const router = useRouter();
  const { "product-id": productId } = useLocalSearchParams<{
    "product-id": string;
  }>();

  return (
    <ProductDetail
      onOpenCart={() => router.push("/cart")}
      productId={productId}
    />
  );
};

export default ProductScreen;

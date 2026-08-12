import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-native";

import { styleQueryKeys } from "../hooks";
import type { PurchasedStyleProduct } from "../types";
import StyleComposer from "./style-composer";

const purchasedProduct: PurchasedStyleProduct = {
  productId: "product-1",
  title: "오버핏 반팔 티셔츠",
  imageUrls: ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300"],
  brandId: "brand-1",
  brandName: "다담장",
  categoryId: "category-1",
  lastPurchasedAt: "2026-08-12T00:00:00.000Z",
};

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: Infinity }, mutations: { retry: false } },
});
queryClient.setQueryData(styleQueryKeys.purchasedProducts(), [purchasedProduct]);

const Harness = () => (
  <QueryClientProvider client={queryClient}>
    <StyleComposer onClose={() => undefined} />
  </QueryClientProvider>
);

const meta = {
  title: "Style/StyleComposer",
  component: StyleComposer,
  args: { onClose: () => undefined },
  render: () => <Harness />,
} satisfies Meta<typeof StyleComposer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

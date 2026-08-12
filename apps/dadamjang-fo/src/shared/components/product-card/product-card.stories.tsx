import type { Meta, StoryObj } from "@storybook/react-native";

import { ProductCard } from "./product-card";

const meta = {
  title: "Shared/ProductCard",
  component: ProductCard,
  args: {
    imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab",
    name: "오버핏 반팔 티셔츠",
    onPress: () => undefined,
    onToggleLike: () => undefined,
    originalPrice: 29900,
    price: 19900,
  },
} satisfies Meta<typeof ProductCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SaleAndExpressDelivery: Story = {
  args: {
    isExpressDelivery: true,
    isOnSale: true,
  },
};

export const Liked: Story = {
  args: {
    isLiked: true,
  },
};

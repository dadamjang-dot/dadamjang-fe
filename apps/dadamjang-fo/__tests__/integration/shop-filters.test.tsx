import { fireEvent, render, screen } from "@testing-library/react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import {
  ShopFiltersProvider,
  defaultShopFilters,
  useShopFilters,
} from "@/features/catalog/shop-filters";
import ProductSortSheet from "@/features/shop/components/product-sort-sheet";
import { ProductCard } from "@/shared/components/product-card";

const FilterHarness = () => {
  const { filters, draftFilters, startDraft, updateDraft, applyDraft } =
    useShopFilters();

  return (
    <View>
      <Text testID="filters.applied">{filters.brandIds.join(",") || "none"}</Text>
      <Text testID="filters.draft">{draftFilters.brandIds.join(",") || "none"}</Text>
      <Pressable testID="filters.start" onPress={startDraft} />
      <Pressable testID="filters.change" onPress={() => updateDraft({ brandIds: ["brand-1"] })} />
      <Pressable testID="filters.reset" onPress={() => updateDraft(defaultShopFilters)} />
      <Pressable testID="filters.apply" onPress={applyDraft} />
      <ProductSortSheet
        selectedSort={filters.sort}
        onSelect={(sort) => updateDraft({ sort })}
      />
    </View>
  );
};

describe("shop interactions", () => {
  it("keeps filter changes draft-only until apply and supports reset", async () => {
    await render(
      <ShopFiltersProvider>
        <FilterHarness />
      </ShopFiltersProvider>,
    );

    await fireEvent.press(screen.getByTestId("filters.start"));
    await fireEvent.press(screen.getByTestId("filters.change"));
    expect(screen.getByTestId("filters.applied")).toHaveTextContent("none");
    expect(screen.getByTestId("filters.draft")).toHaveTextContent("brand-1");

    await fireEvent.press(screen.getByTestId("filters.apply"));
    expect(screen.getByTestId("filters.applied")).toHaveTextContent("brand-1");

    await fireEvent.press(screen.getByTestId("filters.reset"));
    await fireEvent.press(screen.getByTestId("filters.apply"));
    expect(screen.getByTestId("filters.applied")).toHaveTextContent("none");
  });

  it("changes sort and navigates from a rendered product card", async () => {
    const ProductHarness = () => {
      const [destination, setDestination] = useState("shop");
      return (
        <View>
          <Text testID="product.destination">{destination}</Text>
          <ProductCard
            name="테스트 상품"
            isLiked={false}
            onPress={() => setDestination("product-1")}
            onToggleLike={() => undefined}
            originalPrice={10_000}
            price={8_000}
            productId="product-1"
          />
        </View>
      );
    };
    await render(<ProductHarness />);

    await fireEvent.press(screen.getByTestId("e2e.product.open.product-1"));

    expect(screen.getByTestId("product.destination")).toHaveTextContent("product-1");
  });
});

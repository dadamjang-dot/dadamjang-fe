import { useState } from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { ProductHeader, SearchContent } from "@/shared/components";
import { colors } from "@dadamjang/design-tokens";
import { ActionButtonGroup } from "@dadamjang/mobile";
import type { ProductLayoutProps } from "./product-layout.types";

const ProductLayout = (props: ProductLayoutProps) => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const handleCancelSearch = () => {
    setIsSearching(false);
    setSearchValue("");
  };

  const actionButtonGroup =
    props.variant === "circularPair" ? (
      <ActionButtonGroup actions={props.headerActions} variant="circularPair" />
    ) : (
      <ActionButtonGroup actions={props.headerActions} variant="capsule" />
    );

  return (
    <View style={s.container}>
      <ProductHeader
        isSearching={isSearching}
        onSearchFocus={() => setIsSearching(true)}
        onSearchCancel={handleCancelSearch}
        searchValue={searchValue}
        onSearchValueChange={setSearchValue}
      >
        {actionButtonGroup}
      </ProductHeader>

      {isSearching ? <SearchContent keyword={searchValue} /> : props.children}
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
});

export default ProductLayout;

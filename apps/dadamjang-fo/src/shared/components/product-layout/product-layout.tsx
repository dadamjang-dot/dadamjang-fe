import { useState } from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { ActionButton, ProductHeader, SearchContent } from "@/shared/components";
import type { ProductLayoutProps } from "./product-layout.types";

const ProductLayout = ({ headerActions, children }: ProductLayoutProps) => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const handleCancelSearch = () => {
    setIsSearching(false);
    setSearchValue("");
  };

  return (
    <View style={s.container}>
      <ProductHeader
        isSearching={isSearching}
        onSearchFocus={() => setIsSearching(true)}
        onSearchCancel={handleCancelSearch}
        searchValue={searchValue}
        onSearchValueChange={setSearchValue}
      >
        {headerActions?.map((actions, i) => (
          <ActionButton key={i} actions={actions} iconOnly />
        ))}
      </ProductHeader>

      {isSearching ? <SearchContent keyword={searchValue} /> : children}
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1 },
});

export default ProductLayout;

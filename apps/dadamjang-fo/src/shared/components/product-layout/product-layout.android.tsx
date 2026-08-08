import { useCallback, useState } from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import {
  ActionButton,
  ProductHeader,
  SearchContent,
} from "@/shared/components";
import { colors } from "@dadamjang/design-tokens";
import type { ProductLayoutProps } from "./product-layout.types";

const ProductLayout = ({ headerActions, variant: _variant, children }: ProductLayoutProps) => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const handleCancelSearch = useCallback(() => {
    setIsSearching(false);
    setSearchValue("");
  }, []);

  return (
    <View style={s.container}>
      <ProductHeader
        isSearching={isSearching}
        onSearchFocus={() => setIsSearching(true)}
        onSearchCancel={handleCancelSearch}
        searchValue={searchValue}
        onSearchValueChange={setSearchValue}
      >
        {headerActions.map((_, i) => (
          <ActionButton key={i} actions={headerActions} iconOnly />
        ))}
      </ProductHeader>

      {isSearching ? <SearchContent keyword={searchValue} /> : children}
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
});

export default ProductLayout;

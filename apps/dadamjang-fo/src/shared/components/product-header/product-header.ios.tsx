import { type ReactNode } from "react";
import { View } from "react-native";

import { SearchInput } from "@/shared/components/search-input";

interface ProductHeaderProps {
  children?: ReactNode;
}

const ProductHeader = ({ children }: ProductHeaderProps) => (
  <View
    style={{
      flexDirection: "row",
      gap: 20,
      justifyContent: "space-between",
      paddingHorizontal: 16,
    }}
  >
    <View style={{ flex: 1 }}>
      <SearchInput placeholder="Search" />
    </View>
    {children}
  </View>
);

export default ProductHeader;

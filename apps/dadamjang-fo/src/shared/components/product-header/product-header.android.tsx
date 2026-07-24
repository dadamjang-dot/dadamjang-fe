import { type ReactNode } from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { SearchInput } from "@/shared/components/search-input";

interface ProductHeaderProps {
  children?: ReactNode;
}

const ProductHeader = ({ children }: ProductHeaderProps) => (
  <View style={s.container}>
    <SearchInput placeholder="Search" />
    <View style={s.btnWrapper}>{children}</View>
  </View>
);

const s = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 0,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  btnWrapper: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
  },
});

export default ProductHeader;

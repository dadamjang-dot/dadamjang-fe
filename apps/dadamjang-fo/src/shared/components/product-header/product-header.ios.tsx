import { type ReactNode } from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { SearchInput } from "@/shared/components/search-input";

interface ProductHeaderProps {
  children?: ReactNode;
}

const ProductHeader = ({ children }: ProductHeaderProps) => (
  <View style={s.container}>
    <SearchInput placeholder="Search" style={s.input} />
    <View style={s.btnWrapper}>{children}</View>
  </View>
);

const s = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  btnWrapper: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
});

export default ProductHeader;

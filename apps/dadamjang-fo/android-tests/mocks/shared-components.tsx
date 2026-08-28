import type { ReactNode } from "react";
import { View } from "react-native";

export { ActionButton } from "@dadamjang/mobile";

const ProductHeader = ({ children }: { children?: ReactNode }) => (
  <View>{children}</View>
);

const SearchContent = () => null;

export { ProductHeader, SearchContent };

import type { ReactNode } from "react";
import { Text, View } from "react-native";

export { Button } from "../../src/shared/components/button/button";

export { ActionButton } from "@dadamjang/mobile";

const ProductHeader = ({ children }: { children?: ReactNode }) => (
  <View>{children}</View>
);

const TitleHeader = ({ children, title }: { children?: ReactNode; title: string }) => (
  <View>
    <Text>{title}</Text>
    {children}
  </View>
);

const SearchContent = () => null;

export { ProductHeader, SearchContent, TitleHeader };

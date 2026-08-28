import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import {
  ProductLayout,
} from "@/shared/components";
import type { IconAction } from "@dadamjang/mobile";

const HomeScreen = () => {
  const headerActions: IconAction[] = [
    {
      accessibilityLabel: "알림",
      icon: { md: "notifications", sf: "bell" },
      onPress: () => {},
    },
    {
      accessibilityLabel: "장바구니",
      icon: { md: "shopping_cart", sf: "cart" },
      onPress: () => {},
    },
  ];

  return (
    <ProductLayout headerActions={headerActions} variant="capsule">
      <View style={s.content} />
    </ProductLayout>
  );
};

const s = StyleSheet.create({
  content: { flex: 1 },
});

export default HomeScreen;

import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import {
  ProductLayout,
} from "@/shared/components";
import { Action } from "@dadamjang/mobile";

const HomeScreen = () => {
  const headerActions: Action[] = [
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

import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import {
  ProductLayout,
  ProductLayoutHeaderActionsType,
} from "@/shared/components";

const HomeScreen = () => {
  const headerActions: ProductLayoutHeaderActionsType = [
    [
      { icon: "bell", onPress: () => {} },
      { icon: "cart", onPress: () => {} },
    ],
  ];

  return (
    <ProductLayout headerActions={headerActions}>
      <View style={s.content} />
    </ProductLayout>
  );
};

const s = StyleSheet.create({
  content: { flex: 1 },
});

export default HomeScreen;

import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import {
  ProductLayout,
  ProductLayoutHeaderActionsType,
} from "@/shared/components";

const StyleScreen = () => {
  const headerActions: ProductLayoutHeaderActionsType = [
    [{ icon: "plus", onPress: () => {} }],
    [{ icon: "cart", onPress: () => {} }],
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

export default StyleScreen;

import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import {
  ProductLayout,
} from "@/shared/components";
import { Action } from "@dadamjang/mobile";

const HomeScreen = () => {
  const headerActions: Action[] = [
    { icon: "bell", onPress: () => {} },
    { icon: "cart", onPress: () => {} },
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

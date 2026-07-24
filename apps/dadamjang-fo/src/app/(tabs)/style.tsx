import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { ActionButton, ProductLayout } from "@/shared/components";

const StyleScreen = () => (
  <ProductLayout
    headerChildren={
      <>
        <ActionButton actions={[{ icon: "plus", onPress: () => {} }]} iconOnly />
        <ActionButton actions={[{ icon: "cart", onPress: () => {} }]} iconOnly />
      </>
    }
  >
    <View style={s.content} />
  </ProductLayout>
);

const s = StyleSheet.create({
  content: { flex: 1 },
});

export default StyleScreen;

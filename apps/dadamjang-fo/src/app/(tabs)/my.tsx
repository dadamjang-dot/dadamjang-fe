import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { useCurrentUser } from "@/features/auth";
import { TitleHeader } from "@/shared/components";
import { colors } from "@dadamjang/design-tokens";
import { ActionButtonGroup } from "@dadamjang/mobile";

const MyScreen = () => {
  const { isPending } = useCurrentUser();

  if (isPending) return null;

  return (
    <View style={s.container}>
      <TitleHeader title="마이">
        <ActionButtonGroup
          variant="circularPair"
          actions={[
            { icon: "gear", onPress: () => {} },
            { icon: "cart", onPress: () => {} },
          ]}
        />
      </TitleHeader>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
});

export default MyScreen;

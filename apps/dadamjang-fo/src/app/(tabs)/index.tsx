import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors, spacing } from "@dadamjang/design-tokens";
import type { IconAction } from "@dadamjang/mobile";

import { useAuthActionGate } from "@/features/auth";
import { Button, ProductLayout } from "@/shared/components";

const HomeScreen = () => {
  const router = useRouter();
  const notificationsGate = useAuthActionGate("/notifications");
  const openNotifications = () =>
    notificationsGate.runProtectedAction(() => router.push("/notifications"));
  const headerActions: IconAction[] = [
    {
      accessibilityLabel: "알림",
      icon: { md: "notifications", sf: "bell" },
      onPress: openNotifications,
    },
    {
      accessibilityLabel: "장바구니",
      icon: { md: "shopping_cart", sf: "cart" },
      onPress: () => router.push("/cart"),
    },
  ];

  return (
    <ProductLayout headerActions={headerActions} variant="capsule">
      <View style={s.content}>
        <Text style={s.title}>오늘의 다담장</Text>
        <Text style={s.description}>
          스타일을 발견하고 마음에 드는 상품을 둘러보세요.
        </Text>
        <Button label="쇼핑" onPress={() => router.push("/(tabs)/shop")} />
      </View>
    </ProductLayout>
  );
};

const s = StyleSheet.create({
  content: {
    flex: 1,
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.surface,
  },
  title: { color: colors.ink, fontSize: 24, fontWeight: "700" },
  description: { color: colors.muted, fontSize: 15, lineHeight: 22 },
});

export default HomeScreen;

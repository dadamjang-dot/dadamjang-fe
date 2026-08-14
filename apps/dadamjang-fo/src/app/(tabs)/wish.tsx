import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors } from "@dadamjang/design-tokens";

import { useCurrentUser } from "@/features/auth";
import {
  WishBrandsTab,
  WishCategoryBar,
  WishProductsTab,
  WishRecentProductsTab,
  WishState,
  WishStylesTab,
  type WishTab,
} from "@/features/wish";
import { ActionButton, TitleHeader } from "@/shared/components";

const WishScreen = () => {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const [selectedTab, setSelectedTab] = useState<WishTab>("PRODUCTS");

  const content = currentUser.isPending ? (
    <WishState isLoading title="위시 목록을 불러오는 중이에요." />
  ) : !currentUser.data ? (
    <WishState
      action={{
        label: "로그인",
        onPress: () => router.push("/auth"),
        testID: "e2e.wish.login",
      }}
      alignment="top"
      description="로그인하면 위시한 상품과 스타일을 한곳에서 확인할 수 있어요."
      title="로그인이 필요해요."
    />
  ) : selectedTab === "PRODUCTS" ? (
    <WishProductsTab />
  ) : selectedTab === "STYLES" ? (
    <WishStylesTab />
  ) : selectedTab === "BRANDS" ? (
    <WishBrandsTab />
  ) : (
    <WishRecentProductsTab />
  );

  return (
    <View style={s.container} testID="e2e.wish.screen">
      <TitleHeader title="위시">
        <ActionButton
          actions={[{ icon: "cart", onPress: () => router.push("/cart") }]}
          iconOnly
        />
      </TitleHeader>
      <WishCategoryBar onSelect={setSelectedTab} selectedTab={selectedTab} />
      {content}
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
});

export default WishScreen;

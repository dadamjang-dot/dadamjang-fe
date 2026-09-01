import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors } from "@dadamjang/design-tokens";

import { useAuthActionGate } from "@/features/auth";
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
  const currentUser = useAuthActionGate("/wish");
  const { authStatus, redirectToSignIn } = currentUser;
  const [selectedTab, setSelectedTab] = useState<WishTab>("PRODUCTS");

  useFocusEffect(
    useCallback(() => {
      if (authStatus === "unauthenticated") redirectToSignIn(true);
    }, [authStatus, redirectToSignIn]),
  );

  const content =
    currentUser.authStatus === "loading" ||
    currentUser.authStatus === "offline" ? (
      <WishState
        isLoading
        title={
          currentUser.authStatus === "offline"
            ? "연결을 기다리고 있어요."
            : "위시 목록을 불러오는 중이에요."
        }
      />
    ) : currentUser.authStatus === "error" ? (
      <WishState
        onRetry={() => currentUser.retryAuth()}
        title="로그인 상태를 확인하지 못했어요."
      />
    ) : currentUser.authStatus === "unauthenticated" ? (
      <WishState title="로그인 화면으로 이동하고 있어요." />
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
          actions={[
            {
              accessibilityLabel: "장바구니",
              icon: { md: "shopping_cart", sf: "cart" },
              onPress: () => router.push("/cart"),
            },
          ]}
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

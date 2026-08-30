import { LegendList } from "@legendapp/list/react-native";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors, spacing } from "@dadamjang/design-tokens";

import { useBrandFollowActions, useFollowedBrands } from "../hooks";
import { Button } from "@/shared/components";
import WishState from "./wish-state";

const WishBrandsTab = () => {
  const followedBrands = useFollowedBrands();
  const actions = useBrandFollowActions();

  if (followedBrands.isLoading) {
    return <WishState isLoading title="팔로우 브랜드를 불러오는 중이에요." />;
  }

  if (followedBrands.isError) {
    return (
      <WishState
        description="잠시 후 다시 시도해 주세요."
        onRetry={() => followedBrands.refetch()}
        title="팔로우 브랜드를 불러오지 못했어요."
      />
    );
  }

  if (!followedBrands.data?.length) {
    return (
      <WishState
        description="상품에서 마음에 드는 브랜드를 팔로우해 보세요."
        title="팔로우한 브랜드가 없어요."
      />
    );
  }

  return (
    <LegendList
      accessibilityLabel="팔로우한 브랜드 목록"
      contentContainerStyle={s.content}
      contentInsetAdjustmentBehavior="automatic"
      data={followedBrands.data}
      keyExtractor={(brand) => brand.brandId}
      recycleItems
      renderItem={({ item: brand }) => (
        <View style={s.item}>
          <View style={s.copy}>
            <Text style={s.name}>{brand.name}</Text>
            <Text style={s.slug}>{brand.slug}</Text>
          </View>
          <Button
            label="언팔로우"
            onPress={() => actions.unfollow.mutate(brand.brandId)}
            style={s.unfollowButton}
            testID={`e2e.wish.brand.unfollow.${brand.brandId}`}
            variant="secondary"
          />
        </View>
      )}
      showsVerticalScrollIndicator={false}
      style={s.list}
    />
  );
};

const s = StyleSheet.create({
  list: { flex: 1 },
  content: { gap: spacing.sm, padding: 16, paddingBottom: 32 },
  item: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
  },
  copy: { flex: 1, gap: spacing.xs },
  name: { color: colors.ink, fontSize: 15, fontWeight: "700" },
  slug: { color: colors.muted, fontSize: 12 },
  unfollowButton: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: 18,
  },
});

export default WishBrandsTab;

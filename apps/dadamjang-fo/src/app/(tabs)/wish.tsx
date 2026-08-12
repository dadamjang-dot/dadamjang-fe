import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors } from "@dadamjang/design-tokens";

import { useCurrentUser } from "@/features/auth";
import { useWishActions, useWishlist } from "@/features/wish";
import { TitleHeader } from "@/shared/components";

const WishScreen = () => {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const wishlist = useWishlist(Boolean(currentUser.data));
  const actions = useWishActions();

  if (currentUser.isPending || wishlist.isLoading) return <Text style={s.state}>위시리스트를 불러오는 중이에요.</Text>;
  if (wishlist.isError) {
    return (
      <View style={s.stateGroup}>
        <Text style={s.state}>위시리스트를 불러오지 못했어요.</Text>
        <Pressable onPress={() => wishlist.refetch()} testID="e2e.wish.retry"><Text style={s.link}>다시 시도</Text></Pressable>
      </View>
    );
  }

  return (
    <View style={s.container} testID="e2e.wish.screen">
      <TitleHeader title="WISH" />
      <ScrollView contentContainerStyle={s.content}>
        {(wishlist.data ?? []).map((item) => (
          <View key={item.wishId} style={s.item}>
            <Pressable onPress={() => router.push(`/product/${item.productId}`)} testID={`e2e.product.open.${item.productId}`}>
              <Text style={s.title}>{item.product.title}</Text>
            </Pressable>
            <Pressable onPress={() => actions.remove.mutate(item.productId)} testID={`e2e.wish.remove.${item.productId}`}>
              <Text style={s.link}>위시 삭제</Text>
            </Pressable>
          </View>
        ))}
        {wishlist.data?.length === 0 ? <Text style={s.state}>위시리스트가 비어 있어요.</Text> : null}
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { gap: 12, padding: 20 },
  item: { gap: 8, padding: 16, borderWidth: 1, borderColor: colors.line, borderRadius: 8 },
  title: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  stateGroup: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  state: { padding: 24, color: colors.muted, textAlign: "center" },
  link: { color: colors.primary, fontWeight: "700" },
});

export default WishScreen;

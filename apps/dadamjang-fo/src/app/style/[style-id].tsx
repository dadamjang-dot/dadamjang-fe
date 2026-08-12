import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors } from "@dadamjang/design-tokens";

import { useCurrentUser } from "@/features/auth";
import { StylePostDetail } from "@/features/style/components";
import { useStylePost, useToggleStylePostLike } from "@/features/style";
import { Button } from "@/shared/components";

const StylePostScreen = () => {
  const router = useRouter();
  const { "style-id": styleId } = useLocalSearchParams<{ "style-id": string }>();
  const currentUser = useCurrentUser();
  const postQuery = useStylePost(styleId);
  const likeMutation = useToggleStylePostLike();

  if (postQuery.isLoading) {
    return <View style={s.state}><ActivityIndicator color={colors.primary} /><Text style={s.helper}>스타일을 불러오는 중이에요.</Text></View>;
  }
  if (postQuery.isError || !postQuery.data) {
    return <View style={s.state}><Text style={s.title}>스타일을 불러오지 못했어요.</Text><Button label="다시 시도" onPress={() => postQuery.refetch()} /></View>;
  }

  return (
    <StylePostDetail
      isLikePending={likeMutation.isPending}
      onBack={() => router.back()}
      onProductPress={(productId) => router.push(`/product/${productId}`)}
      onToggleLike={(nextLiked) => {
        if (!currentUser.data) {
          router.push({ pathname: "/auth/signin", params: { returnTo: `/style/${styleId}` } });
          return;
        }
        likeMutation.mutate({ stylePostId: styleId, nextLiked });
      }}
      post={postQuery.data}
    />
  );
};

const s = StyleSheet.create({
  state: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24, backgroundColor: colors.surface },
  title: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  helper: { color: colors.muted, fontSize: 14 },
});

export default StylePostScreen;

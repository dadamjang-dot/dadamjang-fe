import { LegendList } from "@legendapp/list/react-native";
import { useRouter } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors } from "@dadamjang/design-tokens";

import { useLikedStylePosts, useToggleStylePostLike } from "@/features/style";
import { StylePostCard } from "@/features/style/components";
import { Button } from "@/shared/components";
import WishState from "./wish-state";

const WishStylesTab = () => {
  const router = useRouter();
  const likedPosts = useLikedStylePosts();
  const likeMutation = useToggleStylePostLike();
  const posts = likedPosts.data?.pages.flatMap((page) => page.nodes) ?? [];

  if (likedPosts.isLoading) {
    return <WishState isLoading title="위시한 스타일을 불러오는 중이에요." />;
  }

  if (likedPosts.isError) {
    return (
      <WishState
        description="잠시 후 다시 시도해 주세요."
        onRetry={() => likedPosts.refetch()}
        title="위시한 스타일을 불러오지 못했어요."
      />
    );
  }

  if (!posts.length) {
    return (
      <WishState
        description="좋아요를 누른 스타일을 여기서 모아볼 수 있어요."
        title="위시한 스타일이 없어요."
      />
    );
  }

  return (
    <LegendList
      accessibilityLabel="위시한 스타일 목록"
      columnWrapperStyle={s.gridRow}
      contentContainerStyle={s.content}
      contentInsetAdjustmentBehavior="automatic"
      data={posts}
      keyExtractor={(post) => post.stylePostId}
      ListFooterComponent={
        likedPosts.hasNextPage || likedPosts.isFetchingNextPage ? (
          <View style={s.footer}>
            {likedPosts.hasNextPage ? (
              <Button
                label="더 보기"
                onPress={() => likedPosts.fetchNextPage()}
                style={s.moreButton}
                variant="secondary"
              />
            ) : null}
            {likedPosts.isFetchingNextPage ? (
              <ActivityIndicator color={colors.ink} style={s.loading} />
            ) : null}
          </View>
        ) : null
      }
      numColumns={2}
      recycleItems
      renderItem={({ item: post }) => (
        <View style={s.card}>
          <StylePostCard
            author={post.author.userid}
            content={post.content}
            hashtags={post.hashtags}
            imageUrl={post.thumbnailUrl}
            isLiked={post.isLiked}
            likeCount={post.likeCount}
            onPress={(stylePostId) => router.push(`/style/${stylePostId}`)}
            onToggleLike={(stylePostId, nextLiked) =>
              likeMutation.mutate({ stylePostId, nextLiked })
            }
            stylePostId={post.stylePostId}
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
  content: { padding: 16, paddingBottom: 32 },
  gridRow: { gap: 16 },
  card: { flex: 1, minWidth: 0, marginBottom: 16 },
  footer: { gap: 12, paddingTop: 4 },
  moreButton: { minHeight: 44, borderRadius: 22 },
  loading: { paddingVertical: 8 },
});

export default WishStylesTab;

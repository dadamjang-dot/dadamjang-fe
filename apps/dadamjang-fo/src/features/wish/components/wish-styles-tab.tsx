import { LegendList } from "@legendapp/list/react-native";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors } from "@dadamjang/design-tokens";

import { useLikedStylePosts, useToggleStylePostLike } from "@/features/style";
import { StylePostCard } from "@/features/style/components";
import { Button } from "@/shared/components";
import { uniqueBy } from "@/shared/lib";
import WishState from "./wish-state";

const WishStylesTab = () => {
  const router = useRouter();
  const likedPosts = useLikedStylePosts();
  const likeMutation = useToggleStylePostLike();
  const posts = useMemo(
    () =>
      uniqueBy(
        likedPosts.data?.pages.flatMap((page) => page.nodes) ?? [],
        (post) => post.stylePostId,
      ),
    [likedPosts.data?.pages],
  );
  const rows = useMemo(
    () =>
      Array.from({ length: Math.ceil(posts.length / 2) }, (_, index) =>
        posts.slice(index * 2, index * 2 + 2),
      ),
    [posts],
  );

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
      contentContainerStyle={s.content}
      contentInsetAdjustmentBehavior="automatic"
      data={rows}
      keyExtractor={(row) => row.map((post) => post.stylePostId).join("-")}
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
      recycleItems
      renderItem={({ item: row, index: rowIndex }) => (
        <View style={[s.row, rowIndex < rows.length - 1 && s.rowGap]}>
          {row.map((post) => (
            <View key={post.stylePostId} style={s.card}>
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
          ))}
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
  row: { flexDirection: "row", gap: 16 },
  rowGap: { marginBottom: 16 },
  card: { width: "47.5%", minWidth: 0 },
  footer: { gap: 20, paddingTop: 20 },
  moreButton: { minHeight: 44, borderRadius: 22 },
  loading: { paddingVertical: 8 },
});

export default WishStylesTab;

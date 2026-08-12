import { type ReactElement, useMemo } from "react";
import { LegendList } from "@legendapp/list/react-native";
import { ActivityIndicator, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors } from "@dadamjang/design-tokens";

import { Button } from "@/shared/components";
import type { StylePost } from "../types";
import StylePostCard from "./style-post-card";

type StylePostGridProps = {
  categoryBar: ReactElement;
  sortBar?: ReactElement;
  posts: StylePost[];
  isLoading: boolean;
  isError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onRetry: () => void;
  onLoadMore: () => void;
  onPostPress: (stylePostId: string) => void;
  onToggleLike: (stylePostId: string, nextLiked: boolean) => void;
  showRank?: boolean;
};

type Row =
  | { type: "category" }
  | { type: "sort" }
  | { type: "state" }
  | { type: "posts"; posts: StylePost[]; startIndex: number };

const StylePostGrid = ({
  categoryBar,
  sortBar,
  posts,
  isLoading,
  isError,
  hasNextPage,
  isFetchingNextPage,
  onRetry,
  onLoadMore,
  onPostPress,
  onToggleLike,
  showRank = false,
}: StylePostGridProps) => {
  const rows = useMemo<Row[]>(() => {
    const controls: Row[] = [{ type: "category" }];
    if (sortBar) controls.push({ type: "sort" });
    if (isLoading || isError || posts.length === 0) return [...controls, { type: "state" }];
    return [
      ...controls,
      ...Array.from({ length: Math.ceil(posts.length / 2) }, (_, index) => ({
        type: "posts" as const,
        posts: posts.slice(index * 2, index * 2 + 2),
        startIndex: index * 2,
      })),
    ];
  }, [isError, isLoading, posts, sortBar]);

  return (
    <LegendList
      accessibilityLabel="스타일 게시물 목록"
      contentContainerStyle={s.listContent}
      data={rows}
      extraData={[categoryBar, sortBar, posts]}
      getItemType={(item) => item.type}
      keyExtractor={(item, index) => item.type === "posts" ? item.posts.map((post) => post.stylePostId).join("-") : `${item.type}-${index}`}
      onEndReached={hasNextPage && !isFetchingNextPage ? onLoadMore : undefined}
      onEndReachedThreshold={0.6}
      renderItem={({ item }) => {
        if (item.type === "category") return categoryBar;
        if (item.type === "sort") return sortBar;
        if (item.type === "state") {
          return (
            <View style={s.state}>
              <Text style={s.stateTitle}>{isError ? "스타일 게시물을 불러오지 못했어요." : "아직 스타일 게시물이 없어요."}</Text>
              <Text style={s.stateDescription}>{isError ? "잠시 후 다시 시도해 주세요." : "첫 번째 스타일을 공유해 보세요."}</Text>
              {isError ? <Button label="다시 시도" onPress={onRetry} style={s.retryButton} /> : null}
            </View>
          );
        }
        return (
          <View style={s.postRow}>
            {item.posts.map((post, index) => (
              <View key={post.stylePostId} style={s.postCell}>
                <StylePostCard
                  author={post.author.userid}
                  content={post.content}
                  hashtags={post.hashtags}
                  imageUrl={post.thumbnailUrl}
                  isLiked={post.isLiked}
                  likeCount={post.likeCount}
                  onPress={onPostPress}
                  onToggleLike={onToggleLike}
                  productCount={post.products.length}
                  rank={showRank ? item.startIndex + index + 1 : undefined}
                  stylePostId={post.stylePostId}
                />
              </View>
            ))}
          </View>
        );
      }}
      ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={s.footer} /> : null}
      recycleItems
      showsVerticalScrollIndicator={false}
      stickyHeaderIndices={[0]}
      style={s.list}
    />
  );
};

const s = StyleSheet.create({
  list: { flex: 1 },
  listContent: { paddingBottom: 24 },
  postRow: { flexDirection: "row", justifyContent: "space-between", gap: 16, paddingHorizontal: 16, paddingTop: 16 },
  postCell: { flex: 1, minWidth: 0 },
  footer: { paddingVertical: 12 },
  state: { minHeight: 280, alignItems: "center", justifyContent: "center", gap: 8, padding: 24 },
  stateTitle: { color: colors.ink, fontSize: 16, fontWeight: "700", textAlign: "center" },
  stateDescription: { color: colors.muted, fontSize: 14, textAlign: "center" },
  retryButton: { minHeight: 40, justifyContent: "center", paddingHorizontal: 18, borderRadius: 20, backgroundColor: colors.primary },
});

export default StylePostGrid;

import { useRouter } from "expo-router";
import { useState } from "react";

import { Action } from "@dadamjang/mobile";

import { useCurrentUser } from "@/features/auth";
import {
  StyleCategoryBar,
  StylePostGrid,
  StyleSortBar,
  type StyleCategoryKey,
} from "@/features/style/components";
import { getStyleFeedFilter, useStylePosts, useToggleStylePostLike } from "@/features/style";
import type { StylePostSort } from "@/features/style";
import { ProductLayout } from "@/shared/components";

const StyleScreen = () => {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const [selectedCategory, setSelectedCategory] = useState<StyleCategoryKey>("ALL");
  const [selectedSort, setSelectedSort] = useState<StylePostSort>("RECOMMENDED");
  const isRanking = selectedCategory === "RANKING";
  const feedFilter = getStyleFeedFilter(selectedCategory, selectedSort);
  const postsQuery = useStylePosts(feedFilter.category, feedFilter.sort);
  const likeMutation = useToggleStylePostLike();
  const posts = postsQuery.data?.pages.flatMap((page) => page.nodes) ?? [];

  const requireSignIn = (returnTo: string) => {
    if (!currentUser.data) {
      router.push({ pathname: "/auth", params: { returnTo } });
      return false;
    }
    return true;
  };

  const handleCreatePress = () => {
    if (requireSignIn("/style-compose")) router.push("/style-compose");
  };

  const headerActions: Action[] = [
    {
      accessibilityLabel: "스타일 작성",
      icon: { md: "add", sf: "plus" },
      onPress: handleCreatePress,
    },
    {
      accessibilityLabel: "장바구니",
      icon: { md: "shopping_cart", sf: "cart" },
      onPress: () => router.push("/cart"),
    },
  ];

  return (
    <ProductLayout headerActions={headerActions} variant="circularPair">
      <StylePostGrid
        categoryBar={<StyleCategoryBar onSelect={setSelectedCategory} selectedCategory={selectedCategory} />}
        hasNextPage={Boolean(postsQuery.hasNextPage)}
        isError={postsQuery.isError}
        isFetchingNextPage={postsQuery.isFetchingNextPage}
        isLoading={postsQuery.isLoading}
        onLoadMore={() => postsQuery.fetchNextPage()}
        onPostPress={(stylePostId) => router.push(`/style/${stylePostId}`)}
        onRetry={() => postsQuery.refetch()}
        onToggleLike={(stylePostId, nextLiked) => {
          if (requireSignIn(`/style/${stylePostId}`)) likeMutation.mutate({ stylePostId, nextLiked });
        }}
        posts={posts}
        showRank={isRanking}
        sortBar={isRanking ? undefined : <StyleSortBar onSelect={setSelectedSort} sort={selectedSort} />}
      />
    </ProductLayout>
  );
};

export default StyleScreen;

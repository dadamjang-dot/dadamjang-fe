import { hashKey } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useLayoutEffect, useMemo, useRef, useState } from "react";

import type { IconAction } from "@dadamjang/mobile";

import { useCurrentUser } from "@/features/auth";
import {
  StyleCategoryBar,
  StylePostGrid,
  StyleSortBar,
  type StyleCategoryKey,
} from "@/features/style/components";
import {
  getStyleFeedFilter,
  styleQueryKeys,
  useStylePosts,
  useToggleStylePostLike,
} from "@/features/style";
import type { StylePostSort } from "@/features/style";
import { ProductLayout } from "@/shared/components";
import { fetchUntilRowsGrow, uniqueBy } from "@/shared/lib";

const StyleScreen = () => {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const [selectedCategory, setSelectedCategory] =
    useState<StyleCategoryKey>("ALL");
  const [selectedSort, setSelectedSort] =
    useState<StylePostSort>("RECOMMENDED");
  const isRanking = selectedCategory === "RANKING";
  const feedFilter = getStyleFeedFilter(selectedCategory, selectedSort);
  const styleQueryIdentity = hashKey(
    styleQueryKeys.posts(feedFilter.category, feedFilter.sort),
  );
  const postsQuery = useStylePosts(feedFilter.category, feedFilter.sort);
  const currentStyleQueryIdentity = useRef(styleQueryIdentity);
  const loadingStyleQueryIdentity = useRef<string | undefined>(undefined);
  const likeMutation = useToggleStylePostLike();
  const posts = useMemo(
    () =>
      uniqueBy(
        postsQuery.data?.pages.flatMap((page) => page.nodes) ?? [],
        (post) => post.stylePostId,
      ),
    [postsQuery.data?.pages],
  );

  useLayoutEffect(() => {
    currentStyleQueryIdentity.current = styleQueryIdentity;
  }, [styleQueryIdentity]);

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

  const handleLoadMore = async () => {
    if (
      loadingStyleQueryIdentity.current === styleQueryIdentity ||
      postsQuery.isFetchingNextPage ||
      !postsQuery.hasNextPage
    )
      return;

    loadingStyleQueryIdentity.current = styleQueryIdentity;
    try {
      await fetchUntilRowsGrow(
        postsQuery.data,
        postsQuery.fetchNextPage,
        (post) => post.stylePostId,
        2,
        () => currentStyleQueryIdentity.current === styleQueryIdentity,
      );
    } finally {
      if (loadingStyleQueryIdentity.current === styleQueryIdentity) {
        loadingStyleQueryIdentity.current = undefined;
      }
    }
  };

  const headerActions: IconAction[] = [
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
        categoryBar={
          <StyleCategoryBar
            onSelect={setSelectedCategory}
            selectedCategory={selectedCategory}
          />
        }
        hasNextPage={Boolean(postsQuery.hasNextPage)}
        isError={postsQuery.isError}
        isFetchingNextPage={postsQuery.isFetchingNextPage}
        isLoading={postsQuery.isLoading}
        onLoadMore={handleLoadMore}
        onPostPress={(stylePostId) => router.push(`/style/${stylePostId}`)}
        onRetry={() => postsQuery.refetch()}
        onToggleLike={(stylePostId, nextLiked) => {
          if (requireSignIn(`/style/${stylePostId}`))
            likeMutation.mutate({ stylePostId, nextLiked });
        }}
        posts={posts}
        showRank={isRanking}
        sortBar={
          isRanking ? undefined : (
            <StyleSortBar onSelect={setSelectedSort} sort={selectedSort} />
          )
        }
      />
    </ProductLayout>
  );
};

export default StyleScreen;

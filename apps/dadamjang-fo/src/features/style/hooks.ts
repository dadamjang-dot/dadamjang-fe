import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";

import {
  createStylePost,
  getLikedStylePosts,
  getPurchasedStyleProducts,
  getStylePost,
  getStylePosts,
  likeStylePost,
  unlikeStylePost,
} from "./api";
import type {
  StylePost,
  StylePostCategory,
  StylePostConnection,
  StylePostSort,
} from "./types";

export const styleQueryKeys = {
  postsRoot: () => ["style-posts"] as const,
  posts: (category: StylePostCategory | undefined, sort: StylePostSort) =>
    ["style-posts", { category: category ?? null, sort }] as const,
  likedPosts: () => ["style-posts", "liked"] as const,
  post: (stylePostId: string) => ["style-post", stylePostId] as const,
  purchasedProducts: () => ["purchased-style-products"] as const,
};

export const useStylePosts = (
  category?: StylePostCategory,
  sort: StylePostSort = "RECOMMENDED",
) =>
  useInfiniteQuery({
    queryKey: styleQueryKeys.posts(category, sort),
    queryFn: ({ pageParam, signal }) =>
      getStylePosts(
        { filter: { category, sort }, after: pageParam, first: 20 },
        signal,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage ? (lastPage.nextCursor ?? undefined) : undefined,
  });

export const useLikedStylePosts = (enabled = true) =>
  useInfiniteQuery({
    queryKey: styleQueryKeys.likedPosts(),
    queryFn: ({ pageParam, signal }) =>
      getLikedStylePosts({ after: pageParam, first: 20 }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage ? (lastPage.nextCursor ?? undefined) : undefined,
    enabled,
  });

export const useStylePost = (stylePostId: string) =>
  useQuery({
    queryKey: styleQueryKeys.post(stylePostId),
    queryFn: ({ signal }) => getStylePost(stylePostId, signal),
    enabled: Boolean(stylePostId),
  });

export const usePurchasedStyleProducts = (enabled = true) =>
  useQuery({
    queryKey: styleQueryKeys.purchasedProducts(),
    queryFn: ({ signal }) => getPurchasedStyleProducts(signal),
    enabled,
  });

export const useCreateStylePost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createStylePost,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: styleQueryKeys.postsRoot() }),
  });
};

const updateStylePostLike = (
  post: StylePost,
  stylePostId: string,
  nextLiked: boolean,
) =>
  post.stylePostId === stylePostId
    ? {
        ...post,
        isLiked: nextLiked,
        likeCount: Math.max(0, post.likeCount + (nextLiked ? 1 : -1)),
      }
    : post;

const updateFeedData = (
  data: InfiniteData<StylePostConnection> | undefined,
  stylePostId: string,
  nextLiked: boolean,
) =>
  data
    ? {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          nodes: page.nodes.map((post) =>
            updateStylePostLike(post, stylePostId, nextLiked),
          ),
        })),
      }
    : data;

export const useToggleStylePostLike = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      stylePostId,
      nextLiked,
    }: {
      stylePostId: string;
      nextLiked: boolean;
    }) =>
      nextLiked ? likeStylePost(stylePostId) : unlikeStylePost(stylePostId),
    onMutate: async ({ stylePostId, nextLiked }) => {
      await queryClient.cancelQueries({ queryKey: styleQueryKeys.postsRoot() });
      await queryClient.cancelQueries({ queryKey: ["style-post"] });
      const previousFeeds = queryClient.getQueriesData<
        InfiniteData<StylePostConnection>
      >({
        queryKey: styleQueryKeys.postsRoot(),
      });
      const previousPost = queryClient.getQueryData<StylePost>(
        styleQueryKeys.post(stylePostId),
      );
      queryClient.setQueriesData<InfiniteData<StylePostConnection>>(
        { queryKey: styleQueryKeys.postsRoot() },
        (data) => updateFeedData(data, stylePostId, nextLiked),
      );
      queryClient.setQueryData<StylePost>(
        styleQueryKeys.post(stylePostId),
        (post) =>
          post ? updateStylePostLike(post, stylePostId, nextLiked) : post,
      );
      return { previousFeeds, previousPost };
    },
    onError: (_error, variables, context) => {
      context?.previousFeeds.forEach(([queryKey, data]) =>
        queryClient.setQueryData(queryKey, data),
      );
      if (context?.previousPost)
        queryClient.setQueryData(
          styleQueryKeys.post(variables.stylePostId),
          context.previousPost,
        );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: styleQueryKeys.postsRoot() });
      queryClient.invalidateQueries({ queryKey: ["style-post"] });
    },
  });
};

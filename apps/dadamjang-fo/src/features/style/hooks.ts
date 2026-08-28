import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { useRef } from "react";

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
const getNextStylePostCursor = (
  lastPage: StylePostConnection,
  allPages: StylePostConnection[],
) => {
  if (!lastPage.hasNextPage || lastPage.nextCursor === null) return undefined;
  const { nextCursor } = lastPage;
  if (
    allPages.some(
      (page, index) =>
        index < allPages.length - 1 && page.nextCursor === nextCursor,
    )
  )
    return undefined;
  return nextCursor;
};

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
    getNextPageParam: getNextStylePostCursor,
  });

export const useLikedStylePosts = (enabled = true) =>
  useInfiniteQuery({
    queryKey: styleQueryKeys.likedPosts(),
    queryFn: ({ pageParam, signal }) =>
      getLikedStylePosts({ after: pageParam, first: 20 }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: getNextStylePostCursor,
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
  const pendingByPost = useRef(new Map<string, Promise<void>>());
  const revisionByPost = useRef(new Map<string, number>());
  return useMutation({
    mutationFn: async ({
      stylePostId,
      nextLiked,
    }: {
      stylePostId: string;
      nextLiked: boolean;
    }) => {
      const previous = pendingByPost.current.get(stylePostId);
      const request = (previous ?? Promise.resolve())
        .catch(() => undefined)
        .then(() =>
          nextLiked
            ? likeStylePost(stylePostId)
            : unlikeStylePost(stylePostId),
        );
      const settled = request.then(
        () => undefined,
        () => undefined,
      );
      pendingByPost.current.set(stylePostId, settled);

      try {
        return await request;
      } finally {
        if (pendingByPost.current.get(stylePostId) === settled)
          pendingByPost.current.delete(stylePostId);
      }
    },
    onMutate: async ({ stylePostId, nextLiked }) => {
      const revision = (revisionByPost.current.get(stylePostId) ?? 0) + 1;
      revisionByPost.current.set(stylePostId, revision);
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
      return { previousFeeds, previousPost, revision };
    },
    onError: (_error, variables, context) => {
      if (
        context?.revision !== revisionByPost.current.get(variables.stylePostId)
      )
        return;
      context?.previousFeeds.forEach(([queryKey, data]) =>
        queryClient.setQueryData(queryKey, data),
      );
      if (context?.previousPost)
        queryClient.setQueryData(
          styleQueryKeys.post(variables.stylePostId),
          context.previousPost,
        );
    },
    onSettled: (_data, _error, variables, context) => {
      if (
        context?.revision === revisionByPost.current.get(variables.stylePostId)
      )
        revisionByPost.current.delete(variables.stylePostId);
      queryClient.invalidateQueries({ queryKey: styleQueryKeys.postsRoot() });
      queryClient.invalidateQueries({ queryKey: ["style-post"] });
    },
  });
};

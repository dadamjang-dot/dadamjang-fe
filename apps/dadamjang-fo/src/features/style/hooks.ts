import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type MutateOptions,
  type QueryClient,
} from "@tanstack/react-query";
import { getSessionGeneration } from "@dadamjang/graphql-client";

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
        likeCount: Math.max(
          0,
          post.likeCount +
            (post.isLiked === nextLiked ? 0 : nextLiked ? 1 : -1),
        ),
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

interface StyleLikeCoordinator {
  activeCount: number;
  pending?: Promise<void>;
  revision: number;
  confirmed?: Pick<StylePost, "isLiked" | "likeCount">;
}

const styleLikeCoordinatorsByClient = new WeakMap<
  QueryClient,
  Map<string, StyleLikeCoordinator>
>();

const getStyleLikeCoordinator = (
  queryClient: QueryClient,
  stylePostId: string,
) => {
  let coordinatorsByPost = styleLikeCoordinatorsByClient.get(queryClient);
  if (!coordinatorsByPost) {
    coordinatorsByPost = new Map();
    styleLikeCoordinatorsByClient.set(queryClient, coordinatorsByPost);
  }
  let coordinator = coordinatorsByPost.get(stylePostId);
  if (!coordinator) {
    coordinator = { activeCount: 0, revision: 0 };
    coordinatorsByPost.set(stylePostId, coordinator);
  }
  return coordinator;
};

const releaseStyleLikeCoordinator = (
  queryClient: QueryClient,
  stylePostId: string,
  coordinator: StyleLikeCoordinator,
) => {
  if (coordinator.activeCount > 0 || coordinator.pending) return;
  const coordinatorsByPost = styleLikeCoordinatorsByClient.get(queryClient);
  if (coordinatorsByPost?.get(stylePostId) !== coordinator) return;
  coordinatorsByPost.delete(stylePostId);
  if (coordinatorsByPost.size === 0)
    styleLikeCoordinatorsByClient.delete(queryClient);
};

export const useToggleStylePostLike = () => {
  const queryClient = useQueryClient();
  type Input = { stylePostId: string; nextLiked: boolean };
  const applyConfirmed = (
    stylePostId: string,
    confirmed: Pick<StylePost, "isLiked" | "likeCount">,
  ) => {
    const update = (post: StylePost) =>
      post.stylePostId === stylePostId ? { ...post, ...confirmed } : post;
    queryClient.setQueriesData<InfiniteData<StylePostConnection>>(
      { queryKey: styleQueryKeys.postsRoot() },
      (data) =>
        data
          ? {
              ...data,
              pages: data.pages.map((page) => ({
                ...page,
                nodes: page.nodes.map(update),
              })),
            }
          : data,
    );
    queryClient.setQueryData<StylePost>(
      styleQueryKeys.post(stylePostId),
      (post) => (post ? update(post) : post),
    );
  };
  const mutation = useMutation({
    mutationKey: ["style-like"],
    mutationFn: async ({
      input: { stylePostId, nextLiked },
      generation,
    }: {
      input: Input;
      generation: number;
    }) => {
      const coordinatorKey = `${generation}:${stylePostId}`;
      const coordinator = getStyleLikeCoordinator(queryClient, coordinatorKey);
      const previous = coordinator.pending;
      const request = (previous ?? Promise.resolve())
        .catch(() => undefined)
        .then(() => {
          if (getSessionGeneration() !== generation)
            throw new Error("Session changed");
          return nextLiked
            ? likeStylePost(stylePostId)
            : unlikeStylePost(stylePostId);
        });
      const settled = request.then(
        () => undefined,
        () => undefined,
      );
      coordinator.pending = settled;

      try {
        return await request;
      } finally {
        if (coordinator.pending === settled) coordinator.pending = undefined;
        releaseStyleLikeCoordinator(queryClient, coordinatorKey, coordinator);
      }
    },
    onMutate: async ({ input: { stylePostId, nextLiked }, generation }) => {
      const coordinator = getStyleLikeCoordinator(
        queryClient,
        `${generation}:${stylePostId}`,
      );
      coordinator.activeCount += 1;
      coordinator.revision += 1;
      const { revision } = coordinator;
      await queryClient.cancelQueries({ queryKey: styleQueryKeys.postsRoot() });
      await queryClient.cancelQueries({ queryKey: ["style-post"] });
      if (getSessionGeneration() !== generation)
        return { coordinator, revision };
      const previousFeeds = queryClient.getQueriesData<
        InfiniteData<StylePostConnection>
      >({
        queryKey: styleQueryKeys.postsRoot(),
      });
      const previousPost = queryClient.getQueryData<StylePost>(
        styleQueryKeys.post(stylePostId),
      );
      const previous =
        previousPost ??
        previousFeeds
          .flatMap(
            ([, data]) => data?.pages.flatMap((page) => page.nodes) ?? [],
          )
          .find((post) => post.stylePostId === stylePostId);
      if (!coordinator.confirmed && previous)
        coordinator.confirmed = {
          isLiked: previous.isLiked,
          likeCount: previous.likeCount,
        };
      queryClient.setQueriesData<InfiniteData<StylePostConnection>>(
        { queryKey: styleQueryKeys.postsRoot() },
        (data) => updateFeedData(data, stylePostId, nextLiked),
      );
      queryClient.setQueryData<StylePost>(
        styleQueryKeys.post(stylePostId),
        (post) =>
          post ? updateStylePostLike(post, stylePostId, nextLiked) : post,
      );
      return { coordinator, revision };
    },
    onSuccess: (post, variables, context) => {
      if (!context || getSessionGeneration() !== variables.generation) return;
      context.coordinator.confirmed = {
        isLiked: post.isLiked,
        likeCount: post.likeCount,
      };
      if (context.revision === context.coordinator.revision)
        applyConfirmed(
          variables.input.stylePostId,
          context.coordinator.confirmed,
        );
    },
    onError: (_error, variables, context) => {
      if (
        !context ||
        getSessionGeneration() !== variables.generation ||
        context.revision !== context.coordinator.revision
      )
        return;
      if (context.coordinator.confirmed)
        applyConfirmed(
          variables.input.stylePostId,
          context.coordinator.confirmed,
        );
    },
    onSettled: (_data, _error, variables, context) => {
      const isLatest =
        !context || context.revision === context.coordinator.revision;
      if (context) {
        context.coordinator.activeCount -= 1;
        releaseStyleLikeCoordinator(
          queryClient,
          `${variables.generation}:${variables.input.stylePostId}`,
          context.coordinator,
        );
      }
      if (
        !isLatest ||
        getSessionGeneration() !== variables.generation ||
        queryClient.isMutating({ mutationKey: ["style-like"] }) > 1
      )
        return;
      queryClient.invalidateQueries({ queryKey: styleQueryKeys.postsRoot() });
      queryClient.invalidateQueries({ queryKey: ["style-post"] });
    },
  });
  type Options = MutateOptions<
    StylePost,
    Error,
    Input,
    typeof mutation.context
  >;
  const wrapOptions = (
    options?: Options,
  ): Parameters<typeof mutation.mutate>[1] => ({
    onSuccess: (data, { input, generation }, result, context) => {
      if (getSessionGeneration() === generation)
        options?.onSuccess?.(data, input, result, context);
    },
    onError: (error, { input, generation }, result, context) => {
      if (getSessionGeneration() === generation)
        options?.onError?.(error, input, result, context);
    },
    onSettled: (data, error, { input, generation }, result, context) => {
      if (getSessionGeneration() === generation)
        options?.onSettled?.(data, error, input, result, context);
    },
  });
  return {
    ...mutation,
    variables: mutation.variables?.input,
    mutate: (input: Input, options?: Options) =>
      mutation.mutate(
        { input, generation: getSessionGeneration() },
        wrapOptions(options),
      ),
    mutateAsync: async (input: Input, options?: Options) => {
      const generation = getSessionGeneration();
      const data = await mutation.mutateAsync(
        { input, generation },
        wrapOptions(options),
      );
      if (getSessionGeneration() !== generation)
        throw new Error("Session changed");
      return data;
    },
  };
};

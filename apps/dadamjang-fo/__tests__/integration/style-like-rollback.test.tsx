import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { getSessionGeneration } from "@dadamjang/graphql-client";

import { likeStylePost, unlikeStylePost } from "@/features/style/api";
import { styleQueryKeys, useToggleStylePostLike } from "@/features/style/hooks";
import type { StylePost } from "@/features/style/types";

jest.mock("@/features/style/api", () => ({
  createStylePost: jest.fn(),
  getPurchasedStyleProducts: jest.fn(),
  getStylePost: jest.fn(),
  getStylePosts: jest.fn(),
  likeStylePost: jest.fn(),
  unlikeStylePost: jest.fn(),
}));

jest.mock("@dadamjang/graphql-client", () => ({
  getSessionGeneration: jest.fn(() => 0),
}));

const post: StylePost = {
  stylePostId: "style-1",
  authorId: "user-1",
  author: { userId: "user-1", userid: "buyer" },
  title: "스타일 게시물",
  content: "오늘의 스타일",
  category: "CLOTHING",
  imageUrls: ["https://example.com/style.jpg"],
  thumbnailUrl: "https://example.com/style.jpg",
  hashtags: [],
  brandTags: [],
  products: [],
  isPartner: false,
  likeCount: 2,
  isLiked: false,
  createdAt: "2026-08-12T00:00:00.000Z",
  updatedAt: "2026-08-12T00:00:00.000Z",
};

const createClient = () =>
  new QueryClient({
    defaultOptions: {
      mutations: { gcTime: Infinity, retry: false },
      queries: { gcTime: Infinity, retry: false },
    },
  });

const createWrapper = (client: QueryClient) => {
  const TestWrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  TestWrapper.displayName = "StyleLikeRollbackTestWrapper";
  return TestWrapper;
};

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
};

describe("style post like rollback", () => {
  beforeEach(() => jest.mocked(getSessionGeneration).mockReturnValue(0));

  it("does not send an old queued intent in a replacement session", async () => {
    const client = createClient();
    const flight = createDeferred<StylePost>();
    const replacementLikes = new Set([post.stylePostId]);
    jest.mocked(likeStylePost).mockReturnValueOnce(flight.promise);
    jest.mocked(unlikeStylePost).mockImplementation(async (id) => {
      replacementLikes.delete(id);
      return post;
    });
    const { result, unmount } = renderHook(useToggleStylePostLike, {
      wrapper: createWrapper(client),
    });
    let first!: Promise<unknown>;
    let second!: Promise<unknown>;
    await act(async () => {
      first = result.current
        .mutateAsync({ stylePostId: post.stylePostId, nextLiked: true })
        .catch(() => undefined);
      second = result.current
        .mutateAsync({ stylePostId: post.stylePostId, nextLiked: false })
        .catch(() => undefined);
    });
    await act(async () => {
      jest.mocked(getSessionGeneration).mockReturnValue(1);
      await client.cancelQueries();
      client.clear();
      flight.reject(new Error("session changed"));
      await Promise.all([first, second]);
    });
    expect([...replacementLikes]).toEqual([post.stylePostId]);
    unmount();
    client.clear();
  });

  it("does not restore the previous session's liked feed after clearing", async () => {
    const client = createClient();
    const flight = createDeferred<StylePost>();
    client.setQueryData(styleQueryKeys.likedPosts(), {
      pages: [
        {
          nodes: [{ ...post, isLiked: true }],
          nextCursor: null,
          hasNextPage: false,
        },
      ],
      pageParams: [undefined],
    });
    jest.mocked(unlikeStylePost).mockReturnValueOnce(flight.promise);
    const { result, unmount } = renderHook(useToggleStylePostLike, {
      wrapper: createWrapper(client),
    });
    let request!: Promise<unknown>;
    await act(async () => {
      request = result.current
        .mutateAsync({ stylePostId: post.stylePostId, nextLiked: false })
        .catch(() => undefined);
    });
    await act(async () => {
      jest.mocked(getSessionGeneration).mockReturnValue(1);
      await client.cancelQueries();
      client.clear();
      flight.reject(new Error("session changed"));
      await request;
    });
    expect(client.getQueryData(styleQueryKeys.likedPosts())).toBeUndefined();
    unmount();
    client.clear();
  });

  it("preserves another post's optimistic like when a request fails", async () => {
    const client = createClient();
    const other = { ...post, stylePostId: "style-2" };
    const firstFlight = createDeferred<StylePost>();
    const secondFlight = createDeferred<StylePost>();
    const key = styleQueryKeys.posts(undefined, "RECOMMENDED");
    client.setQueryData(key, {
      pages: [{ nodes: [post, other], nextCursor: null, hasNextPage: false }],
      pageParams: [undefined],
    });
    jest
      .mocked(likeStylePost)
      .mockReturnValueOnce(firstFlight.promise)
      .mockReturnValueOnce(secondFlight.promise);
    const { result, unmount } = renderHook(useToggleStylePostLike, {
      wrapper: createWrapper(client),
    });
    let first!: Promise<unknown>;
    let second!: Promise<unknown>;
    await act(async () => {
      first = result.current
        .mutateAsync({ stylePostId: post.stylePostId, nextLiked: true })
        .catch(() => undefined);
    });
    await act(async () => {
      second = result.current.mutateAsync({
        stylePostId: other.stylePostId,
        nextLiked: true,
      });
    });
    await act(async () => {
      firstFlight.reject(new Error("failed"));
      await first;
    });
    const pending = client.getQueryData<{ pages: { nodes: StylePost[] }[] }>(
      key,
    );
    await act(async () => {
      secondFlight.resolve({ ...other, isLiked: true, likeCount: 3 });
      await second;
    });
    expect(pending?.pages[0]?.nodes.map(({ isLiked }) => isLiked)).toEqual([
      false,
      true,
    ]);
    expect(
      client.getQueryData<{ pages: { nodes: StylePost[] }[] }>(key)?.pages[0]
        ?.nodes[1]?.likeCount,
    ).toBe(3);
    unmount();
    client.clear();
  });

  it("restores confirmed state when both consecutive intents fail", async () => {
    const client = createClient();
    const flight = createDeferred<StylePost>();
    client.setQueryData(styleQueryKeys.post(post.stylePostId), post);
    jest.mocked(likeStylePost).mockReturnValueOnce(flight.promise);
    jest
      .mocked(unlikeStylePost)
      .mockRejectedValueOnce(new Error("second failed"));
    const { result, unmount } = renderHook(useToggleStylePostLike, {
      wrapper: createWrapper(client),
    });
    let first!: Promise<unknown>;
    let second!: Promise<unknown>;
    await act(async () => {
      first = result.current
        .mutateAsync({ stylePostId: post.stylePostId, nextLiked: true })
        .catch(() => undefined);
      second = result.current
        .mutateAsync({ stylePostId: post.stylePostId, nextLiked: false })
        .catch(() => undefined);
    });
    await act(async () => {
      flight.reject(new Error("first failed"));
      await Promise.all([first, second]);
    });
    expect(client.getQueryData(styleQueryKeys.post(post.stylePostId))).toEqual(
      post,
    );
    unmount();
    client.clear();
  });

  it("restores feed and detail caches when the like request fails", async () => {
    const client = createClient();
    const feed = {
      pages: [{ nodes: [post], nextCursor: null, hasNextPage: false }],
      pageParams: [undefined],
    };
    client.setQueryData(styleQueryKeys.posts(undefined, "RECOMMENDED"), feed);
    client.setQueryData(styleQueryKeys.post(post.stylePostId), post);
    jest.mocked(likeStylePost).mockRejectedValueOnce(new Error("like failed"));
    const { result, unmount } = renderHook(useToggleStylePostLike, {
      wrapper: createWrapper(client),
    });

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          stylePostId: post.stylePostId,
          nextLiked: true,
        }),
      ).rejects.toThrow("like failed");
    });

    expect(
      client.getQueryData(styleQueryKeys.posts(undefined, "RECOMMENDED")),
    ).toEqual(feed);
    expect(client.getQueryData(styleQueryKeys.post(post.stylePostId))).toEqual(
      post,
    );
    act(() => {
      unmount();
      client.clear();
    });
  });

  it("serializes toggles for one post and prevents an older rollback", async () => {
    const client = createClient();
    const firstToggle = createDeferred<StylePost>();
    client.setQueryData(styleQueryKeys.post(post.stylePostId), post);
    jest.mocked(likeStylePost).mockReturnValueOnce(firstToggle.promise);
    jest.mocked(unlikeStylePost).mockResolvedValueOnce(post);
    const { result, unmount } = renderHook(useToggleStylePostLike, {
      wrapper: createWrapper(client),
    });
    let firstRequest!: Promise<StylePost>;
    let secondRequest!: Promise<StylePost>;

    act(() => {
      firstRequest = result.current.mutateAsync({
        stylePostId: post.stylePostId,
        nextLiked: true,
      });
      secondRequest = result.current.mutateAsync({
        stylePostId: post.stylePostId,
        nextLiked: false,
      });
    });

    await waitFor(() => expect(likeStylePost).toHaveBeenCalledTimes(1));
    expect(unlikeStylePost).not.toHaveBeenCalled();
    firstToggle.reject(new Error("like failed"));
    await expect(firstRequest).rejects.toThrow("like failed");
    await act(async () => {
      await secondRequest;
    });

    expect(unlikeStylePost).toHaveBeenCalledTimes(1);
    expect(client.getQueryData(styleQueryKeys.post(post.stylePostId))).toEqual(
      post,
    );
    act(() => {
      unmount();
      client.clear();
    });
  });

  it("coordinates one post across separate hook instances", async () => {
    const client = createClient();
    const firstToggle = createDeferred<StylePost>();
    const secondToggle = createDeferred<StylePost>();
    client.setQueryData(styleQueryKeys.post(post.stylePostId), post);
    jest
      .mocked(likeStylePost)
      .mockReturnValueOnce(firstToggle.promise)
      .mockReturnValueOnce(secondToggle.promise);
    const { result, unmount } = renderHook(
      () => ({
        detail: useToggleStylePostLike(),
        feed: useToggleStylePostLike(),
      }),
      { wrapper: createWrapper(client) },
    );
    let firstRequest!: Promise<StylePost>;
    let secondRequest!: Promise<StylePost>;

    act(() => {
      firstRequest = result.current.feed.mutateAsync({
        stylePostId: post.stylePostId,
        nextLiked: true,
      });
    });
    await waitFor(() => expect(likeStylePost).toHaveBeenCalledTimes(1));

    act(() => {
      secondRequest = result.current.detail.mutateAsync({
        stylePostId: post.stylePostId,
        nextLiked: true,
      });
    });
    await waitFor(() =>
      expect(
        client.getQueryData<StylePost>(styleQueryKeys.post(post.stylePostId))
          ?.isLiked,
      ).toBe(true),
    );
    const callsBeforeFirstSettled =
      jest.mocked(likeStylePost).mock.calls.length;

    await act(async () => {
      firstToggle.reject(new Error("older like failed"));
      await expect(firstRequest).rejects.toThrow("older like failed");
    });
    await waitFor(() => expect(likeStylePost).toHaveBeenCalledTimes(2));
    const isLikedAfterOlderFailure = client.getQueryData<StylePost>(
      styleQueryKeys.post(post.stylePostId),
    )?.isLiked;
    secondToggle.resolve({ ...post, isLiked: true, likeCount: 3 });
    await act(async () => {
      await secondRequest;
    });

    expect(callsBeforeFirstSettled).toBe(1);
    expect(isLikedAfterOlderFailure).toBe(true);
    act(() => {
      unmount();
      client.clear();
    });
  });
});

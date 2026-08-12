import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { likeStylePost } from "@/features/style/api";
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

describe("style post like rollback", () => {
  it("restores feed and detail caches when the like request fails", async () => {
    const client = createClient();
    const feed = {
      pages: [{ nodes: [post], nextCursor: null, hasNextPage: false }],
      pageParams: [undefined],
    };
    client.setQueryData(styleQueryKeys.posts(undefined, "RECOMMENDED"), feed);
    client.setQueryData(styleQueryKeys.post(post.stylePostId), post);
    jest.mocked(likeStylePost).mockRejectedValueOnce(new Error("like failed"));
    const { result, unmount } = renderHook(useToggleStylePostLike, { wrapper: createWrapper(client) });

    await act(async () => {
      await expect(result.current.mutateAsync({ stylePostId: post.stylePostId, nextLiked: true })).rejects.toThrow("like failed");
    });

    expect(client.getQueryData(styleQueryKeys.posts(undefined, "RECOMMENDED"))).toEqual(feed);
    expect(client.getQueryData(styleQueryKeys.post(post.stylePostId))).toEqual(post);
    act(() => {
      unmount();
      client.clear();
    });
  });
});

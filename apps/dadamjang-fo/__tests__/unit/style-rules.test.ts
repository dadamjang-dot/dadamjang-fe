import { styleQueryKeys, updateStylePostLike } from "@/features/style/hooks";
import {
  getStyleFeedFilter,
  getStyleMentionQuery,
  insertStyleBrandMention,
  normalizeStyleHashtag,
  validateStylePostDraft,
} from "@/features/style/rules";

describe("style post rules", () => {
  it("forces ranking to all-time popular and preserves category filters", () => {
    expect(getStyleFeedFilter("RANKING", "LATEST")).toEqual({ category: undefined, sort: "POPULAR" });
    expect(getStyleFeedFilter("CLOTHING", "LATEST")).toEqual({ category: "CLOTHING", sort: "LATEST" });
    expect(styleQueryKeys.posts("CLOTHING", "LATEST")).toEqual([
      "style-posts",
      { category: "CLOTHING", sort: "LATEST" },
    ]);
  });

  it("validates registration limits and normalizes tags", () => {
    expect(validateStylePostDraft({ content: "", productCount: 1, imageCount: 1 })).toBe("본문을 입력해 주세요.");
    expect(validateStylePostDraft({ content: "본문", productCount: 0, imageCount: 1 })).toBe("구매 상품을 1~5개 선택해 주세요.");
    expect(validateStylePostDraft({ content: "본문", productCount: 1, imageCount: 6 })).toBe("이미지를 1~5장 선택해 주세요.");
    expect(validateStylePostDraft({ content: "본문", productCount: 1, imageCount: 1 })).toBeNull();
    expect(normalizeStyleHashtag("  #daily_1 ")).toBe("daily_1");
  });

  it("parses and replaces the active brand mention", () => {
    expect(getStyleMentionQuery("오늘은 @나이")).toBe("나이");
    expect(insertStyleBrandMention("오늘은 @나이", "나이키")).toBe("오늘은 @나이키 ");
    expect(getStyleMentionQuery("브랜드 없음")).toBeNull();
  });

  it("restores the previous like state when an optimistic like rolls back", () => {
    const post = {
      stylePostId: "style-1",
      authorId: "user-1",
      author: { userId: "user-1", userid: "buyer" },
      title: "스타일 게시물",
      content: "오늘의 스타일",
      category: "CLOTHING" as const,
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
    const optimistic = updateStylePostLike(post, "style-1", true);

    expect(optimistic).toMatchObject({ isLiked: true, likeCount: 3 });
    expect(updateStylePostLike(optimistic, "style-1", false)).toEqual(post);
  });
});

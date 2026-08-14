import { styleQueryKeys } from "@/features/style/hooks";
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
    expect(validateStylePostDraft({ content: "", productCount: 1, imageCount: 1 })).toBe("스타일 소개를 입력해 주세요.");
    expect(validateStylePostDraft({ content: "본문", productCount: 0, imageCount: 1 })).toBe("구매한 상품을 1~5개 선택해 주세요.");
    expect(validateStylePostDraft({ content: "본문", productCount: 1, imageCount: 6 })).toBe("사진을 1~5장 선택해 주세요.");
    expect(validateStylePostDraft({ content: "본문", productCount: 1, imageCount: 1 })).toBeNull();
    expect(normalizeStyleHashtag("  #daily_1 ")).toBe("daily_1");
  });

  it("parses and replaces the active brand mention", () => {
    expect(getStyleMentionQuery("오늘은 @나이")).toBe("나이");
    expect(insertStyleBrandMention("오늘은 @나이", "나이키")).toBe("오늘은 @나이키 ");
    expect(getStyleMentionQuery("브랜드 없음")).toBeNull();
  });
});

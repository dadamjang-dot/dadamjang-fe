import type { StylePostCategory, StylePostSort } from "./types";

export type StyleCategoryKey = "ALL" | "RANKING" | StylePostCategory;

export const getStyleFeedFilter = (categoryKey: StyleCategoryKey, sort: StylePostSort) => ({
  category:
    categoryKey === "SNEAKERS" || categoryKey === "CLOTHING" || categoryKey === "ACCESSORIES"
      ? categoryKey
      : undefined,
  sort: categoryKey === "RANKING" ? "POPULAR" : sort,
});

export const normalizeStyleHashtag = (value: string) => value.trim().replace(/^#/, "");

export const getStyleMentionQuery = (body: string) => {
  const match = body.match(/@([^\s@]*)$/);
  return match ? match[1] : null;
};

export const insertStyleBrandMention = (body: string, brandName: string) => {
  const mention = body.match(/@([^\s@]*)$/);
  const prefix = mention ? body.slice(0, body.length - mention[0].length) : body;
  return `${prefix}@${brandName} `;
};

export const validateStylePostDraft = ({
  content,
  productCount,
  imageCount,
}: {
  content: string;
  productCount: number;
  imageCount: number;
}) => {
  if (productCount < 1 || productCount > 5) return "구매 상품을 1~5개 선택해 주세요.";
  if (imageCount < 1 || imageCount > 5) return "이미지를 1~5장 선택해 주세요.";
  const normalizedContent = content.trim();
  if (!normalizedContent) return "본문을 입력해 주세요.";
  if (normalizedContent.length > 1000) return "본문은 1000자 이하로 입력해 주세요.";
  return null;
};

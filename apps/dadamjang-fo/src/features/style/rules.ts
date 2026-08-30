import type {
  StylePostCategory,
  StylePostImageAsset,
  StylePostSort,
} from "./types";

export const unsupportedHeicStyleImageMessage =
  "HEIC/HEIF 사진은 지원하지 않아요. JPEG, PNG 또는 WebP 사진을 선택해 주세요.";

const heicStyleImageMimeTypes = new Set(["image/heic", "image/heif"]);
const heicStyleImageExtensions = new Set(["heic", "heif"]);

export const isHeicStyleImageAsset = (asset: StylePostImageAsset) => {
  const mimeType = asset.mimeType?.trim().toLowerCase();
  const extension = asset.fileName?.split(".").pop()?.trim().toLowerCase();
  return (
    (mimeType !== undefined && heicStyleImageMimeTypes.has(mimeType)) ||
    (extension !== undefined && heicStyleImageExtensions.has(extension))
  );
};

export type StyleCategoryKey = "ALL" | "RANKING" | StylePostCategory;

export const getStyleFeedFilter = (
  categoryKey: StyleCategoryKey,
  sort: StylePostSort,
) => ({
  category:
    categoryKey === "SNEAKERS" ||
    categoryKey === "CLOTHING" ||
    categoryKey === "ACCESSORIES"
      ? categoryKey
      : undefined,
  sort: categoryKey === "RANKING" ? "POPULAR" : sort,
});

export const normalizeStyleHashtag = (value: string) =>
  value.trim().replace(/^#/, "");

export const getStyleMentionQuery = (body: string) => {
  const match = body.match(/@([^\s@]*)$/);
  return match?.[1] ?? null;
};

export const insertStyleBrandMention = (body: string, brandName: string) => {
  const mention = body.match(/@([^\s@]*)$/);
  const prefix = mention
    ? body.slice(0, body.length - mention[0].length)
    : body;
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
  if (productCount < 1 || productCount > 5)
    return "구매한 상품을 1~5개 선택해 주세요.";
  if (imageCount < 1 || imageCount > 5) return "사진을 1~5장 선택해 주세요.";
  const normalizedContent = content.trim();
  if (!normalizedContent) return "스타일 소개를 입력해 주세요.";
  if (normalizedContent.length > 1000)
    return "스타일 소개는 1,000자 이하로 입력해 주세요.";
  return null;
};

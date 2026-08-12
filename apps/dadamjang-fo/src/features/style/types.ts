export type StylePostCategory = "SNEAKERS" | "CLOTHING" | "ACCESSORIES";
export type StylePostSort = "RECOMMENDED" | "POPULAR" | "LATEST";

export type StylePostFilter = {
  category?: StylePostCategory;
  sort?: StylePostSort;
};

export type StylePostAuthor = {
  userId: string;
  userid: string;
};

export type StylePostBrandTag = {
  brandId: string;
  name: string;
};

export type StylePostProduct = {
  productId: string;
  title: string;
  imageUrls: string[];
  brandId: string | null;
  brandName: string | null;
  categoryId: string;
};

export type PurchasedStyleProduct = StylePostProduct & {
  lastPurchasedAt: string;
};

export type StylePost = {
  stylePostId: string;
  authorId: string;
  author: StylePostAuthor;
  title: string;
  content: string;
  category: StylePostCategory;
  imageUrls: string[];
  thumbnailUrl: string | null;
  hashtags: string[];
  brandTags: StylePostBrandTag[];
  products: StylePostProduct[];
  isPartner: boolean;
  likeCount: number;
  isLiked: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StylePostConnection = {
  nodes: StylePost[];
  nextCursor: string | null;
  hasNextPage: boolean;
};

export type CreateStylePostInput = {
  category: StylePostCategory;
  productIds: string[];
  imageKeys: string[];
  content: string;
  hashtags: string[];
  brandTagIds: string[];
  idempotencyKey: string;
};

export type StylePostImageAsset = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
};

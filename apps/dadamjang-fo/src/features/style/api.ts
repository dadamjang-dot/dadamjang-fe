import { graphqlRequest } from "@dadamjang/graphql-client";

import type {
  CreateStylePostInput,
  PurchasedStyleProduct,
  StylePostConnection,
  StylePostFilter,
  StylePostImageAsset,
  StylePost,
} from "./types";

const stylePostFields = `
  stylePostId authorId title content category imageUrls thumbnailUrl hashtags isPartner likeCount isLiked createdAt updatedAt
  author { userId userid }
  brandTags { brandId name }
  products { productId title imageUrls brandId brandName categoryId }
`;

export const getStylePosts = async ({
  filter,
  after,
  first = 20,
}: {
  filter: StylePostFilter;
  after?: string;
  first?: number;
}): Promise<StylePostConnection> => {
  const data = await graphqlRequest<{ stylePosts: StylePostConnection }>(
    `query StylePosts($filter: StylePostFilterInput, $first: Int, $after: String) {
      stylePosts(filter: $filter, first: $first, after: $after) {
        nodes { ${stylePostFields} }
        nextCursor
        hasNextPage
      }
    }`,
    { filter, first, after },
  );
  return data.stylePosts;
};

export const getStylePost = async (stylePostId: string): Promise<StylePost> => {
  const data = await graphqlRequest<{ stylePost: StylePost }>(
    `query StylePost($stylePostId: String!) {
      stylePost(stylePostId: $stylePostId) { ${stylePostFields} }
    }`,
    { stylePostId },
  );
  return data.stylePost;
};

export const getPurchasedStyleProducts = async (): Promise<PurchasedStyleProduct[]> => {
  const data = await graphqlRequest<{ purchasedStyleProducts: PurchasedStyleProduct[] }>(
    `query PurchasedStyleProducts {
      purchasedStyleProducts { productId title imageUrls brandId brandName categoryId lastPurchasedAt }
    }`,
  );
  return data.purchasedStyleProducts;
};

type ImageUploadTarget = {
  key: string;
  uploadUrl: string;
  imageUrl: string;
};

const imageContentType = (asset: StylePostImageAsset) =>
  asset.mimeType?.toLowerCase() ??
  (asset.fileName?.toLowerCase().endsWith(".heic") || asset.fileName?.toLowerCase().endsWith(".heif")
    ? "image/heic"
    : "image/jpeg");

const imageFilename = (asset: StylePostImageAsset, index: number) => asset.fileName ?? `style-post-${index}.jpg`;

export const uploadStylePostImage = async (asset: StylePostImageAsset, index: number): Promise<string> => {
  const contentType = imageContentType(asset);
  const filename = imageFilename(asset, index);
  const fileResponse = await fetch(asset.uri);
  if (!fileResponse.ok) throw new Error("이미지 파일을 불러오지 못했어요.");
  const file = await fileResponse.blob();
  const data = await graphqlRequest<{ createStylePostImageUpload: ImageUploadTarget }>(
    `mutation CreateStylePostImageUpload($input: CreateStylePostImageUploadInput!) {
      createStylePostImageUpload(input: $input) { key uploadUrl imageUrl }
    }`,
    { input: { filename, contentType, fileSize: asset.fileSize ?? file.size } },
  );
  const response = await fetch(data.createStylePostImageUpload.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });
  if (!response.ok) throw new Error("이미지 업로드에 실패했어요.");
  return data.createStylePostImageUpload.key;
};

export const createStylePost = async (input: CreateStylePostInput): Promise<StylePost> => {
  const data = await graphqlRequest<{ createStylePost: StylePost }>(
    `mutation CreateStylePost($input: CreateStylePostInput!) {
      createStylePost(input: $input) { ${stylePostFields} }
    }`,
    { input },
  );
  return data.createStylePost;
};

export const likeStylePost = async (stylePostId: string): Promise<StylePost> => {
  const data = await graphqlRequest<{ likeStylePost: StylePost }>(
    `mutation LikeStylePost($stylePostId: String!) {
      likeStylePost(stylePostId: $stylePostId) { ${stylePostFields} }
    }`,
    { stylePostId },
  );
  return data.likeStylePost;
};

export const unlikeStylePost = async (stylePostId: string): Promise<StylePost> => {
  const data = await graphqlRequest<{ unlikeStylePost: StylePost }>(
    `mutation UnlikeStylePost($stylePostId: String!) {
      unlikeStylePost(stylePostId: $stylePostId) { ${stylePostFields} }
    }`,
    { stylePostId },
  );
  return data.unlikeStylePost;
};

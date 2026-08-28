import { graphqlRequest } from "@dadamjang/graphql-client";
import { File } from "expo-file-system";

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

export const getStylePosts = async (
  {
    filter,
    after,
    first = 20,
  }: {
    filter: StylePostFilter;
    after?: string;
    first?: number;
  },
  signal?: AbortSignal,
): Promise<StylePostConnection> => {
  const data = await graphqlRequest<{ stylePosts: StylePostConnection }>(
    `query StylePosts($filter: StylePostFilterInput, $first: Int, $after: String) {
      stylePosts(filter: $filter, first: $first, after: $after) {
        nodes { ${stylePostFields} }
        nextCursor
        hasNextPage
      }
    }`,
    { filter, first, after },
    { signal },
  );
  return data.stylePosts;
};

export const getStylePost = async (
  stylePostId: string,
  signal?: AbortSignal,
): Promise<StylePost> => {
  const data = await graphqlRequest<{ stylePost: StylePost }>(
    `query StylePost($stylePostId: String!) {
      stylePost(stylePostId: $stylePostId) { ${stylePostFields} }
    }`,
    { stylePostId },
    { signal },
  );
  return data.stylePost;
};

export const getLikedStylePosts = async (
  {
    after,
    first = 20,
  }: {
    after?: string;
    first?: number;
  },
  signal?: AbortSignal,
): Promise<StylePostConnection> => {
  const data = await graphqlRequest<{ likedStylePosts: StylePostConnection }>(
    `query LikedStylePosts($first: Int, $after: String) {
      likedStylePosts(first: $first, after: $after) {
        nodes { ${stylePostFields} }
        nextCursor
        hasNextPage
      }
    }`,
    { first, after },
    { signal },
  );
  return data.likedStylePosts;
};

export const getPurchasedStyleProducts = async (
  signal?: AbortSignal,
): Promise<PurchasedStyleProduct[]> => {
  const data = await graphqlRequest<{
    purchasedStyleProducts: PurchasedStyleProduct[];
  }>(
    `query PurchasedStyleProducts {
      purchasedStyleProducts { productId title imageUrls brandId brandName categoryId lastPurchasedAt }
    }`,
    undefined,
    { signal },
  );
  return data.purchasedStyleProducts;
};

type ImageUploadTarget = {
  key: string;
  uploadUrl: string;
  imageUrl: string;
};

const maxStylePostImageSize = 10 * 1024 * 1024;
const oversizedStylePostImageMessage = "이미지는 10 MiB 이하로 선택해 주세요.";
const unsupportedStylePostImageMessage = "지원하지 않는 이미지 형식이에요.";
const stylePostImageExtensions = {
  "image/heic": "heic",
  "image/heif": "heif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;
type StylePostImageContentType = keyof typeof stylePostImageExtensions;
const stylePostImageContentTypes = new Set<StylePostImageContentType>(
  Object.keys(stylePostImageExtensions) as StylePostImageContentType[],
);
const stylePostImageTypeByExtension: Record<string, StylePostImageContentType> =
  {
    heic: "image/heic",
    heif: "image/heif",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };

const imageContentType = (
  asset: StylePostImageAsset,
  file: File,
): StylePostImageContentType => {
  const declaredType = (asset.mimeType || file.type).trim().toLowerCase();
  const normalizedType =
    declaredType === "image/jpg" ? "image/jpeg" : declaredType;
  if (normalizedType) {
    if (
      stylePostImageContentTypes.has(
        normalizedType as StylePostImageContentType,
      )
    )
      return normalizedType as StylePostImageContentType;
    throw new Error(unsupportedStylePostImageMessage);
  }
  const extension = asset.fileName?.split(".").pop()?.toLowerCase();
  const inferredType = extension
    ? stylePostImageTypeByExtension[extension]
    : undefined;
  if (!inferredType) throw new Error(unsupportedStylePostImageMessage);
  return inferredType;
};

const imageFilename = (
  asset: StylePostImageAsset,
  index: number,
  contentType: StylePostImageContentType,
) =>
  asset.fileName ??
  `style-post-${index}.${stylePostImageExtensions[contentType]}`;

export const uploadStylePostImage = async (
  asset: StylePostImageAsset,
  index: number,
): Promise<string> => {
  if (
    asset.fileSize !== null &&
    asset.fileSize !== undefined &&
    asset.fileSize > maxStylePostImageSize
  )
    throw new Error(oversizedStylePostImageMessage);
  const file = new File(asset.uri);
  const contentType = imageContentType(asset, file);
  const filename = imageFilename(asset, index, contentType);
  if (!Number.isSafeInteger(file.size) || file.size <= 0)
    throw new Error("이미지 파일을 불러오지 못했어요.");
  if (file.size > maxStylePostImageSize)
    throw new Error(oversizedStylePostImageMessage);
  const data = await graphqlRequest<{
    createStylePostImageUpload: ImageUploadTarget;
  }>(
    `mutation CreateStylePostImageUpload($input: CreateStylePostImageUploadInput!) {
      createStylePostImageUpload(input: $input) { key uploadUrl imageUrl }
    }`,
    { input: { filename, contentType, fileSize: file.size } },
  );
  const response = await file.upload(
    data.createStylePostImageUpload.uploadUrl,
    {
      httpMethod: "PUT",
      headers: { "Content-Type": contentType },
      mimeType: contentType,
    },
  );
  if (response.status < 200 || response.status >= 300)
    throw new Error("이미지 업로드에 실패했어요.");
  return data.createStylePostImageUpload.key;
};

export const createStylePost = async (
  input: CreateStylePostInput,
): Promise<StylePost> => {
  const data = await graphqlRequest<{ createStylePost: StylePost }>(
    `mutation CreateStylePost($input: CreateStylePostInput!) {
      createStylePost(input: $input) { ${stylePostFields} }
    }`,
    { input },
  );
  return data.createStylePost;
};

export const likeStylePost = async (
  stylePostId: string,
): Promise<StylePost> => {
  const data = await graphqlRequest<{ likeStylePost: StylePost }>(
    `mutation LikeStylePost($stylePostId: String!) {
      likeStylePost(stylePostId: $stylePostId) { ${stylePostFields} }
    }`,
    { stylePostId },
  );
  return data.likeStylePost;
};

export const unlikeStylePost = async (
  stylePostId: string,
): Promise<StylePost> => {
  const data = await graphqlRequest<{ unlikeStylePost: StylePost }>(
    `mutation UnlikeStylePost($stylePostId: String!) {
      unlikeStylePost(stylePostId: $stylePostId) { ${stylePostFields} }
    }`,
    { stylePostId },
  );
  return data.unlikeStylePost;
};

import {
  act,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import type { ReactNode } from "react";
import type { PressableProps } from "react-native";

import StyleComposer from "@/features/style/components/style-composer";
import type { StylePostImageAsset } from "@/features/style/types";

const mockCreateStylePost = jest.fn();
const mockUploadStylePostImage = jest.fn();
const mockClose = jest.fn();
const mockLaunchImageLibrary = jest.fn();
const mockRequestMediaLibraryPermissions = jest.fn();
let mockSubmitPress: (() => void) | undefined;

jest.mock("expo-image", () => ({ Image: "ExpoImage" }));

jest.mock("@/features/style/components/style-image-picker", () => ({
  loadStyleImagePicker: async () => ({
    launchImageLibraryAsync: (...args: unknown[]) =>
      mockLaunchImageLibrary(...args),
    requestMediaLibraryPermissionsAsync: (...args: unknown[]) =>
      mockRequestMediaLibraryPermissions(...args),
  }),
}));

jest.mock("@/features/style/api", () => ({
  uploadStylePostImage: (...args: unknown[]) =>
    mockUploadStylePostImage(...args),
}));

jest.mock("@/features/style/hooks", () => ({
  useCreateStylePost: () => ({
    isPending: false,
    mutateAsync: mockCreateStylePost,
  }),
  usePurchasedStyleProducts: () => ({
    data: [
      {
        productId: "product-1",
        title: "테스트 상품",
        imageUrls: [],
        brandId: "brand-1",
        brandName: "테스트 브랜드",
        categoryId: "category-1",
        lastPurchasedAt: "2026-08-29T00:00:00.000Z",
      },
    ],
    isError: false,
    isLoading: false,
  }),
}));

jest.mock("@/shared/components", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const ReactNative = jest.requireActual<typeof import("react-native")>(
    "react-native",
  );

  return {
    Button: ({
      accessibilityLabel,
      accessibilityRole,
      accessibilityState,
      children,
      disabled,
      label,
      onPress,
    }: {
      accessibilityLabel?: string;
      accessibilityRole?: PressableProps["accessibilityRole"];
      accessibilityState?: PressableProps["accessibilityState"];
      children?: ReactNode;
      disabled?: boolean;
      label?: string;
      onPress: () => void;
    }) => {
      if (label === "스타일 올리기") mockSubmitPress = onPress;
      return React.createElement(
        ReactNative.Pressable,
        {
          accessibilityLabel: accessibilityLabel ?? label,
          accessibilityRole: accessibilityRole ?? "button",
          accessibilityState: accessibilityState ?? { disabled },
          disabled,
          onPress: disabled ? undefined : onPress,
        },
        children ?? React.createElement(ReactNative.Text, null, label),
      );
    },
    TitleHeader: ({
      children,
      title,
    }: {
      children?: ReactNode;
      title: string;
    }) =>
      React.createElement(
        ReactNative.View,
        null,
        React.createElement(ReactNative.Text, null, title),
        children,
      ),
  };
});

const imageAsset = (index: number): StylePostImageAsset => ({
  uri: `file:///style-${index}.jpg`,
  fileName: `style-${index}.jpg`,
  fileSize: 1024 * index,
  mimeType: "image/jpeg",
});

const createDeferred = <T,>() => {
  let resolve: ((value: T) => void) | undefined;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return {
    promise,
    resolve: (value: T) => resolve?.(value),
  };
};

const prepareValidDraft = async (assets: StylePostImageAsset[]) => {
  mockLaunchImageLibrary.mockResolvedValue({
    assets: assets.map((asset) => ({
      ...asset,
      assetId: null,
      base64: null,
      duration: null,
      exif: null,
      height: 100,
      pairedVideoAsset: null,
      type: "image",
      width: 100,
    })),
    canceled: false,
  });
  const user = userEvent.setup();
  render(<StyleComposer onClose={mockClose} />);

  await user.press(screen.getByRole("button", { name: "상품 고르기" }));
  await user.press(
    await screen.findByRole("button", { name: /테스트 상품/ }),
  );
  await user.press(screen.getByRole("button", { name: "완료" }));
  await user.press(screen.getByRole("button", { name: "사진 추가" }));
  expect(mockRequestMediaLibraryPermissions).toHaveBeenCalledTimes(1);
  expect(mockLaunchImageLibrary).toHaveBeenCalledTimes(1);
  expect(await screen.findAllByLabelText("사진 삭제")).toHaveLength(
    assets.length,
  );
  await user.type(
    screen.getByLabelText("스타일 소개"),
    "오늘의 테스트 스타일",
  );
  return user;
};

describe("style composer upload flow", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockRequestMediaLibraryPermissions.mockResolvedValue({
      canAskAgain: true,
      expires: "never",
      granted: true,
      status: "granted",
    });
    mockCreateStylePost.mockResolvedValue({ stylePostId: "style-1" });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("uploads selected images sequentially before creating the post", async () => {
    const firstUpload = createDeferred<string>();
    mockUploadStylePostImage.mockImplementation(
      (_asset: StylePostImageAsset, index: number) =>
        index === 0 ? firstUpload.promise : Promise.resolve("image-key-2"),
    );
    const user = await prepareValidDraft([imageAsset(1), imageAsset(2)]);

    await user.press(
      screen.getByRole("button", { name: "스타일 올리기" }),
    );
    const startedIndexes = mockUploadStylePostImage.mock.calls.map(
      ([, index]) => index,
    );
    firstUpload.resolve("image-key-1");

    expect(startedIndexes).toEqual([0]);
    await waitFor(() => {
      expect(mockCreateStylePost).toHaveBeenCalledTimes(1);
    });
    expect(mockCreateStylePost).toHaveBeenCalledWith(
      expect.objectContaining({
        imageKeys: ["image-key-1", "image-key-2"],
      }),
    );
  });

  it("locks submission synchronously across rapid duplicate presses", async () => {
    const upload = createDeferred<string>();
    mockUploadStylePostImage.mockReturnValue(upload.promise);
    await prepareValidDraft([imageAsset(1)]);
    const submitPress = mockSubmitPress;
    expect(submitPress).toBeDefined();

    act(() => {
      submitPress?.();
      submitPress?.();
    });
    const uploadCallCount = mockUploadStylePostImage.mock.calls.length;
    upload.resolve("image-key-1");

    expect(uploadCallCount).toBe(1);
    await waitFor(() => {
      expect(mockCreateStylePost).toHaveBeenCalledTimes(1);
    });
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

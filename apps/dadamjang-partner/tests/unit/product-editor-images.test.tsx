import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { createElement } from "react";
import { flushSync } from "react-dom";
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  ImgHTMLAttributes,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProductEditorPage } from "@/_pages/product-editor";
import type { PartnerProduct, ProductInput } from "@/shared/api";

const api = vi.hoisted(() => ({ create: vi.fn(), save: vi.fn() }));
const navigation = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("next/image", () => ({
  default: ({
    unoptimized,
    ...props
  }: ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) =>
    createElement("img", { ...props, "data-unoptimized": unoptimized }),
}));
vi.mock("@seed-design/react", () => ({
  ActionButton: ({
    loading,
    variant,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & {
    loading?: boolean;
    variant?: string;
  }) =>
    createElement("button", {
      ...props,
      "data-loading": loading,
      "data-variant": variant,
    }),
  TextField: {
    Root: (props: HTMLAttributes<HTMLDivElement>) =>
      createElement("div", props),
    Input: (props: InputHTMLAttributes<HTMLInputElement>) =>
      createElement("input", props),
    Textarea: (props: TextareaHTMLAttributes<HTMLTextAreaElement>) =>
      createElement("textarea", props),
  },
}));
vi.mock("@/shared/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api")>()),
  createImageUpload: api.create,
  saveProduct: api.save,
}));

const product: PartnerProduct = {
  productId: "product-1",
  partnerId: "partner-1",
  brandId: "brand-1",
  brand: { brandId: "brand-1", name: "브랜드", slug: "brand" },
  categoryId: "tops",
  title: "셔츠",
  description: "상품 설명",
  imageKeys: ["a", "b"],
  imageUrls: ["https://images.test/a", "https://images.test/b"],
  status: "DRAFT",
  approvalStatus: "DRAFT",
  rejectionReason: null,
  isOnSale: true,
  isExpressDelivery: false,
  skus: [
    {
      skuId: "sku-1",
      code: "SHIRT",
      colorId: null,
      sizeId: null,
      optionName: "기본",
      price: 1000,
      stock: 2,
    },
  ],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

class UploadRequest extends EventTarget {
  static requests: UploadRequest[] = [];
  upload = new EventTarget();
  status = 0;
  onabort: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  open = () => {};
  setRequestHeader = () => {};
  send = () => UploadRequest.requests.push(this);
  abort = () => this.onabort?.();
  finish = (status = 204) => {
    this.status = status;
    this.dispatchEvent(new Event("load"));
  };
}

type UploadTarget = {
  createProductImageUpload: {
    key: string;
    uploadUrl: string;
    originalUrl: string;
    imageUrl: string;
  };
};
const presigns = new Map<
  string,
  ReturnType<typeof Promise.withResolvers<UploadTarget>>
>();
let client: QueryClient;

const mount = () =>
  render(
    <QueryClientProvider client={client}>
      <ProductEditorPage productId="product-1" />
    </QueryClientProvider>,
  );
const selectFiles = (input: HTMLElement, names: string[]) => {
  for (const name of names)
    presigns.set(name, Promise.withResolvers<UploadTarget>());
  fireEvent.change(input, {
    target: {
      files: names.map((name) => new File([name], name, { type: "image/png" })),
    },
  });
};
const releasePresign = async (name: string) => {
  await act(async () => {
    presigns.get(name)!.resolve({
      createProductImageUpload: {
        key: name,
        uploadUrl: `https://upload.test/${name}`,
        originalUrl: `https://images.test/${name}`,
        imageUrl: `https://images.test/${name}`,
      },
    });
  });
  return UploadRequest.requests.at(-1)!;
};

describe("product editor image lifecycle", () => {
  beforeEach(() => {
    api.create.mockReset();
    api.save.mockReset();
    presigns.clear();
    UploadRequest.requests = [];
    vi.stubGlobal("XMLHttpRequest", UploadRequest);
    vi.stubGlobal(
      "URL",
      class extends URL {
        static override createObjectURL = (file: File) => `blob:${file.name}`;
        static override revokeObjectURL = vi.fn();
      },
    );
    api.create.mockImplementation(
      ({ filename }: { filename: string }) => presigns.get(filename)!.promise,
    );
    api.save.mockImplementation(async (_id: string, input: ProductInput) => ({
      updatePartnerProductDraft: { ...product, ...input },
    }));
    client = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false } },
    });
    client.setQueryData(["product", "product-1"], {
      myPartnerProduct: product,
    });
    client.setQueryData(["catalog-options"], {
      catalogFilterOptions: {
        categories: [{ categoryId: "tops", name: "상의" }],
        colors: [],
        sizes: [],
      },
    });
    client.setQueryData(["my-partner"], {
      myPartner: { brand: product.brand },
    });
  });

  afterEach(() => {
    cleanup();
    client.clear();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("blocks save and direct submission from selection through queued uploads", async () => {
    const view = mount();
    selectFiles(view.getByLabelText("이미지 선택"), [
      "one",
      "two",
      "three",
      "four",
    ]);

    expect.soft(view.getByRole("button", { name: "임시 저장" })).toBeDisabled();
    expect.soft(view.getByRole("button", { name: "심사 요청" })).toBeDisabled();
    await act(async () =>
      fireEvent.submit(view.container.querySelector("form")!),
    );
    expect.soft(api.save).not.toHaveBeenCalled();

    for (const name of ["three", "two", "one"]) {
      const request = await releasePresign(name);
      await act(async () => request.finish());
    }
    expect.soft(view.getByRole("button", { name: "임시 저장" })).toBeDisabled();

    const request = await releasePresign("four");
    await act(async () =>
      request.upload.dispatchEvent(
        new ProgressEvent("progress", {
          lengthComputable: true,
          loaded: 10,
          total: 10,
        }),
      ),
    );
    expect.soft(view.getByRole("button", { name: "임시 저장" })).toBeDisabled();
    await act(async () => request.finish());
    expect(view.getByRole("button", { name: "임시 저장" })).toBeEnabled();
    await act(async () =>
      fireEvent.click(view.getByRole("button", { name: "임시 저장" })),
    );
    expect(api.save).toHaveBeenLastCalledWith(
      "product-1",
      expect.objectContaining({
        imageKeys: ["a", "b", "one", "two", "three", "four"],
      }),
    );
  });

  it("preserves the chosen cover and selection order when presigns finish out of order", async () => {
    const view = mount();
    fireEvent.click(view.getAllByRole("button", { name: "앞으로" })[1]!);
    selectFiles(view.getByLabelText("이미지 선택"), ["one", "two"]);
    for (const name of ["two", "one"]) {
      const request = await releasePresign(name);
      await act(async () => request.finish());
    }
    expect(
      view.getAllByRole("img").map((image) => image.getAttribute("src")),
    ).toEqual([
      "https://images.test/b",
      "https://images.test/a",
      "blob:one",
      "blob:two",
    ]);
    await act(async () =>
      fireEvent.click(view.getByRole("button", { name: "임시 저장" })),
    );
    expect(api.save).toHaveBeenCalledWith(
      "product-1",
      expect.objectContaining({
        imageKeys: ["b", "a", "one", "two"],
      }),
    );
  });

  it("enables saving only when successful upload commits its storage key", async () => {
    const view = mount();
    selectFiles(view.getByLabelText("이미지 선택"), ["one"]);
    const request = await releasePresign("one");

    await act(async () => {
      flushSync(() => request.finish());
      expect(view.getByRole("button", { name: "임시 저장" })).toBeDisabled();
    });

    expect(view.getByRole("button", { name: "임시 저장" })).toBeEnabled();
    await act(async () => {
      fireEvent.click(view.getByRole("button", { name: "임시 저장" }));
    });
    expect(api.save).toHaveBeenCalledWith(
      "product-1",
      expect.objectContaining({ imageKeys: ["a", "b", "one"] }),
    );
  });
});

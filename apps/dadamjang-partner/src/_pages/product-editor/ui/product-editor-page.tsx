"use client";
import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { ActionButton } from "@seed-design/react";
import { PartnerTextarea, PartnerTextField } from "@/shared/ui";
import {
  catalogOptions,
  createImageUpload,
  getProduct,
  publishProduct,
  saveProduct,
  submitProduct,
  ProductInput,
  uploadFile,
} from "@/shared/api";
import { effectiveProductState, isProductEditable } from "@/entities/product";
import { myPartner } from "@/shared/auth";
type ImageItem = {
  key: string;
  preview: string;
  local: boolean;
  progress: number;
  order: number;
};
type Sku = ProductInput["skus"][number] & { identity: string };
type SkuPatch = Partial<Omit<Sku, "identity">>;
const UNSAVED_CHANGES_MESSAGE =
  "저장하지 않은 변경사항이 있습니다. 이동할까요?";
const HISTORY_GUARD_KEY = "__dadamjangProductEditorGuard";
const MAX_CONCURRENT_UPLOADS = 3;
let nextSkuIdentity = 0;
const emptySku = (): Sku => ({
  identity: `new-sku-${nextSkuIdentity++}`,
  code: "",
  colorId: "",
  sizeId: "",
  optionName: "",
  price: 0,
  stock: 0,
});
const moveItem = <T, K extends keyof T>(
  items: T[],
  identityKey: K,
  identity: T[K],
  direction: -1 | 1,
) => {
  const from = items.findIndex((item) => item[identityKey] === identity);
  const to = from + direction;
  const item = items[from];
  if (item === undefined || to < 0 || to >= items.length) return items;
  const next = [...items];
  next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};
export const ProductEditorPage = ({ productId }: { productId?: string }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const existing = useQuery({
    queryKey: ["product", productId],
    queryFn: productId ? () => getProduct(productId) : skipToken,
  });
  const options = useQuery({
    queryKey: ["catalog-options"],
    queryFn: catalogOptions,
  });
  const partner = useQuery({ queryKey: ["my-partner"], queryFn: myPartner });
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategory] = useState("");
  const [images, setImages] = useState<ImageItem[]>([]);
  const imageRef = useRef<ImageItem[]>([]);
  const occupiedImageKeys = useRef(new Set<string>());
  const pendingImageSlots = useRef(0);
  const nextImageOrder = useRef(0);
  const uploadControllers = useRef(new Map<string, AbortController>());
  const mounted = useRef(true);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [skus, setSkus] = useState<Sku[]>([emptySku()]);
  const [sale, setSale] = useState(false);
  const [express, setExpress] = useState(false);
  const [error, setError] = useState(
    () => searchParams.get("submitError") ?? "",
  );
  const [confirm, setConfirm] = useState(false);
  const [publishPending, setPublishPending] = useState(false);
  const dirty = useRef(false);
  const hydrated = useRef(false);
  const historyGuardArmed = useRef(false);
  const markDirty = useCallback(() => {
    dirty.current = true;
    if (historyGuardArmed.current) return;
    historyGuardArmed.current = true;
    const currentState =
      typeof history.state === "object" && history.state !== null
        ? history.state
        : {};
    history.pushState(
      { ...currentState, [HISTORY_GUARD_KEY]: true },
      "",
      location.href,
    );
  }, []);
  useEffect(() => {
    const p = existing.data?.myPartnerProduct;
    if (!p || existing.isFetching || hydrated.current) return;
    hydrated.current = true;
    setTitle(p.title);
    setDescription(p.description);
    setCategory(p.categoryId);
    occupiedImageKeys.current = new Set(p.imageKeys);
    nextImageOrder.current = p.imageKeys.length;
    setImages(
      p.imageKeys.map((key, i) => ({
        key,
        preview: p.imageUrls[i] ?? "",
        local: false,
        progress: 100,
        order: i,
      })),
    );
    setSkus(
      p.skus.map((s) => ({
        identity: s.skuId,
        code: s.code,
        colorId: s.colorId ?? "",
        sizeId: s.sizeId ?? "",
        optionName: s.optionName,
        price: s.price,
        stock: s.stock,
      })),
    );
    setSale(p.isOnSale);
    setExpress(p.isExpressDelivery);
  }, [existing.data, existing.isFetching]);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (!dirty.current) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, []);
  useEffect(() => {
    const guard = (event: MouseEvent) => {
      const anchor =
        event.target instanceof Element ? event.target.closest("a") : null;
      if (
        !dirty.current ||
        !anchor?.href ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      )
        return;
      if (!window.confirm(UNSAVED_CHANGES_MESSAGE)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      dirty.current = false;
      if (!historyGuardArmed.current) return;
      event.preventDefault();
      event.stopPropagation();
      historyGuardArmed.current = false;
      const target = new URL(anchor.href);
      if (target.origin === location.origin)
        router.replace(`${target.pathname}${target.search}${target.hash}`);
      else location.replace(target.href);
    };
    document.addEventListener("click", guard, true);
    return () => document.removeEventListener("click", guard, true);
  }, [router]);
  useEffect(() => {
    const guard = () => {
      if (!historyGuardArmed.current) return;
      historyGuardArmed.current = false;
      if (!dirty.current) return;
      if (window.confirm(UNSAVED_CHANGES_MESSAGE)) {
        dirty.current = false;
        history.back();
        return;
      }
      markDirty();
    };
    window.addEventListener("popstate", guard, true);
    return () => window.removeEventListener("popstate", guard, true);
  }, [markDirty]);
  useEffect(() => {
    imageRef.current = images;
  }, [images]);
  useEffect(() => {
    const controllers = uploadControllers.current;
    mounted.current = true;
    return () => {
      mounted.current = false;
      controllers.forEach((controller) => controller.abort());
      imageRef.current
        .filter((x) => x.local)
        .forEach((x) => URL.revokeObjectURL(x.preview));
    };
  }, []);
  useEffect(() => {
    if (!confirm) return;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const focusable = () =>
      Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          "button:not([disabled])",
        ) ?? [],
      );
    focusable()[0]?.focus();
    const guard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setConfirm(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", guard);
    return () => {
      document.removeEventListener("keydown", guard);
      previous?.focus();
    };
  }, [confirm]);
  const editable =
    !productId ||
    (!!existing.data &&
      isProductEditable(effectiveProductState(existing.data.myPartnerProduct)));
  const invalidateProductCaches = (id: string) =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["products"] }),
      qc.invalidateQueries({ queryKey: ["dashboard"] }),
      qc.invalidateQueries({
        queryKey: ["product", id],
        refetchType: "none",
      }),
    ]);
  const addFiles = async (files: FileList | File[]) => {
    setError("");
    const tasks: Array<{ file: File; preview: string; order: number }> = [];
    for (const file of Array.from(files)) {
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 10 * 1024 * 1024
      ) {
        setError(
          "JPEG, PNG, WebP 형식의 10 MiB 이하 이미지만 등록할 수 있습니다.",
        );
        continue;
      }
      if (occupiedImageKeys.current.size + pendingImageSlots.current >= 10) {
        setError("이미지는 최대 10장까지 등록할 수 있습니다.");
        continue;
      }
      const preview = URL.createObjectURL(file);
      pendingImageSlots.current += 1;
      tasks.push({ file, preview, order: nextImageOrder.current++ });
    }
    let nextTask = 0;
    const uploadNext = async () => {
      while (nextTask < tasks.length) {
        const task = tasks[nextTask++];
        if (!task) return;
        const { file, preview, order } = task;
        let pendingSlot = true;
        const releasePendingSlot = () => {
          if (!pendingSlot) return;
          pendingImageSlots.current -= 1;
          pendingSlot = false;
        };
        let controller: AbortController | undefined;
        let uploadKey: string | undefined;
        let uploadSucceeded = false;
        try {
          if (!mounted.current) continue;
          const { createProductImageUpload: u } = await createImageUpload({
            filename: file.name,
            contentType: file.type,
            fileSize: file.size,
          });
          releasePendingSlot();
          if (!mounted.current) continue;
          uploadKey = u.key;
          occupiedImageKeys.current.add(uploadKey);
          controller = new AbortController();
          uploadControllers.current.set(u.key, controller);
          setImages((value) =>
            [
              ...value,
              { key: u.key, preview, local: true, progress: 0, order },
            ].sort((left, right) => left.order - right.order),
          );
          try {
            await uploadFile(
              u.uploadUrl,
              file,
              (progress) => {
                if (!mounted.current) return;
                setImages((value) =>
                  value.map((item) =>
                    item.key === u.key ? { ...item, progress } : item,
                  ),
                );
              },
              controller.signal,
            );
            uploadSucceeded = true;
          } finally {
            uploadControllers.current.delete(u.key);
          }
          if (mounted.current) markDirty();
        } catch (e) {
          if (uploadKey) occupiedImageKeys.current.delete(uploadKey);
          if (mounted.current) {
            setImages((value) =>
              value.filter((item) => item.preview !== preview),
            );
            if (!controller?.signal.aborted)
              setError(
                e instanceof Error
                  ? e.message
                  : "이미지 업로드에 실패했습니다.",
              );
          }
        } finally {
          releasePendingSlot();
          if (!uploadSucceeded) URL.revokeObjectURL(preview);
        }
      }
    };
    await Promise.all(
      Array.from(
        { length: Math.min(MAX_CONCURRENT_UPLOADS, tasks.length) },
        uploadNext,
      ),
    );
  };
  const removeImage = (key: string) =>
    setImages((v) => {
      const index = v.findIndex((item) => item.key === key);
      const item = v[index];
      if (!item) return v;
      occupiedImageKeys.current.delete(item.key);
      uploadControllers.current.get(item.key)?.abort();
      if (item.local) URL.revokeObjectURL(item.preview);
      markDirty();
      return v.filter((_, currentIndex) => currentIndex !== index);
    });
  const moveImage = (key: string, direction: -1 | 1) =>
    setImages((v) => {
      const next = moveItem(v, "key", key, direction);
      if (next === v) return v;
      markDirty();
      return next;
    });
  const moveSku = (identity: string, direction: -1 | 1) =>
    setSkus((value) => {
      const next = moveItem(value, "identity", identity, direction);
      if (next === value) return value;
      markDirty();
      return next;
    });
  const removeSku = (identity: string) =>
    setSkus((value) => {
      if (value.length <= 1) return value;
      const index = value.findIndex((sku) => sku.identity === identity);
      if (index < 0) return value;
      markDirty();
      return value.filter((_, currentIndex) => currentIndex !== index);
    });
  const updateSku = (identity: string, patch: SkuPatch) =>
    setSkus((value) => {
      const index = value.findIndex((sku) => sku.identity === identity);
      const current = value[index];
      if (!current) return value;
      const next = [...value];
      next[index] = { ...current, ...patch };
      return next;
    });
  const mutation = useMutation({
    mutationFn: async ({ submit }: { submit: boolean }) => {
      if (images.some((image) => image.progress < 100))
        throw new Error("이미지 업로드가 끝난 뒤 저장해 주세요.");
      if (!title.trim() || !description.trim() || !categoryId)
        throw new Error("카테고리, 상품명, 설명은 필수입니다.");
      if (title.length > 200 || description.length > 2000)
        throw new Error("상품명은 200자, 설명은 2,000자 이하여야 합니다.");
      if (!images.length)
        throw new Error("상품 이미지를 1장 이상 등록해 주세요.");
      if (images.some((image) => !image.preview))
        throw new Error("불러오지 못한 상품 이미지를 다시 등록해 주세요.");
      if (
        skus.some(
          (s) =>
            !s.code.trim() ||
            !s.optionName.trim() ||
            !Number.isInteger(s.price) ||
            s.price < 0 ||
            !Number.isInteger(s.stock) ||
            s.stock < 0,
        )
      )
        throw new Error(
          "SKU 코드와 옵션명을 입력하고 가격/재고는 0 이상의 정수로 입력하세요.",
        );
      if (new Set(skus.map((sku) => sku.code)).size !== skus.length)
        throw new Error("SKU 코드는 중복될 수 없습니다.");
      const input = {
        categoryId,
        title,
        description,
        imageKeys: images.map((x) => x.key),
        skus: skus.map((sku) => ({
          code: sku.code,
          colorId: sku.colorId,
          sizeId: sku.sizeId,
          optionName: sku.optionName,
          price: sku.price,
          stock: sku.stock,
        })),
        isOnSale: sale,
        isExpressDelivery: express,
      };
      const saved = await saveProduct(productId, input);
      const draft =
        "createPartnerProductDraft" in saved
          ? saved.createPartnerProductDraft
          : saved.updatePartnerProductDraft;
      if (submit) {
        try {
          await submitProduct(draft.productId);
        } catch (e) {
          if (!productId) {
            const message =
              e instanceof Error ? e.message : "심사 요청에 실패했습니다.";
            router.replace(
              `/products/${draft.productId}/edit?submitError=${encodeURIComponent(message)}`,
            );
          }
          throw e;
        }
      }
      return draft;
    },
    onSuccess: async (draft) => {
      const replaceHistoryGuard = historyGuardArmed.current;
      dirty.current = false;
      historyGuardArmed.current = false;
      await invalidateProductCaches(draft.productId);
      if (replaceHistoryGuard) router.replace("/products");
      else router.push("/products");
    },
    onError: (e) => setError(e.message),
  });
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter =
      e.nativeEvent instanceof SubmitEvent ? e.nativeEvent.submitter : null;
    mutation.mutate({
      submit: submitter?.getAttribute("data-action") === "submit",
    });
  };
  const handlePublish = () => {
    if (!productId) return;
    setPublishPending(true);
    setError("");
    publishProduct(productId)
      .then(async () => {
        setConfirm(false);
        await invalidateProductCaches(productId);
        await existing.refetch();
      })
      .catch((publishError: Error) => setError(publishError.message))
      .finally(() => setPublishPending(false));
  };
  if (productId && existing.isPending) return <p>상품을 불러오고 있습니다.</p>;
  if (productId && existing.isError && !existing.data)
    return (
      <section>
        <p role="alert">상품을 불러오지 못했습니다.</p>
        <ActionButton
          type="button"
          loading={existing.isFetching}
          onClick={() => void existing.refetch()}
        >
          다시 시도
        </ActionButton>
      </section>
    );
  const p = existing.data?.myPartnerProduct;
  const effectiveState = p ? effectiveProductState(p) : undefined;
  return (
    <section>
      <header>
        <h1>{productId ? "상품 상세" : "상품 등록"}</h1>
        {effectiveState && <b>{effectiveState}</b>}
      </header>
      {effectiveState === "REJECTED" && p?.rejectionReason && (
        <div role="alert" className="error">
          반려 사유: {p.rejectionReason}
        </div>
      )}
      <form className="editor-grid" onSubmit={onSubmit} onChange={markDirty}>
        <div className="editor-main">
          <fieldset disabled={!editable || mutation.isPending}>
            <label>
              카테고리
              <select
                value={categoryId}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                <option value="">선택</option>
                {options.data?.catalogFilterOptions?.categories?.map((x) => (
                  <option value={x.categoryId} key={x.categoryId}>
                    {x.name}
                  </option>
                ))}
              </select>
            </label>
            <PartnerTextField
              label="상품명"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                markDirty();
              }}
              maxLength={200}
              required
            />
            <PartnerTextField
              label="연결 브랜드"
              value={
                p?.brand?.name ??
                partner.data?.myPartner?.brand?.name ??
                "연결 브랜드"
              }
              readOnly
            />
            <PartnerTextarea
              label="설명"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              required
            />
            <div
              className="drop"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e: DragEvent) => {
                e.preventDefault();
                void addFiles(e.dataTransfer.files);
              }}
            >
              <label>
                이미지 선택
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    e.target.files && void addFiles(e.target.files)
                  }
                />
              </label>
              <p>또는 이미지를 여기에 놓으세요 (최대 10 MiB)</p>
            </div>
            <div className="images">
              {images.map((x, i) => (
                <article key={x.key}>
                  {x.preview ? (
                    <Image
                      src={x.preview}
                      alt={`상품 이미지 ${i + 1}`}
                      width={190}
                      height={140}
                      unoptimized
                    />
                  ) : (
                    <span
                      className="thumbnail"
                      role="img"
                      aria-label={`상품 이미지 ${i + 1}을 불러올 수 없습니다.`}
                    >
                      이미지 없음
                    </span>
                  )}
                  <span aria-live="polite">{x.progress}%</span>
                  <ActionButton
                    type="button"
                    disabled={i === 0}
                    onClick={() => moveImage(x.key, -1)}
                  >
                    앞으로
                  </ActionButton>
                  <ActionButton
                    type="button"
                    disabled={i === images.length - 1}
                    onClick={() => moveImage(x.key, 1)}
                  >
                    뒤로
                  </ActionButton>
                  <ActionButton
                    type="button"
                    onClick={() => removeImage(x.key)}
                  >
                    삭제
                  </ActionButton>
                </article>
              ))}
            </div>
            <h2>SKU</h2>
            {skus.map((s, i) => (
              <div className="sku" key={s.identity}>
                <input
                  aria-label={`SKU ${i + 1} 코드`}
                  placeholder="코드"
                  value={s.code}
                  onChange={(event) => {
                    const code = event.currentTarget.value;
                    updateSku(s.identity, { code });
                  }}
                />
                <input
                  aria-label={`SKU ${i + 1} 옵션명`}
                  placeholder="옵션명"
                  value={s.optionName}
                  onChange={(event) => {
                    const optionName = event.currentTarget.value;
                    updateSku(s.identity, { optionName });
                  }}
                />
                <select
                  aria-label={`SKU ${i + 1} 색상`}
                  value={s.colorId}
                  onChange={(event) => {
                    const colorId = event.currentTarget.value;
                    updateSku(s.identity, { colorId });
                  }}
                >
                  <option value="">색상</option>
                  {options.data?.catalogFilterOptions?.colors?.map((x) => (
                    <option value={x.colorId} key={x.colorId}>
                      {x.name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={`SKU ${i + 1} 사이즈`}
                  value={s.sizeId}
                  onChange={(event) => {
                    const sizeId = event.currentTarget.value;
                    updateSku(s.identity, { sizeId });
                  }}
                >
                  <option value="">사이즈</option>
                  {options.data?.catalogFilterOptions?.sizes?.map((x) => (
                    <option value={x.sizeId} key={x.sizeId}>
                      {x.name}
                    </option>
                  ))}
                </select>
                <input
                  aria-label={`SKU ${i + 1} 가격`}
                  type="number"
                  min="0"
                  step="1"
                  value={s.price}
                  onChange={(event) => {
                    const price = Number(event.currentTarget.value);
                    updateSku(s.identity, { price });
                  }}
                />
                <input
                  aria-label={`SKU ${i + 1} 재고`}
                  type="number"
                  min="0"
                  step="1"
                  value={s.stock}
                  onChange={(event) => {
                    const stock = Number(event.currentTarget.value);
                    updateSku(s.identity, { stock });
                  }}
                />
                <ActionButton
                  aria-label={`SKU ${i + 1} 위로 이동`}
                  type="button"
                  disabled={i === 0}
                  onClick={() => moveSku(s.identity, -1)}
                >
                  위로
                </ActionButton>
                <ActionButton
                  aria-label={`SKU ${i + 1} 아래로 이동`}
                  type="button"
                  disabled={i === skus.length - 1}
                  onClick={() => moveSku(s.identity, 1)}
                >
                  아래로
                </ActionButton>
                <ActionButton
                  type="button"
                  disabled={skus.length === 1}
                  onClick={() => removeSku(s.identity)}
                >
                  행 삭제
                </ActionButton>
              </div>
            ))}
            <ActionButton
              type="button"
              variant="neutralOutline"
              onClick={() => {
                setSkus((v) => [...v, emptySku()]);
                markDirty();
              }}
            >
              SKU 추가
            </ActionButton>
            <label>
              <input
                type="checkbox"
                checked={sale}
                onChange={(e) => setSale(e.target.checked)}
              />
              판매 상품
            </label>
            <label>
              <input
                type="checkbox"
                checked={express}
                onChange={(e) => setExpress(e.target.checked)}
              />
              빠른 배송
            </label>
          </fieldset>
        </div>
        <aside className="editor-rail" aria-label="상품 미리보기 및 작업">
          <h2>미리보기</h2>
          <strong>{title || "상품명"}</strong>
          <p>
            {images.length}개 이미지 · {skus.length}개 SKU
          </p>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {editable && (
            <div className="actions">
              <ActionButton
                type="submit"
                data-action="save"
                disabled={images.some((image) => image.progress < 100)}
              >
                임시 저장
              </ActionButton>
              <ActionButton
                type="submit"
                data-action="submit"
                disabled={images.some((image) => image.progress < 100)}
              >
                심사 요청
              </ActionButton>
            </div>
          )}
          {effectiveState === "APPROVED" && productId && (
            <ActionButton type="button" onClick={() => setConfirm(true)}>
              판매 게시
            </ActionButton>
          )}
        </aside>
      </form>
      {confirm && (
        <div
          ref={dialogRef}
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="publish-title"
          aria-describedby="publish-description"
        >
          <div>
            <h2 id="publish-title">상품을 게시할까요?</h2>
            <p id="publish-description">게시하면 고객에게 상품이 공개됩니다.</p>
            <ActionButton
              variant="neutralOutline"
              onClick={() => setConfirm(false)}
            >
              취소
            </ActionButton>
            <ActionButton loading={publishPending} onClick={handlePublish}>
              게시
            </ActionButton>
          </div>
        </div>
      )}
    </section>
  );
};

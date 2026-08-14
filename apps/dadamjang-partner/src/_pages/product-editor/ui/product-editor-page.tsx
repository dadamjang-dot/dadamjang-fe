"use client";
import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ActionButton } from "@seed-design/react";
import {
  catalogOptions,
  createImageUpload,
  getProduct,
  publishProduct,
  saveProduct,
  submitProduct,
  ProductInput,
} from "@/shared/api";
import { isProductEditable } from "@/entities/product";
type ImageItem = { key: string; preview: string; local: boolean };
type Sku = ProductInput["skus"][number];
const emptySku = (): Sku => ({
  code: "",
  colorId: "",
  sizeId: "",
  optionName: "",
  price: 0,
  stock: 0,
});
export const ProductEditorPage = ({ productId }: { productId?: string }) => {
  const router = useRouter();
  const qc = useQueryClient();
  const existing = useQuery({
    queryKey: ["product", productId],
    queryFn: () => getProduct(productId!),
    enabled: !!productId,
  });
  const options = useQuery({
    queryKey: ["catalog-options"],
    queryFn: catalogOptions,
  });
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategory] = useState("");
  const [images, setImages] = useState<ImageItem[]>([]);
  const imageRef = useRef<ImageItem[]>([]);
  const [skus, setSkus] = useState<Sku[]>([emptySku()]);
  const [sale, setSale] = useState(false);
  const [express, setExpress] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const hydrated = useRef(false);
  useEffect(() => {
    const p = existing.data?.myPartnerProduct;
    if (!p || hydrated.current) return;
    hydrated.current = true;
    setTitle(p.title);
    setDescription(p.description);
    setCategory(p.categoryId);
    setImages(
      p.imageKeys.map((key, i) => ({
        key,
        preview: p.imageUrls[i] ?? "",
        local: false,
      })),
    );
    setSkus(
      p.skus.map((s) => ({
        code: s.code,
        colorId: s.colorId,
        sizeId: s.sizeId,
        optionName: s.optionName,
        price: s.price,
        stock: s.stock,
      })),
    );
    setSale(p.isOnSale);
    setExpress(p.isExpressDelivery);
  }, [existing.data]);
  useEffect(() => {
    imageRef.current = images;
  }, [images]);
  useEffect(
    () => () =>
      imageRef.current
        .filter((x) => x.local)
        .forEach((x) => URL.revokeObjectURL(x.preview)),
    [],
  );
  const editable =
    !productId ||
    (!!existing.data &&
      isProductEditable(existing.data.myPartnerProduct.status));
  const addFiles = async (files: FileList | File[]) => {
    setError("");
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
      const preview = URL.createObjectURL(file);
      try {
        const { createProductImageUpload: u } = await createImageUpload({
          filename: file.name,
          contentType: file.type,
          fileSize: file.size,
        });
        await fetch(u.uploadUrl, {
          method: "PUT",
          headers: { "content-type": file.type },
          body: file,
        });
        setImages((v) => [...v, { key: u.key, preview, local: true }]);
      } catch (e) {
        URL.revokeObjectURL(preview);
        setError(
          e instanceof Error ? e.message : "이미지 업로드에 실패했습니다.",
        );
      }
    }
  };
  const remove = (i: number) =>
    setImages((v) => {
      const item = v[i];
      if (item.local) URL.revokeObjectURL(item.preview);
      return v.filter((_, n) => n !== i);
    });
  const move = (i: number, d: number) =>
    setImages((v) => {
      const n = [...v];
      const [x] = n.splice(i, 1);
      n.splice(i + d, 0, x);
      return n;
    });
  const mutation = useMutation({
    mutationFn: async ({ submit }: { submit: boolean }) => {
      if (!title.trim() || !categoryId)
        throw new Error("카테고리와 상품명은 필수입니다.");
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
      const input = {
        categoryId,
        title,
        description,
        imageKeys: images.map((x) => x.key),
        skus,
        isOnSale: sale,
        isExpressDelivery: express,
      };
      const saved = await saveProduct(productId, input);
      const draft =
        "createMyPartnerProduct" in saved
          ? saved.createMyPartnerProduct
          : saved.updateMyPartnerProduct;
      if (submit) {
        try {
          await submitProduct(draft.productId);
        } catch (e) {
          if (!productId) router.replace(`/products/${draft.productId}`);
          throw e;
        }
      }
      return draft;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["products"] });
      router.push("/products");
    },
    onError: (e) => setError(e.message),
  });
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    mutation.mutate({
      submit:
        (e.nativeEvent as SubmitEvent).submitter?.getAttribute(
          "data-action",
        ) === "submit",
    });
  };
  if (productId && existing.isPending) return <p>상품을 불러오고 있습니다.</p>;
  const p = existing.data?.myPartnerProduct;
  return (
    <section>
      <header>
        <h1>{productId ? "상품 상세" : "상품 등록"}</h1>
        {p && <b>{p.status}</b>}
      </header>
      {p?.rejectionReason && (
        <div role="alert" className="error">
          반려 사유: {p.rejectionReason}
        </div>
      )}
      <form onSubmit={onSubmit}>
        <fieldset disabled={!editable || mutation.isPending}>
          <label>
            카테고리
            <select
              value={categoryId}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              <option value="">선택</option>
              {options.data?.catalogFilterOptions.categories.map((x) => (
                <option value={x.categoryId} key={x.categoryId}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            상품명
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>
          <label>
            설명
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
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
                <Image
                  src={x.preview}
                  alt={`상품 이미지 ${i + 1}`}
                  width={190}
                  height={140}
                  unoptimized
                />
                <ActionButton
                  type="button"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  앞으로
                </ActionButton>
                <ActionButton
                  type="button"
                  disabled={i === images.length - 1}
                  onClick={() => move(i, 1)}
                >
                  뒤로
                </ActionButton>
                <ActionButton type="button" onClick={() => remove(i)}>
                  삭제
                </ActionButton>
              </article>
            ))}
          </div>
          <h2>SKU</h2>
          {skus.map((s, i) => (
            <div className="sku" key={i}>
              <input
                aria-label={`SKU ${i + 1} 코드`}
                placeholder="코드"
                value={s.code}
                onChange={(e) =>
                  setSkus((v) =>
                    v.map((x, n) =>
                      n === i ? { ...x, code: e.target.value } : x,
                    ),
                  )
                }
              />
              <input
                aria-label={`SKU ${i + 1} 옵션명`}
                placeholder="옵션명"
                value={s.optionName}
                onChange={(e) =>
                  setSkus((v) =>
                    v.map((x, n) =>
                      n === i ? { ...x, optionName: e.target.value } : x,
                    ),
                  )
                }
              />
              <select
                aria-label={`SKU ${i + 1} 색상`}
                value={s.colorId}
                onChange={(e) =>
                  setSkus((v) =>
                    v.map((x, n) =>
                      n === i ? { ...x, colorId: e.target.value } : x,
                    ),
                  )
                }
              >
                <option value="">색상</option>
                {options.data?.catalogFilterOptions.colors.map((x) => (
                  <option value={x.colorId} key={x.colorId}>
                    {x.name}
                  </option>
                ))}
              </select>
              <select
                aria-label={`SKU ${i + 1} 사이즈`}
                value={s.sizeId}
                onChange={(e) =>
                  setSkus((v) =>
                    v.map((x, n) =>
                      n === i ? { ...x, sizeId: e.target.value } : x,
                    ),
                  )
                }
              >
                <option value="">사이즈</option>
                {options.data?.catalogFilterOptions.sizes.map((x) => (
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
                onChange={(e) =>
                  setSkus((v) =>
                    v.map((x, n) =>
                      n === i ? { ...x, price: Number(e.target.value) } : x,
                    ),
                  )
                }
              />
              <input
                aria-label={`SKU ${i + 1} 재고`}
                type="number"
                min="0"
                step="1"
                value={s.stock}
                onChange={(e) =>
                  setSkus((v) =>
                    v.map((x, n) =>
                      n === i ? { ...x, stock: Number(e.target.value) } : x,
                    ),
                  )
                }
              />
              <ActionButton
                type="button"
                disabled={skus.length === 1}
                onClick={() => setSkus((v) => v.filter((_, n) => n !== i))}
              >
                행 삭제
              </ActionButton>
            </div>
          ))}
          <ActionButton
            type="button"
            variant="neutralOutline"
            onClick={() => setSkus((v) => [...v, emptySku()])}
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
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {editable && (
          <div className="actions">
            <ActionButton type="submit" data-action="save">
              임시 저장
            </ActionButton>
            <ActionButton type="submit" data-action="submit">
              심사 요청
            </ActionButton>
          </div>
        )}
      </form>
      {p?.status === "APPROVED" && (
        <ActionButton onClick={() => setConfirm(true)}>판매 게시</ActionButton>
      )}
      {confirm && (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="publish-title"
        >
          <div>
            <h2 id="publish-title">상품을 게시할까요?</h2>
            <p>게시하면 고객에게 상품이 공개됩니다.</p>
            <ActionButton
              variant="neutralOutline"
              onClick={() => setConfirm(false)}
            >
              취소
            </ActionButton>
            <ActionButton
              onClick={async () => {
                await publishProduct(productId!);
                setConfirm(false);
                await existing.refetch();
              }}
            >
              게시
            </ActionButton>
          </div>
        </div>
      )}
    </section>
  );
};

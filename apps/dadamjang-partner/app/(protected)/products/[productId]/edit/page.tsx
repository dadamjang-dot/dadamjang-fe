import { ProductEditorPage } from "@/_pages/product-editor";

export default async function Page({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  return <ProductEditorPage productId={(await params).productId} />;
}

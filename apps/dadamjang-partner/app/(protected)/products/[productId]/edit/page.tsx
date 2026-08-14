import { ProductEditorPage } from "@/_pages/product-editor";

const Page = async ({ params }: { params: Promise<{ productId: string }> }) => {
  return <ProductEditorPage productId={(await params).productId} />;
};
export default Page;

import { redirect } from "next/navigation";
const Page = async ({ params }: { params: Promise<{ productId: string }> }) => {
  redirect(`/products/${(await params).productId}/edit`);
};
export default Page;

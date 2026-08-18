import { CustomerOrderView } from "./order-view";

export const metadata = { title: "주문하기" };

export default async function Page({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  return <CustomerOrderView productId={decodeURIComponent(productId)} />;
}

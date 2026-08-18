import { AdminOrderDetailView } from "./order-detail-view";

export const metadata = { title: "주문 상세" };

export default async function Page({ params }: { params: Promise<{ orderNo: string }> }) {
  const { orderNo } = await params;
  return <AdminOrderDetailView orderNo={decodeURIComponent(orderNo)} />;
}

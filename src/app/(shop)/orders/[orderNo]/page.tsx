import { RequireCustomer } from "@/components/auth/require-customer";
import { OrderDetailView } from "./order-detail-view";

export const metadata = { title: "주문 상세" };

export default async function Page({ params }: { params: Promise<{ orderNo: string }> }) {
  const { orderNo } = await params;
  return (
    <RequireCustomer>
      <OrderDetailView orderNo={decodeURIComponent(orderNo)} />
    </RequireCustomer>
  );
}

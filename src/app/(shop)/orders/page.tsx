import { RequireCustomer } from "@/components/auth/require-customer";
import { OrdersView } from "./orders-view";

export const metadata = { title: "주문내역" };

export default function Page() {
  return (
    <RequireCustomer>
      <OrdersView />
    </RequireCustomer>
  );
}

import { RequireCustomer } from "@/components/auth/require-customer";
import { CustomerPointsView } from "./points-view";

export const metadata = { title: "포인트 충전" };

export default function Page() {
  return (
    <RequireCustomer>
      <CustomerPointsView />
    </RequireCustomer>
  );
}

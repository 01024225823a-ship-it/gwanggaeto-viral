import { RequireCustomer } from "@/components/auth/require-customer";
import { CustomerProfileView } from "./profile-view";

export const metadata = { title: "내 정보" };

export default function Page() {
  return (
    <RequireCustomer>
      <CustomerProfileView />
    </RequireCustomer>
  );
}

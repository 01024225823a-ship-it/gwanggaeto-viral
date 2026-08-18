import { redirect } from "next/navigation";

/** 상품을 고르지 않고 들어온 경우 서비스 목록으로 보낸다 */
export default function Page() {
  redirect("/services");
}

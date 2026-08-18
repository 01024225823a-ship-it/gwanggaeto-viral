import { Suspense } from "react";
import { CustomerServicesView } from "./services-view";

export const metadata = { title: "서비스 둘러보기" };

export default function Page() {
  // useSearchParams(카테고리·검색어)를 쓰므로 Suspense 경계가 필요하다
  return (
    <Suspense>
      <CustomerServicesView />
    </Suspense>
  );
}

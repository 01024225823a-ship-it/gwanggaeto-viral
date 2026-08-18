import { Suspense } from "react";
import { PartnerJobsView } from "./jobs-view";

export const metadata = { title: "작업 관리" };

export default function Page() {
  // useSearchParams(탭 상태)를 쓰므로 Suspense 경계가 필요하다
  return (
    <Suspense>
      <PartnerJobsView />
    </Suspense>
  );
}

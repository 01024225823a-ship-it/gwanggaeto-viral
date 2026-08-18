import { Suspense } from "react";
import { LoginView } from "./login-view";

export const metadata = { title: "로그인" };

export default function Page() {
  // useSearchParams(redirect)를 쓰므로 Suspense 경계가 필요하다
  return (
    <Suspense>
      <LoginView />
    </Suspense>
  );
}

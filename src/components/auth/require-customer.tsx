"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/store/session";

/**
 * 광고주 로그인이 필요한 화면을 감싸는 가드.
 *
 * 서비스몰 레이아웃 전체에는 가드를 걸지 않고(비로그인도 둘러볼 수 있어야 하므로)
 * 주문·주문내역·포인트·내 정보처럼 개인 데이터를 다루는 화면에서만 사용한다.
 *
 * 로그인되어 있지 않으면 현재 경로를 redirect 파라미터로 넘겨 로그인 화면으로 보낸다.
 */
export function RequireCustomer({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { ready, account } = useSession();

  const allowed = account?.role === "CUSTOMER";

  useEffect(() => {
    if (!ready || allowed) return;
    router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
  }, [ready, allowed, pathname, router]);

  if (!ready || !allowed) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  return <>{children}</>;
}

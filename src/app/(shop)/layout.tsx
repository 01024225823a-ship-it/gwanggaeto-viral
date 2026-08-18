"use client";

import { ShopShell } from "@/components/layout/shop-shell";

/**
 * 서비스몰 레이아웃.
 * 로그인 가드는 여기 두지 않는다 — 비로그인 사용자도 둘러볼 수 있어야 하므로,
 * 개인 데이터를 다루는 페이지에서만 RequireCustomer를 사용한다.
 */
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <ShopShell>{children}</ShopShell>;
}

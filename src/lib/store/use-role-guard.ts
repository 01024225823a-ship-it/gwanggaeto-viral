"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Role } from "@/lib/domain/types";
import { useSession } from "@/lib/store/session";

/**
 * 역할 영역 진입 가드.
 *
 * - 로그인되어 있지 않으면 로그인 화면으로 보낸다.
 * - 다른 역할로 로그인한 채 딥링크로 들어오면 세션 역할을 맞춰준다 (데모 편의).
 *
 * 운영자용 AppShell과 광고주용 ShopShell이 같은 규칙을 쓰도록 한 곳에 둔다.
 */
export function useRoleGuard(role: Role) {
  const router = useRouter();
  const pathname = usePathname();
  const { ready, account, ensureRole } = useSession();

  useEffect(() => {
    if (!ready) return;
    if (!account) {
      // 로그인 후 원래 보려던 화면으로 돌아올 수 있도록 경로를 넘긴다
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (account.role !== role) ensureRole(role);
  }, [ready, account, role, ensureRole, router, pathname]);

  return { ready, account };
}

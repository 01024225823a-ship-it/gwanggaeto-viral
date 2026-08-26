"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Account, Role } from "@/lib/domain/types";
import { DEMO_ACCOUNTS, ROLE_HOME, accountByRole, findAccount } from "@/lib/mock/accounts";
import { useIsHydrated } from "@/lib/store/use-hydrated";

const STORAGE_KEY = "gkt.session.v1";

/** 저장된 로그인 계정 복원 — 서버에서는 항상 null (하이드레이션 이후에만 사용) */
function readStoredAccountId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved && findAccount(saved) ? saved : null;
  } catch {
    /* localStorage 사용 불가 환경 무시 */
    return null;
  }
}

/**
 * React 밖(서버 라우트 호출 등)에서 현재 로그인 계정 ID가 필요할 때 쓴다.
 *
 * 이 값은 프로토타입 데모 세션이라 위조할 수 있다. 서버는 이 ID를 계정 목록과
 * 대조하는 정도만 하고, 실제 인증으로 교체할 때는 lib/ai-blog/server/guard.ts 와
 * 이 함수를 함께 바꾼다.
 */
export function currentAccountId(): string | null {
  return readStoredAccountId();
}

interface SessionValue {
  /** localStorage 복원이 끝났는지 여부 (하이드레이션 불일치 방지) */
  ready: boolean;
  account: Account | null;
  role: Role | null;
  accounts: Account[];
  login: (accountId: string) => void;
  logout: () => void;
  /** 역할 전환 (상단 데모 계정 전환기) */
  switchRole: (role: Role) => string;
  /** 해당 역할 영역에 진입했을 때 세션 역할을 맞춰준다 (딥링크 대응) */
  ensureRole: (role: Role) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [accountId, setAccountId] = useState<string | null>(readStoredAccountId);
  const ready = useIsHydrated();

  const persist = useCallback((id: string | null) => {
    setAccountId(id);
    try {
      if (id) window.localStorage.setItem(STORAGE_KEY, id);
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
  }, []);

  const value = useMemo<SessionValue>(() => {
    const restored = accountId ? (findAccount(accountId) ?? null) : null;
    // 하이드레이션이 끝나기 전에는 복원된 계정을 노출하지 않는다.
    // 서버 HTML(비로그인)과 첫 클라이언트 렌더가 항상 일치하므로,
    // 화면마다 ready를 따로 챙기지 않아도 하이드레이션 불일치가 생기지 않는다.
    const account = ready ? restored : null;
    return {
      ready,
      account,
      role: account?.role ?? null,
      accounts: DEMO_ACCOUNTS,
      login: (id) => persist(id),
      logout: () => persist(null),
      switchRole: (role) => {
        const next = accountByRole(role);
        persist(next.id);
        return ROLE_HOME[role];
      },
      ensureRole: (role) => {
        if (account?.role !== role) persist(accountByRole(role).id);
      },
    };
  }, [accountId, ready, persist]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession은 SessionProvider 내부에서만 사용할 수 있습니다.");
  return ctx;
}

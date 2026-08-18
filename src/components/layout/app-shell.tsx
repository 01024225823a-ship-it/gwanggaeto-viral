"use client";

import { Suspense, useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/layout/logo";
import { RoleSwitcher } from "@/components/layout/role-switcher";
import { SidebarNav, type BadgeCounts } from "@/components/layout/sidebar-nav";
import { ROLE_LABEL } from "@/lib/mock/accounts";
import type { SidebarRole } from "@/config/nav";
import { useRoleGuard } from "@/lib/store/use-role-guard";

/**
 * 운영자(실행사·관리자) 공통 레이아웃 — 좌측 사이드바 + 상단바 + 콘텐츠 영역.
 * 모바일에서는 사이드바가 Sheet(드로어)로 전환된다.
 *
 * 광고주 화면은 쇼핑몰형 ShopShell을 사용한다.
 */
export function AppShell({
  role,
  badges,
  headerExtra,
  sidebarFooter,
  children,
}: {
  role: SidebarRole;
  badges?: BadgeCounts;
  headerExtra?: React.ReactNode;
  sidebarFooter?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { ready, account } = useRoleGuard(role);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!ready || !account) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  const nav = (onNavigate?: () => void) => (
    <Suspense fallback={<div className="px-3 py-4" />}>
      <SidebarNav role={role} badges={badges} onNavigate={onNavigate} />
    </Suspense>
  );

  return (
    <div className="flex min-h-dvh">
      {/* 데스크톱 사이드바 */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-sidebar-border px-5">
          <Logo href="/" />
        </div>
        <div className="scrollbar-thin flex-1 overflow-y-auto">{nav()}</div>
        {sidebarFooter && (
          <div className="shrink-0 border-t border-sidebar-border p-3">{sidebarFooter}</div>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        {/* 상단바 */}
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-surface/90 px-4 backdrop-blur sm:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="메뉴 열기">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="h-16 justify-center border-b px-5">
                <SheetTitle className="text-left">
                  <Logo href="/" />
                </SheetTitle>
              </SheetHeader>
              <div className="scrollbar-thin flex-1 overflow-y-auto">
                {nav(() => setMobileOpen(false))}
              </div>
              {sidebarFooter && <div className="border-t p-3">{sidebarFooter}</div>}
            </SheetContent>
          </Sheet>

          <div className="lg:hidden">
            <Logo href="/" size="sm" />
          </div>

          <span className="ml-1 hidden rounded-md bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground lg:inline-block">
            {ROLE_LABEL[role]} 화면
          </span>

          <div className="ml-auto flex items-center gap-2">
            {headerExtra}
            <RoleSwitcher />
          </div>
        </header>

        <main className="flex-1">
          <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

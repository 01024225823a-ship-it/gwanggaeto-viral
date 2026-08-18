"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Repeat2,
  UserCircle,
  Wallet,
} from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { BRAND } from "@/config/brand";
import { SHOP_NAV } from "@/config/nav";
import type { Account } from "@/lib/domain/types";
import { findCustomer } from "@/lib/domain/selectors";
import { formatPoint } from "@/lib/format";
import { ROLE_HOME, ROLE_LABEL } from "@/lib/mock/accounts";
import { useData } from "@/lib/store/data";
import { useSession } from "@/lib/store/session";
import { cn } from "@/lib/utils";

/**
 * 서비스몰 레이아웃 — 일반 쇼핑몰처럼 상단 네비게이션을 사용한다.
 *
 * 여기에는 로그인 가드를 두지 않는다. 비로그인 사용자도 메인·서비스 목록·이용안내를
 * 그대로 볼 수 있어야 하기 때문이다. 개인 데이터를 다루는 화면은 각 페이지에서
 * RequireCustomer로 감싼다.
 */
export function ShopShell({ children }: { children: React.ReactNode }) {
  const { ready, account } = useSession();
  const { data } = useData();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // 광고주로 로그인한 경우에만 개인화 UI를 보여준다 (운영자 계정은 손님과 동일하게 취급)
  const customerAccount = account?.role === "CUSTOMER" ? account : null;
  const point = findCustomer(data, customerAccount?.customerId)?.point ?? 0;

  const navItems = SHOP_NAV.filter((item) => !item.authOnly || customerAccount);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center gap-2 px-4 sm:px-6">
          <Logo href="/" />

          {/* 데스크톱 메뉴 */}
          <nav className="ml-8 hidden items-center gap-1 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href, item.exact) ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-2 text-[15px] font-medium transition-colors",
                  isActive(item.href, item.exact)
                    ? "text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            {/* 세션 복원 전에는 자리만 잡아둬 로그인/비로그인 UI가 깜빡이지 않게 한다 */}
            {!ready ? (
              <span className="h-9 w-32" aria-hidden />
            ) : customerAccount ? (
              <>
                <PointMenu point={point} />
                <AccountMenu account={customerAccount} />
              </>
            ) : (
              <GuestActions account={account} />
            )}

            {/* 모바일 메뉴 */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="메뉴 열기">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0">
                <SheetHeader className="h-16 justify-center border-b px-5">
                  <SheetTitle className="text-left">
                    <Logo href="/" />
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 p-3">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors",
                          isActive(item.href, item.exact)
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <Icon className="size-4.5" />
                        {item.label}
                      </Link>
                    );
                  })}

                  <div className="my-2 border-t" />

                  {customerAccount ? (
                    <>
                      <Link
                        href="/points"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <Wallet className="size-4.5" />
                        포인트 충전
                        <span className="num ml-auto text-[13px] font-semibold text-primary">
                          {formatPoint(point)}
                        </span>
                      </Link>
                      <Link
                        href="/profile"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <UserCircle className="size-4.5" />내 정보
                      </Link>
                    </>
                  ) : (
                    <div className="flex flex-col gap-2 px-1 pt-1">
                      <Button asChild onClick={() => setMobileOpen(false)}>
                        <Link href="/login">로그인</Link>
                      </Button>
                      <Button variant="outline" asChild onClick={() => setMobileOpen(false)}>
                        <Link href="/register">회원가입</Link>
                      </Button>
                    </div>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8">{children}</div>
      </main>

      <ShopFooter />
    </div>
  );
}

/** 비로그인 상태의 헤더 우측 — 로그인 / 회원가입 */
function GuestActions({ account }: { account: Account | null }) {
  return (
    <div className="flex items-center gap-1.5">
      {/* 운영자 계정으로 로그인한 채 서비스몰을 보는 경우, 원래 화면으로 돌아갈 수 있게 한다 */}
      {account && (
        <Button variant="ghost" size="sm" className="hidden text-muted-foreground sm:inline-flex" asChild>
          <Link href={ROLE_HOME[account.role]}>
            <LayoutDashboard />
            {ROLE_LABEL[account.role]} 화면
          </Link>
        </Button>
      )}
      <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
        <Link href="/login">로그인</Link>
      </Button>
      <Button size="sm" className="hidden sm:inline-flex" asChild>
        <Link href="/register">회원가입</Link>
      </Button>
    </div>
  );
}

/** 보유 포인트 — 클릭하면 충전/사용내역으로 이동 */
function PointMenu({ point }: { point: number }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-9 gap-1.5 px-2.5" aria-label="보유 포인트">
          <Wallet className="size-4 text-primary" />
          <span className="num text-[13px] font-semibold">{formatPoint(point)}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold tracking-wide text-muted-foreground">
            보유 포인트
          </span>
          <span className="num text-sm font-semibold text-primary">{formatPoint(point)}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/points" className="gap-2">
            <Wallet className="size-4" />
            포인트 충전
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/points#history" className="gap-2">
            <History className="size-4" />
            포인트 사용내역
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** 내 정보 + (프로토타입용) 역할 전환 */
function AccountMenu({ account }: { account: Account }) {
  const router = useRouter();
  const { accounts, login, logout } = useSession();

  const otherRoles = accounts.filter((a) => a.role !== "CUSTOMER");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 gap-1.5 px-2" aria-label="내 정보">
          <span className="flex size-7 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
            {account.name.charAt(0)}
          </span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-[13px] font-semibold">{account.org}</span>
          <span className="text-[11px] font-normal text-muted-foreground">{account.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile" className="gap-2">
            <UserCircle className="size-4" />내 정보
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/orders" className="gap-2">
            <History className="size-4" />
            주문내역
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground">
          <Repeat2 className="size-3.5" />
          DEMO · 다른 화면 보기
        </DropdownMenuLabel>
        {otherRoles.map((acc) => (
          <DropdownMenuItem
            key={acc.id}
            className="gap-2 text-[13px]"
            onSelect={() => {
              login(acc.id);
              router.push(ROLE_HOME[acc.role]);
            }}
          >
            {acc.role === "PARTNER" ? "실행사 화면" : "관리자 화면"}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2"
          onSelect={() => {
            logout();
            router.push("/");
          }}
        >
          <LogOut className="size-4" />
          로그아웃
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ShopFooter() {
  return (
    <footer className="mt-10 border-t border-border bg-muted/30">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-2">
          <Logo href="/" size="sm" />
          <p className="text-[13px] text-muted-foreground">{BRAND.tagline}</p>
        </div>
        <div className="flex flex-col gap-1 text-[13px] text-muted-foreground">
          <p className="font-medium text-foreground">고객센터</p>
          <p className="num">{BRAND.support.phone}</p>
          <p>{BRAND.support.email}</p>
          <p>{BRAND.support.hours}</p>
        </div>
        <div className="flex flex-col gap-1 text-[13px] text-muted-foreground">
          <Link href="/guide" className="hover:text-foreground">
            이용안내
          </Link>
          <Link href="/support" className="hover:text-foreground">
            문의하기
          </Link>
          <Link href="/services" className="hover:text-foreground">
            전체 서비스
          </Link>
        </div>
      </div>
      <div className="border-t border-border/60">
        <p className="mx-auto w-full max-w-[1200px] px-4 py-4 text-xs text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} {BRAND.name}. 프로토타입 데모 환경입니다.
        </p>
      </div>
    </footer>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { Check, ChevronDown, LogOut, Repeat2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_HOME, ROLE_LABEL } from "@/lib/mock/accounts";
import { useSession } from "@/lib/store/session";
import { cn } from "@/lib/utils";

/**
 * 데모 계정 전환기 — 1차 프로토타입 전용.
 * 실제 인증이 붙으면 이 컴포넌트는 "내 계정" 드롭다운으로 대체된다.
 */
export function RoleSwitcher() {
  const router = useRouter();
  const { account, accounts, login, logout } = useSession();

  if (!account) return null;

  const initial = account.org.replace(/^\(주\)/, "").charAt(0);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-10 gap-2 pr-2 pl-1.5 hover:bg-muted"
          aria-label="데모 계정 전환"
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
            {initial}
          </span>
          <span className="hidden text-left leading-tight sm:flex sm:flex-col">
            <span className="text-[13px] font-medium">{account.org}</span>
            <span className="text-[11px] text-muted-foreground">
              {ROLE_LABEL[account.role]} · {account.name}
            </span>
          </span>
          <ChevronDown className="size-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground">
          <Repeat2 className="size-3.5" />
          데모 계정 전환
        </DropdownMenuLabel>
        {accounts.map((acc) => {
          const active = acc.id === account.id;
          return (
            <DropdownMenuItem
              key={acc.id}
              className="gap-2 py-2"
              onSelect={() => {
                if (active) return;
                login(acc.id);
                router.push(ROLE_HOME[acc.role]);
              }}
            >
              <span
                className={cn(
                  "mt-0.5 inline-flex h-5 shrink-0 items-center rounded px-1.5 text-[11px] font-semibold",
                  acc.role === "CUSTOMER" && "bg-blue-50 text-blue-700",
                  acc.role === "PARTNER" && "bg-violet-50 text-violet-700",
                  acc.role === "ADMIN" && "bg-slate-900 text-white",
                )}
              >
                {ROLE_LABEL[acc.role]}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[13px] font-medium">{acc.org}</span>
                <span className="truncate text-[11px] text-muted-foreground">{acc.name}</span>
              </span>
              {active && <Check className="ml-auto size-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2"
          onSelect={() => {
            logout();
            router.push("/login");
          }}
        >
          <LogOut className="size-4" />
          로그아웃
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

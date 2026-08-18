"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { NAV, type NavItem, type SidebarRole } from "@/config/nav";
import { cn } from "@/lib/utils";

export type BadgeCounts = Partial<Record<NonNullable<NavItem["badge"]>, number>>;

function isActive(href: string, pathname: string, tab: string | null): boolean {
  const [base, query] = href.split("?");
  if (query) {
    const wanted = new URLSearchParams(query).get("tab");
    return pathname === base && (tab ?? "new") === wanted;
  }
  if (pathname === base) return true;
  // 하위 경로 매칭 — /order 가 /orders 를 잡지 않도록 "/" 를 붙여 비교
  return pathname.startsWith(`${base}/`);
}

export function SidebarNav({
  role,
  badges = {},
  onNavigate,
}: {
  role: SidebarRole;
  badges?: BadgeCounts;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");

  return (
    <nav className="flex flex-col gap-6 px-3 py-4">
      {NAV[role].map((section, i) => (
        <div key={section.title ?? i} className="flex flex-col gap-1">
          {section.title && (
            <p className="px-3 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground/80">
              {section.title}
            </p>
          )}
          {section.items.map((item) => {
            const active = isActive(item.href, pathname, tab);
            const count = item.badge ? (badges[item.badge] ?? 0) : 0;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    active ? "text-sidebar-accent-foreground" : "text-muted-foreground/70",
                  )}
                />
                <span className="truncate">{item.label}</span>
                {count > 0 && (
                  <span className="num ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

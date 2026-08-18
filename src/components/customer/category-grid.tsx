import Link from "next/link";
import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON, RECOMMEND_ICON } from "@/config/category-icons";
import type { Category } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export const RECOMMEND_SLUG = "recommend";

/**
 * 큰 아이콘형 카테고리 메뉴.
 * PC 6열 · 태블릿 4열 · 모바일 3열로 표시한다.
 */
export function CategoryGrid({
  categories,
  activeSlug,
  className,
}: {
  categories: Category[];
  /** 현재 선택된 슬러그 (없으면 선택 표시 없음) */
  activeSlug?: string;
  className?: string;
}) {
  const items = [
    { slug: RECOMMEND_SLUG, name: "추천서비스", icon: RECOMMEND_ICON },
    ...categories.map((c) => ({
      slug: c.slug,
      name: c.name,
      icon: CATEGORY_ICONS[c.slug] ?? DEFAULT_CATEGORY_ICON,
    })),
  ];

  return (
    <ul className={cn("grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6", className)}>
      {items.map((item) => {
        const Icon = item.icon;
        const active = activeSlug === item.slug;
        return (
          <li key={item.slug}>
            <Link
              href={`/services?category=${item.slug}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-full flex-col items-center justify-start gap-2 rounded-2xl border px-2 py-4 text-center transition-colors",
                active
                  ? "border-primary bg-primary/5"
                  : "border-transparent bg-muted/50 hover:border-primary/30 hover:bg-accent/60",
              )}
            >
              <span
                className={cn(
                  "flex size-11 items-center justify-center rounded-2xl transition-colors",
                  active ? "bg-primary text-primary-foreground" : "bg-surface text-primary",
                )}
              >
                <Icon className="size-5.5" />
              </span>
              <span
                className={cn(
                  "text-[13px] leading-tight font-medium",
                  active ? "text-primary" : "text-foreground",
                )}
              >
                {item.name}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

"use client";

import { cn } from "@/lib/utils";

export interface FilterTabItem<T extends string> {
  value: T;
  label: string;
  count?: number;
}

/**
 * 목록 상단 상태 필터.
 * 가로 스크롤이 가능해 모바일에서도 항목이 잘리지 않는다.
 */
export function FilterTabs<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: FilterTabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("scrollbar-thin -mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5", className)}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            aria-pressed={active}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span
                className={cn(
                  "num rounded-full px-1.5 text-[11px]",
                  active ? "bg-primary-foreground/20" : "bg-muted-foreground/10",
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const AI_BLOG_STEPS = [
  "콘텐츠 정보 입력",
  "AI 원고 생성",
  "원고 수정·확정",
  "이미지 제작",
  "결과 확인",
] as const;

/**
 * AI 블로그 콘텐츠 제작 진행 단계 표시.
 * 이미 지나온 단계는 눌러서 되돌아갈 수 있다.
 */
export function AiBlogSteps({
  current,
  reached,
  onSelect,
  className,
}: {
  /** 현재 단계 (1부터) */
  current: number;
  /** 지금까지 도달한 최대 단계 */
  reached: number;
  onSelect?: (step: number) => void;
  className?: string;
}) {
  return (
    <ol
      className={cn(
        "scrollbar-thin flex items-center gap-1 overflow-x-auto rounded-2xl bg-muted/50 p-2",
        className,
      )}
    >
      {AI_BLOG_STEPS.map((label, i) => {
        const n = i + 1;
        const done = current > n;
        const active = current === n;
        const canGo = n <= reached && n !== current && !!onSelect;

        return (
          <li key={label} className="flex min-w-0 flex-1 items-center">
            <button
              type="button"
              disabled={!canGo}
              aria-current={active ? "step" : undefined}
              onClick={canGo ? () => onSelect(n) : undefined}
              className={cn(
                "flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2.5 py-2.5 text-left transition-colors sm:px-3",
                active && "bg-surface shadow-[0_1px_2px_0_rgb(16_24_40/0.06)]",
                canGo && "hover:bg-surface/70",
                !canGo && "cursor-default",
              )}
            >
              <span
                className={cn(
                  "num flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                  done && "bg-primary/15 text-primary",
                  active && "bg-primary text-primary-foreground",
                  !done && !active && "bg-muted-foreground/15 text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3.5" /> : `0${n}`}
              </span>
              <span
                className={cn(
                  "truncate text-[13px] font-semibold",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

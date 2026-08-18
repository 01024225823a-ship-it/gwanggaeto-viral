import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["서비스 선택", "주문정보 입력", "주문금액 확인", "주문완료"];

/**
 * 주문 진행 단계 표시 — 01 서비스 선택 → 02 주문정보 입력 → 03 주문금액 확인 → 04 주문완료
 * current는 1부터 시작한다.
 */
export function OrderSteps({ current, className }: { current: number; className?: string }) {
  return (
    <ol
      className={cn(
        "scrollbar-thin flex items-center gap-2 overflow-x-auto rounded-2xl bg-muted/50 p-2",
        className,
      )}
    >
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = current > n;
        const active = current === n;
        return (
          <li key={label} className="flex min-w-0 flex-1 items-center gap-2">
            <div
              className={cn(
                "flex min-w-0 flex-1 items-center gap-2 rounded-xl px-3 py-2.5 transition-colors",
                active && "bg-surface shadow-[0_1px_2px_0_rgb(16_24_40/0.06)]",
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
            </div>
          </li>
        );
      })}
    </ol>
  );
}

import { Check, CircleSlash } from "lucide-react";
import { ORDER_FLOW, statusMeta } from "@/lib/domain/status";
import type { Order } from "@/lib/domain/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/** 주문 진행 단계 표시 — 접수완료 → 실행사 배정 → 작업중 → 검수중 → 작업완료 */
export function OrderStepper({ order, className }: { order: Order; className?: string }) {
  if (order.status === "CANCELED") {
    return (
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-lg bg-rose-50 p-3.5 text-rose-700 ring-1 ring-rose-200",
          className,
        )}
      >
        <CircleSlash className="size-4 shrink-0" />
        <p className="text-sm font-medium">취소된 주문입니다.</p>
      </div>
    );
  }

  const currentStep = statusMeta(order.status).step;

  /** 해당 단계에 처음 진입한 시각 */
  const reachedAt = (status: string) =>
    order.history.find((h) => h.status === status)?.at ?? null;

  return (
    <div className={className}>
      <ol className="flex items-start">
        {ORDER_FLOW.map((status, i) => {
          const meta = statusMeta(status);
          const done = currentStep > meta.step;
          const current = currentStep === meta.step;
          const at = reachedAt(status);

          return (
            <li key={status} className="relative flex flex-1 flex-col items-center px-0.5 text-center">
              {i > 0 && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-3.5 right-1/2 z-0 h-0.5 w-full",
                    done || current ? "bg-primary/60" : "bg-border",
                  )}
                />
              )}
              <span
                className={cn(
                  "relative z-10 flex size-7 items-center justify-center rounded-full text-[11px] font-semibold ring-4 ring-card",
                  done && "bg-primary/15 text-primary",
                  current && "bg-primary text-primary-foreground",
                  !done && !current && "bg-muted text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  "mt-2 text-[11px] leading-tight font-medium sm:text-xs",
                  current ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {meta.label}
              </span>
              <span className="num mt-0.5 text-[10px] text-muted-foreground/80 sm:text-[11px]">
                {at ? formatDate(at) : "-"}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 rounded-lg bg-muted/60 p-3 text-center text-[13px] text-muted-foreground">
        {statusMeta(order.status).description}
      </p>
    </div>
  );
}

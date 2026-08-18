import { Check, CircleSlash } from "lucide-react";
import {
  CUSTOMER_FLOW,
  CUSTOMER_STAGE_META,
  customerStageMeta,
  customerTimeline,
} from "@/lib/domain/customer-status";
import type { Order } from "@/lib/domain/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * 광고주용 진행 단계 표시 — 주문접수 → 작업준비 → 작업진행 → 작업완료.
 * 실행사 배정·검수 같은 내부 절차 명칭은 노출하지 않는다.
 */
export function CustomerStepper({ order, className }: { order: Order; className?: string }) {
  if (order.status === "CANCELED") {
    return (
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-xl bg-rose-50 p-4 text-rose-700 ring-1 ring-rose-200",
          className,
        )}
      >
        <CircleSlash className="size-4 shrink-0" />
        <p className="text-sm font-medium">{CUSTOMER_STAGE_META.CANCELED.description}</p>
      </div>
    );
  }

  const current = customerStageMeta(order.status);
  const timeline = customerTimeline(order);

  return (
    <div className={className}>
      <ol className="flex items-start">
        {CUSTOMER_FLOW.map((stage, i) => {
          const meta = CUSTOMER_STAGE_META[stage];
          const done = current.step > meta.step;
          const active = current.step === meta.step;
          const at = timeline.find((t) => t.stage === stage)?.at ?? null;

          return (
            <li key={stage} className="relative flex flex-1 flex-col items-center px-1 text-center">
              {i > 0 && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-4 right-1/2 z-0 h-1 w-full rounded-full",
                    done || active ? "bg-primary/50" : "bg-muted",
                  )}
                />
              )}
              <span
                className={cn(
                  "relative z-10 flex size-8 items-center justify-center rounded-full text-xs font-bold ring-4 ring-card",
                  done && "bg-primary/15 text-primary",
                  active && "bg-primary text-primary-foreground",
                  !done && !active && "bg-muted text-muted-foreground",
                )}
              >
                {done ? <Check className="size-4" /> : i + 1}
              </span>
              <span
                className={cn(
                  "mt-2 text-xs font-semibold sm:text-[13px]",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {meta.label}
              </span>
              <span className="num mt-0.5 text-[11px] text-muted-foreground/80">
                {at ? formatDate(at) : "-"}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-5 rounded-xl bg-accent/50 p-3.5 text-center text-[13px] font-medium text-accent-foreground">
        {current.description}
      </p>
    </div>
  );
}

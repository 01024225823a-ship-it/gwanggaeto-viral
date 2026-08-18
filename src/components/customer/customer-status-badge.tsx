import { customerStageMeta } from "@/lib/domain/customer-status";
import type { OrderStatus } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

/**
 * 광고주에게 보여주는 진행 상태 뱃지.
 * 내부 운영 상태(검수중 등)는 단순화된 단계로 변환해 표시한다.
 */
export function CustomerStatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  const meta = customerStageMeta(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        meta.className,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dotClassName)} />
      {meta.label}
    </span>
  );
}

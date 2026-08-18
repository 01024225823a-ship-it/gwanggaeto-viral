import { INQUIRY_STATUS_META, SETTLEMENT_STATUS_META, statusMeta } from "@/lib/domain/status";
import type { InquiryStatus, OrderStatus, SettlementStatus } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

const base =
  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap";

/** 주문 상태 뱃지 — 점 + 라벨 */
export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const meta = statusMeta(status);
  return (
    <span className={cn(base, meta.className, className)}>
      <span className={cn("size-1.5 rounded-full", meta.dotClassName)} />
      {meta.label}
    </span>
  );
}

export function SettlementBadge({
  status,
  className,
}: {
  status: SettlementStatus;
  className?: string;
}) {
  const meta = SETTLEMENT_STATUS_META[status];
  return <span className={cn(base, meta.className, className)}>{meta.label}</span>;
}

export function InquiryBadge({ status, className }: { status: InquiryStatus; className?: string }) {
  const meta = INQUIRY_STATUS_META[status];
  return <span className={cn(base, meta.className, className)}>{meta.label}</span>;
}

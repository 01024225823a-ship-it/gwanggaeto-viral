"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ListChecks, Play } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { FilterTabs } from "@/components/common/filter-tabs";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { findProduct, partnerOrders } from "@/lib/domain/selectors";
import type { AppData, Order } from "@/lib/domain/types";
import { formatDate, formatDday, formatNumber, formatWon, shortenUrl } from "@/lib/format";
import { useData } from "@/lib/store/data";
import { useSession } from "@/lib/store/session";
import { cn } from "@/lib/utils";

type Tab = "new" | "active" | "done";

const TAB_LABEL: Record<Tab, string> = {
  new: "신규 작업",
  active: "진행중",
  done: "완료 · 검수",
};

function matchTab(order: Order, tab: Tab): boolean {
  if (tab === "new") return order.status === "ASSIGNED";
  if (tab === "active") return order.status === "IN_PROGRESS";
  return order.status === "IN_REVIEW" || order.status === "COMPLETED";
}

export function PartnerJobsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { account } = useSession();
  const { data } = useData();

  const tab = (searchParams.get("tab") as Tab) || "new";
  const jobs = partnerOrders(data, account?.partnerId);
  const rows = jobs.filter((o) => matchTab(o, tab));

  const tabs = (["new", "active", "done"] as Tab[]).map((value) => ({
    value,
    label: TAB_LABEL[value],
    count: jobs.filter((o) => matchTab(o, value)).length,
  }));

  return (
    <>
      <PageHeader
        title="작업 관리"
        description="배정받은 작업을 시작하고 결과를 등록합니다."
      />

      <Card>
        <CardContent className="flex flex-col gap-4">
          <FilterTabs
            items={tabs}
            value={tab}
            onChange={(next) => router.push(`/partner/jobs?tab=${next}`, { scroll: false })}
          />

          {rows.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title={`${TAB_LABEL[tab]} 항목이 없습니다`}
              description="새 작업이 배정되면 이곳에 표시됩니다."
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {rows.map((order) => (
                <li key={order.orderNo}>
                  <JobCard order={order} data={data} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function JobCard({ order, data }: { order: Order; data: AppData }) {
  const { startOrder } = useData();
  const product = findProduct(data, order.productId);
  const unitLabel = product?.unitLabel ?? "";
  const settlement = (order.unitCost ?? 0) * (order.result?.doneQty ?? order.qty);

  const active = order.status !== "COMPLETED";
  const dday = order.dueDate ? formatDday(order.dueDate) : null;
  const overdue = active && (dday?.startsWith("D+") ?? false);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={`/partner/jobs/${order.orderNo}`}
          className="num text-xs text-muted-foreground hover:underline"
        >
          {order.orderNo}
        </Link>
        <div className="flex items-center gap-2">
          {dday && active && (
            <span
              className={cn(
                "num rounded px-1.5 py-0.5 text-[11px] font-semibold",
                overdue ? "bg-rose-50 text-rose-600" : "bg-muted text-muted-foreground",
              )}
            >
              기한 {dday}
            </span>
          )}
          <StatusBadge status={order.status} />
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/partner/jobs/${order.orderNo}`} className="font-medium hover:underline">
            {order.productName}
          </Link>
          <p className="num mt-1 text-[13px] text-muted-foreground">
            {formatNumber(order.qty)}
            {unitLabel} · 정산 예정 {formatWon(settlement)}
          </p>
          {order.targetUrl && (
            <p className="mt-1 truncate text-[13px] text-muted-foreground">
              작업 URL: {shortenUrl(order.targetUrl, 40)}
            </p>
          )}
          <p className="num mt-1 text-xs text-muted-foreground">
            배정 {formatDate(order.assignedAt)} · 기한 {formatDate(order.dueDate)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {order.status === "ASSIGNED" && (
            <ConfirmDialog
              trigger={
                <Button size="sm">
                  <Play />
                  작업 시작
                </Button>
              }
              title="작업을 시작할까요?"
              description="상태가 '작업중'으로 변경되고 광고주에게 진행 상황이 공유됩니다."
              confirmLabel="시작하기"
              onConfirm={() => {
                startOrder(order.orderNo);
                toast.success("작업을 시작했습니다.", { description: order.orderNo });
              }}
            />
          )}
          {order.status === "IN_PROGRESS" && (
            <Button size="sm" asChild>
              <Link href={`/partner/jobs/${order.orderNo}`}>결과 등록</Link>
            </Button>
          )}
          <Button size="sm" variant="ghost" asChild>
            <Link href={`/partner/jobs/${order.orderNo}`}>상세</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

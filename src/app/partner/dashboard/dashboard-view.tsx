"use client";

import Link from "next/link";
import { ArrowRight, ClipboardCheck, ListChecks, Play, Receipt, Timer } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { partnerOrders, settlementTotals } from "@/lib/domain/selectors";
import type { Order } from "@/lib/domain/types";
import { daysLeft, formatDate, formatDday, formatNumber, formatWon } from "@/lib/format";
import { useData } from "@/lib/store/data";
import { useSession } from "@/lib/store/session";
import { cn } from "@/lib/utils";

export function PartnerDashboardView() {
  const { account } = useSession();
  const { data, startOrder } = useData();

  const jobs = partnerOrders(data, account?.partnerId);
  const assigned = jobs.filter((o) => o.status === "ASSIGNED");
  const inProgress = jobs.filter((o) => o.status === "IN_PROGRESS");
  const inReview = jobs.filter((o) => o.status === "IN_REVIEW");
  const settlement = settlementTotals(data, account?.partnerId);

  /** 마감 임박순 — 기한이 있는 진행중 작업 */
  const upcoming = [...assigned, ...inProgress]
    .filter((o) => o.dueDate)
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
    .slice(0, 5);

  return (
    <>
      <PageHeader
        title={`${account?.org ?? "실행사"} 작업 현황`}
        description="배정받은 작업과 정산 예정 금액을 확인하세요."
        actions={
          <Button size="lg" asChild>
            <Link href="/partner/jobs?tab=new">작업 목록</Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="신규 배정"
            value={`${assigned.length}건`}
            sub="작업 시작 대기중"
            icon={ListChecks}
            tone="primary"
            href="/partner/jobs?tab=new"
          />
          <StatCard
            label="진행중 작업"
            value={`${inProgress.length}건`}
            sub="결과 등록 필요"
            icon={Timer}
            tone="amber"
            href="/partner/jobs?tab=active"
          />
          <StatCard
            label="검수 대기"
            value={`${inReview.length}건`}
            sub="관리자 확인중"
            icon={ClipboardCheck}
            tone="sky"
            href="/partner/jobs?tab=done"
          />
          <StatCard
            label="정산 예정액"
            value={formatWon(settlement.pending + settlement.scheduled)}
            sub={`지급 완료 ${formatWon(settlement.paid)}`}
            icon={Receipt}
            tone="emerald"
            href="/partner/settlements"
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>신규 배정 작업</CardTitle>
              <Link
                href="/partner/jobs?tab=new"
                className="inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"
              >
                전체보기
                <ArrowRight className="size-3.5" />
              </Link>
            </CardHeader>
            <CardContent>
              {assigned.length === 0 ? (
                <EmptyState icon={ListChecks} title="새로 배정된 작업이 없습니다" />
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {assigned.slice(0, 4).map((order) => (
                    <li
                      key={order.orderNo}
                      className="flex flex-col gap-2.5 rounded-lg border border-border p-3.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          href={`/partner/jobs/${order.orderNo}`}
                          className="num text-xs text-muted-foreground hover:underline"
                        >
                          {order.orderNo}
                        </Link>
                        <StatusBadge status={order.status} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{order.productName}</p>
                        <p className="num mt-0.5 text-[13px] text-muted-foreground">
                          {formatNumber(order.qty)} · 정산 예정{" "}
                          {formatWon((order.unitCost ?? 0) * order.qty)} · 기한{" "}
                          {formatDate(order.dueDate)}
                        </p>
                      </div>
                      <div className="flex justify-end">
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
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-5">
            <Card>
              <CardHeader>
                <CardTitle>마감 임박 작업</CardTitle>
              </CardHeader>
              <CardContent>
                {upcoming.length === 0 ? (
                  <EmptyState icon={Timer} title="예정된 작업이 없습니다" />
                ) : (
                  <ul className="flex flex-col">
                    {upcoming.map((order, i) => (
                      <li key={order.orderNo}>
                        {i > 0 && <Separator />}
                        <DueRow order={order} />
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>정산 요약</CardTitle>
                <Link
                  href="/partner/settlements"
                  className="inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"
                >
                  정산내역
                  <ArrowRight className="size-3.5" />
                </Link>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-2 text-center">
                <SettlementBox label="정산대기" value={settlement.pending} />
                <SettlementBox label="정산예정" value={settlement.scheduled} tone="amber" />
                <SettlementBox label="지급완료" value={settlement.paid} tone="emerald" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

function DueRow({ order }: { order: Order }) {
  const left = daysLeft(order.dueDate);
  const overdue = left !== null && left < 0;
  const urgent = left !== null && left >= 0 && left <= 2;

  return (
    <Link
      href={`/partner/jobs/${order.orderNo}`}
      className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/50"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{order.productName}</p>
        <p className="num mt-0.5 text-xs text-muted-foreground">
          {order.orderNo} · {formatDate(order.dueDate)}
        </p>
      </div>
      <span
        className={cn(
          "num shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold",
          overdue
            ? "bg-rose-50 text-rose-600"
            : urgent
              ? "bg-amber-50 text-amber-700"
              : "bg-muted text-muted-foreground",
        )}
      >
        {formatDday(order.dueDate)}
      </span>
    </Link>
  );
}

function SettlementBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "amber" | "emerald";
}) {
  return (
    <div className="rounded-lg bg-muted/60 p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "num mt-1 text-sm font-semibold",
          tone === "amber" && "text-amber-600",
          tone === "emerald" && "text-emerald-600",
        )}
      >
        {formatWon(value)}
      </p>
    </div>
  );
}

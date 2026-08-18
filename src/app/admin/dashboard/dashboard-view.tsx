"use client";

import Link from "next/link";
import {
  ArrowRight,
  ClipboardCheck,
  Headphones,
  Inbox,
  Timer,
  TrendingUp,
} from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { InquiryBadge, StatusBadge } from "@/components/common/status-badge";
import { AssignDialog } from "@/components/order/assign-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { customerName, orderStats, partnerName } from "@/lib/domain/selectors";
import { INQUIRY_CATEGORY_LABEL } from "@/lib/domain/status";
import type { Order } from "@/lib/domain/types";
import { formatDate, formatDday, formatNumber, formatPercent, formatWon } from "@/lib/format";
import { useData } from "@/lib/store/data";
import { cn } from "@/lib/utils";

export function AdminDashboardView() {
  const { data } = useData();
  const stats = orderStats(data.orders);

  const waiting = data.orders.filter((o) => o.status === "RECEIVED");
  const reviewQueue = data.orders.filter((o) => o.status === "IN_REVIEW");
  const openInquiries = data.inquiries.filter((i) => i.status === "OPEN");

  /** 이번 달 매출/마진 — 주문일 기준 */
  const now = new Date();
  const monthly = data.orders.reduce(
    (acc, order) => {
      const d = new Date(order.createdAt);
      if (
        order.status === "CANCELED" ||
        d.getFullYear() !== now.getFullYear() ||
        d.getMonth() !== now.getMonth()
      ) {
        return acc;
      }
      const cost = (order.unitCost ?? 0) * (order.result?.doneQty ?? order.qty);
      return { revenue: acc.revenue + order.amount, cost: acc.cost + cost, count: acc.count + 1 };
    },
    { revenue: 0, cost: 0, count: 0 },
  );
  const monthlyMargin = monthly.revenue - monthly.cost;
  const marginRate = monthly.revenue > 0 ? (monthlyMargin / monthly.revenue) * 100 : 0;

  return (
    <>
      <PageHeader
        title="운영 대시보드"
        description="배정과 검수가 필요한 주문을 먼저 확인하세요."
      />

      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="배정 대기"
            value={`${waiting.length}건`}
            sub="실행사 배정이 필요합니다"
            icon={Inbox}
            tone="primary"
            href="/admin/orders"
          />
          <StatCard
            label="진행중 작업"
            value={`${stats.byStatus.ASSIGNED + stats.byStatus.IN_PROGRESS}건`}
            sub={`전체 진행 ${stats.active}건`}
            icon={Timer}
            tone="amber"
            href="/admin/orders"
          />
          <StatCard
            label="검수 대기"
            value={`${reviewQueue.length}건`}
            sub="결과 확인이 필요합니다"
            icon={ClipboardCheck}
            tone="sky"
            href="/admin/reviews"
          />
          <StatCard
            label="이번 달 매출"
            value={formatWon(monthly.revenue)}
            sub={`마진 ${formatWon(monthlyMargin)} · ${formatPercent(marginRate)}`}
            icon={TrendingUp}
            tone="emerald"
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>배정 대기 주문</CardTitle>
              <SeeAll href="/admin/orders" />
            </CardHeader>
            <CardContent>
              {waiting.length === 0 ? (
                <EmptyState title="배정 대기중인 주문이 없습니다" />
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {waiting.slice(0, 4).map((order) => (
                    <li
                      key={order.orderNo}
                      className="flex flex-col gap-2.5 rounded-lg border border-border p-3.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          href={`/admin/orders/${order.orderNo}`}
                          className="num text-xs text-muted-foreground hover:underline"
                        >
                          {order.orderNo}
                        </Link>
                        <span className="num text-xs text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{order.productName}</p>
                        <p className="num mt-0.5 text-[13px] text-muted-foreground">
                          {customerName(data, order.customerId)} · {formatNumber(order.qty)} ·{" "}
                          {formatWon(order.amount)}
                        </p>
                      </div>
                      <div className="flex justify-end">
                        <AssignDialog order={order} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>검수 대기</CardTitle>
              <SeeAll href="/admin/reviews" />
            </CardHeader>
            <CardContent>
              {reviewQueue.length === 0 ? (
                <EmptyState title="검수 대기중인 작업이 없습니다" />
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {reviewQueue.slice(0, 4).map((order) => (
                    <li key={order.orderNo}>
                      <ReviewRow order={order} partner={partnerName(data, order.partnerId)} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>미답변 문의</CardTitle>
              <SeeAll href="/admin/inquiries" />
            </CardHeader>
            <CardContent>
              {openInquiries.length === 0 ? (
                <EmptyState icon={Headphones} title="미답변 문의가 없습니다" />
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {openInquiries.slice(0, 4).map((inquiry) => (
                    <li
                      key={inquiry.id}
                      className="flex items-start gap-3 rounded-lg border border-border p-3.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{inquiry.title}</p>
                        <p className="num mt-0.5 text-[13px] text-muted-foreground">
                          {customerName(data, inquiry.customerId)} ·{" "}
                          {INQUIRY_CATEGORY_LABEL[inquiry.category]} · {formatDate(inquiry.createdAt)}
                        </p>
                      </div>
                      <InquiryBadge status={inquiry.status} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>실행사별 진행 현황</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2.5">
              {data.partners.map((partner) => {
                const rows = data.orders.filter((o) => o.partnerId === partner.id);
                const active = rows.filter(
                  (o) => o.status === "ASSIGNED" || o.status === "IN_PROGRESS",
                ).length;
                const review = rows.filter((o) => o.status === "IN_REVIEW").length;
                const done = rows.filter((o) => o.status === "COMPLETED").length;
                return (
                  <div
                    key={partner.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border px-3.5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{partner.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{partner.specialty}</p>
                    </div>
                    <div className="num flex shrink-0 items-center gap-3 text-[13px]">
                      <Count label="진행" value={active} tone="amber" />
                      <Count label="검수" value={review} tone="sky" />
                      <Count label="완료" value={done} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function SeeAll({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"
    >
      전체보기
      <ArrowRight className="size-3.5" />
    </Link>
  );
}

function Count({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "amber" | "sky";
}) {
  return (
    <span className="flex flex-col items-center">
      <span
        className={cn(
          "font-semibold",
          tone === "amber" && value > 0 && "text-amber-600",
          tone === "sky" && value > 0 && "text-sky-600",
        )}
      >
        {value}
      </span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </span>
  );
}

function ReviewRow({ order, partner }: { order: Order; partner: string }) {
  const dday = order.dueDate ? formatDday(order.dueDate) : null;
  const overdue = dday?.startsWith("D+") ?? false;

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-border p-3.5">
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/admin/orders/${order.orderNo}`}
          className="num text-xs text-muted-foreground hover:underline"
        >
          {order.orderNo}
        </Link>
        <StatusBadge status={order.status} />
      </div>
      <div className="min-w-0">
        <p className="truncate font-medium">{order.productName}</p>
        <p className="num mt-0.5 text-[13px] text-muted-foreground">
          {partner} · 제출 {formatDate(order.submittedAt)}
          {dday && (
            <span className={cn("ml-1.5", overdue && "font-semibold text-rose-600")}>({dday})</span>
          )}
        </p>
      </div>
      <div className="flex justify-end">
        <Button size="sm" variant="outline" asChild>
          <Link href={`/admin/orders/${order.orderNo}`}>검수하기</Link>
        </Button>
      </div>
    </div>
  );
}

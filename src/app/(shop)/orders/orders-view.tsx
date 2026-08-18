"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, ClipboardList, Search } from "lucide-react";
import { CustomerStatusBadge } from "@/components/customer/customer-status-badge";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CUSTOMER_FILTER_STAGES,
  CUSTOMER_STAGE_META,
  customerStage,
  type CustomerStage,
} from "@/lib/domain/customer-status";
import { customerOrders } from "@/lib/domain/selectors";
import type { Order } from "@/lib/domain/types";
import { formatDate, formatNumber, formatPoint } from "@/lib/format";
import { useData } from "@/lib/store/data";
import { useSession } from "@/lib/store/session";
import { cn } from "@/lib/utils";

type Filter = CustomerStage | "ALL";

export function OrdersView() {
  const { account } = useSession();
  const { data } = useData();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [keyword, setKeyword] = useState("");

  const orders = customerOrders(data, account?.customerId);

  const tabs = [
    { value: "ALL" as const, label: "전체", count: orders.length },
    ...CUSTOMER_FILTER_STAGES.map((stage) => ({
      value: stage,
      label: CUSTOMER_STAGE_META[stage].label,
      count: orders.filter((o) => customerStage(o.status) === stage).length,
    })),
  ];

  const q = keyword.trim().toLowerCase();
  const rows = orders.filter((order) => {
    if (filter !== "ALL" && customerStage(order.status) !== filter) return false;
    if (!q) return true;
    return order.orderNo.toLowerCase().includes(q) || order.productName.toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">주문내역</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            주문한 서비스의 진행 상황과 결과를 확인할 수 있어요.
          </p>
        </div>
        <Button asChild>
          <Link href="/services">새 주문하기</Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="scrollbar-thin -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
          {tabs.map((tab) => {
            const active = tab.value === filter;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setFilter(tab.value)}
                aria-pressed={active}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {tab.label}
                <span className={cn("num", active ? "opacity-80" : "opacity-70")}>{tab.count}</span>
              </button>
            );
          })}
        </div>

        <div className="relative sm:w-64">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="주문번호 · 서비스명 검색"
            className="h-10 rounded-xl pl-9"
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-border">
          <EmptyState
            icon={ClipboardList}
            title={orders.length === 0 ? "아직 주문이 없어요" : "조건에 맞는 주문이 없어요"}
            description={
              orders.length === 0
                ? "필요한 마케팅 서비스를 골라 첫 주문을 해보세요."
                : "다른 상태나 검색어로 찾아보세요."
            }
            action={
              orders.length === 0 ? (
                <Button asChild>
                  <Link href="/services">서비스 둘러보기</Link>
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {rows.map((order) => (
            <li key={order.orderNo}>
              <OrderRow order={order} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** 데스크톱에서는 한 줄, 모바일에서는 카드처럼 보이는 주문 행 */
function OrderRow({ order }: { order: Order }) {
  return (
    <Link
      href={`/orders/${order.orderNo}`}
      className="flex flex-col gap-3 rounded-2xl border border-border p-4 transition-colors hover:border-primary/40 hover:bg-accent/30 sm:flex-row sm:items-center sm:gap-4 sm:px-5"
    >
      <div className="min-w-0 sm:flex-1">
        <p className="num text-[11px] text-muted-foreground">
          {order.orderNo} · {formatDate(order.createdAt)}
        </p>
        <p className="mt-0.5 truncate text-[15px] font-semibold">{order.productName}</p>
      </div>

      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <div className="text-left sm:text-right">
          <p className="num text-[11px] text-muted-foreground">
            수량 {formatNumber(order.qty)}
          </p>
          <p className="num text-[15px] font-bold">{formatPoint(order.amount)}</p>
        </div>
        <div className="flex items-center gap-1.5 sm:w-32 sm:justify-end">
          <CustomerStatusBadge status={order.status} />
          <ChevronRight className="hidden size-4 shrink-0 text-muted-foreground sm:block" />
        </div>
      </div>
    </Link>
  );
}

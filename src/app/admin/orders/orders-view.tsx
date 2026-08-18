"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardList, Search } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { FilterTabs } from "@/components/common/filter-tabs";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { AssignDialog } from "@/components/order/assign-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { customerName, partnerName } from "@/lib/domain/selectors";
import { ORDER_FILTER_STATUSES, statusLabel } from "@/lib/domain/status";
import type { AppData, Order, OrderStatus } from "@/lib/domain/types";
import { formatDate, formatDday, formatNumber, formatWon } from "@/lib/format";
import { useData } from "@/lib/store/data";
import { cn } from "@/lib/utils";

type Filter = OrderStatus | "ALL";

export function AdminOrdersView() {
  const { data } = useData();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [keyword, setKeyword] = useState("");

  const orders = data.orders;

  const tabs = [
    { value: "ALL" as const, label: "전체", count: orders.length },
    ...ORDER_FILTER_STATUSES.map((status) => ({
      value: status,
      label: statusLabel(status),
      count: orders.filter((o) => o.status === status).length,
    })),
  ];

  const q = keyword.trim().toLowerCase();
  const rows = orders.filter((order) => {
    if (filter !== "ALL" && order.status !== filter) return false;
    if (!q) return true;
    return (
      order.orderNo.toLowerCase().includes(q) ||
      order.productName.toLowerCase().includes(q) ||
      customerName(data, order.customerId).toLowerCase().includes(q)
    );
  });

  const waiting = orders.filter((o) => o.status === "RECEIVED").length;

  return (
    <>
      <PageHeader
        title="주문관리"
        description={
          waiting > 0
            ? `배정 대기중인 주문이 ${waiting}건 있습니다.`
            : "접수된 모든 주문을 관리하고 실행사를 배정합니다."
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <FilterTabs items={tabs} value={filter} onChange={setFilter} />
            <div className="relative sm:w-72">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="주문번호 · 광고주 · 서비스 검색"
                className="pl-8"
              />
            </div>
          </div>

          {rows.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="주문이 없습니다"
              description="조건에 맞는 주문이 없습니다."
            />
          ) : (
            <div className="scrollbar-thin overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>주문번호</TableHead>
                    <TableHead>광고주</TableHead>
                    <TableHead>서비스</TableHead>
                    <TableHead className="text-right">수량</TableHead>
                    <TableHead className="text-right">주문금액</TableHead>
                    <TableHead>실행사</TableHead>
                    <TableHead>작업기한</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((order) => (
                    <AdminOrderRow key={order.orderNo} order={order} data={data} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function AdminOrderRow({ order, data }: { order: Order; data: AppData }) {
  const dday = order.dueDate ? formatDday(order.dueDate) : null;
  const active = order.status !== "COMPLETED" && order.status !== "CANCELED";
  const overdue = active && (dday?.startsWith("D+") ?? false);

  return (
    <TableRow>
      <TableCell className="num font-medium whitespace-nowrap">
        <Link href={`/admin/orders/${order.orderNo}`} className="hover:underline">
          {order.orderNo}
        </Link>
        <p className="num text-xs font-normal text-muted-foreground">
          {formatDate(order.createdAt)}
        </p>
      </TableCell>
      <TableCell className="max-w-40 truncate">{customerName(data, order.customerId)}</TableCell>
      <TableCell className="max-w-48 truncate">{order.productName}</TableCell>
      <TableCell className="num text-right">{formatNumber(order.qty)}</TableCell>
      <TableCell className="num text-right whitespace-nowrap">{formatWon(order.amount)}</TableCell>
      <TableCell className="whitespace-nowrap">
        {order.partnerId ? (
          partnerName(data, order.partnerId)
        ) : (
          <span className="text-muted-foreground">미배정</span>
        )}
      </TableCell>
      <TableCell className="num whitespace-nowrap">
        {order.dueDate ? (
          <span className="flex items-center gap-1.5">
            <span className="text-muted-foreground">{formatDate(order.dueDate)}</span>
            {active && (
              <span
                className={cn(
                  "rounded px-1 py-0.5 text-[11px] font-semibold",
                  overdue ? "bg-rose-50 text-rose-600" : "bg-muted text-muted-foreground",
                )}
              >
                {dday}
              </span>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        <StatusBadge status={order.status} />
      </TableCell>
      <TableCell className="text-right">
        {order.status === "RECEIVED" ? (
          <AssignDialog order={order} />
        ) : order.status === "IN_REVIEW" ? (
          <Button size="sm" variant="outline" asChild>
            <Link href={`/admin/orders/${order.orderNo}`}>검수하기</Link>
          </Button>
        ) : (
          <Button size="sm" variant="ghost" asChild>
            <Link href={`/admin/orders/${order.orderNo}`}>상세</Link>
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

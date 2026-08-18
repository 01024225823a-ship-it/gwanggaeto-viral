"use client";

import Link from "next/link";
import { FileSearch } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { AssignDialog } from "@/components/order/assign-dialog";
import {
  DetailRow,
  OrderHistoryList,
  OrderInfoCard,
  OrderResultCard,
} from "@/components/order/order-detail-parts";
import { OrderStepper } from "@/components/order/order-stepper";
import {
  ApproveButton,
  CancelOrderDialog,
  RevisionDialog,
} from "@/components/order/review-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { findOrder, partnerName } from "@/lib/domain/selectors";
import { formatDate, formatDday, formatPercent, formatWon } from "@/lib/format";
import { useData } from "@/lib/store/data";

export function AdminOrderDetailView({ orderNo }: { orderNo: string }) {
  const { data } = useData();
  const order = findOrder(data, orderNo);

  if (!order) {
    return (
      <>
        <PageHeader title="주문 상세" backHref="/admin/orders" />
        <Card>
          <EmptyState
            icon={FileSearch}
            title="주문을 찾을 수 없습니다"
            description="삭제되었거나 존재하지 않는 주문번호입니다."
            action={
              <Button asChild>
                <Link href="/admin/orders">주문관리로</Link>
              </Button>
            }
          />
        </Card>
      </>
    );
  }

  const active = order.status !== "COMPLETED" && order.status !== "CANCELED";
  const doneQty = order.result?.doneQty ?? order.qty;
  const cost = (order.unitCost ?? 0) * doneQty;
  const margin = order.amount - cost;
  const marginRate = order.amount > 0 ? (margin / order.amount) * 100 : 0;

  return (
    <>
      <PageHeader
        title={<span className="num">{order.orderNo}</span>}
        description={order.productName}
        backHref="/admin/orders"
        backLabel="주문관리로"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={order.status} className="px-2.5 py-1 text-[13px]" />
            {order.status === "RECEIVED" && (
              <>
                <AssignDialog order={order} />
                <CancelOrderDialog order={order} />
              </>
            )}
            {(order.status === "ASSIGNED" || order.status === "IN_PROGRESS") && (
              <AssignDialog
                order={order}
                trigger={
                  <Button size="sm" variant="outline">
                    실행사 변경
                  </Button>
                }
              />
            )}
            {order.status === "IN_REVIEW" && (
              <>
                <RevisionDialog order={order} />
                <ApproveButton order={order} />
              </>
            )}
          </div>
        }
      />

      <div className="flex flex-col gap-5">
        <Card>
          <CardContent>
            <OrderStepper order={order} />
          </CardContent>
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <OrderInfoCard order={order} data={data} showCustomer />

          <Card>
            <CardHeader>
              <CardTitle>배정 · 정산</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <DetailRow
                label="실행사"
                value={order.partnerId ? partnerName(data, order.partnerId) : "미배정"}
              />
              <DetailRow label="배정일" value={formatDate(order.assignedAt)} />
              <DetailRow
                label="작업기한"
                value={
                  order.dueDate ? (
                    <span className="flex items-center justify-end gap-1.5">
                      {formatDate(order.dueDate)}
                      {active && (
                        <span className="rounded bg-muted px-1 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          {formatDday(order.dueDate)}
                        </span>
                      )}
                    </span>
                  ) : (
                    "-"
                  )
                }
              />
              <Separator />
              <DetailRow label="주문금액" value={formatWon(order.amount)} />
              <DetailRow
                label="매입단가"
                value={order.unitCost !== undefined ? formatWon(order.unitCost) : "-"}
              />
              <DetailRow label="매입원가" value={formatWon(cost)} />
              <DetailRow
                label="마진"
                value={
                  <span className="text-base font-semibold text-primary">
                    {formatWon(margin)} · {formatPercent(marginRate)}
                  </span>
                }
              />

              <Separator />
              <span className="text-muted-foreground">진행 이력</span>
              <OrderHistoryList order={order} />
            </CardContent>
          </Card>
        </div>

        <OrderResultCard
          order={order}
          actions={
            order.status === "IN_REVIEW" ? (
              <>
                <RevisionDialog order={order} />
                <ApproveButton order={order} />
              </>
            ) : undefined
          }
        />
      </div>
    </>
  );
}

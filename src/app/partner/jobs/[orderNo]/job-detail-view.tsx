"use client";

import Link from "next/link";
import { FileSearch, Play } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { FileList } from "@/components/common/file-picker";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import {
  DetailRow,
  ExternalUrl,
  OrderHistoryList,
  OrderResultCard,
} from "@/components/order/order-detail-parts";
import { OrderStepper } from "@/components/order/order-stepper";
import { ResultForm } from "@/components/order/result-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { orderUrlLabel } from "@/lib/domain/order-form";
import { categoryName, findOrder, findProduct } from "@/lib/domain/selectors";
import { formatDate, formatDateTime, formatDday, formatNumber, formatWon } from "@/lib/format";
import { useData } from "@/lib/store/data";
import { useSession } from "@/lib/store/session";

export function PartnerJobDetailView({ orderNo }: { orderNo: string }) {
  const { account } = useSession();
  const { data, startOrder } = useData();

  const order = findOrder(data, orderNo);

  // 자신에게 배정된 작업만 열람할 수 있다
  if (!order || order.partnerId !== account?.partnerId) {
    return (
      <>
        <PageHeader title="작업 상세" backHref="/partner/jobs?tab=new" />
        <Card>
          <EmptyState
            icon={FileSearch}
            title="작업을 찾을 수 없습니다"
            description="배정되지 않았거나 존재하지 않는 작업입니다."
            action={
              <Button asChild>
                <Link href="/partner/jobs?tab=new">작업 목록으로</Link>
              </Button>
            }
          />
        </Card>
      </>
    );
  }

  const product = findProduct(data, order.productId);
  const unitLabel = product?.unitLabel ?? "";
  const doneQty = order.result?.doneQty ?? order.qty;
  const settlement = (order.unitCost ?? 0) * doneQty;
  const active = order.status !== "COMPLETED" && order.status !== "CANCELED";

  return (
    <>
      <PageHeader
        title={<span className="num">{order.orderNo}</span>}
        description={order.productName}
        backHref="/partner/jobs?tab=new"
        backLabel="작업 목록으로"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={order.status} className="px-2.5 py-1 text-[13px]" />
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
          <Card>
            <CardHeader>
              <CardTitle>작업 정보</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <DetailRow label="카테고리" value={categoryName(data, order.categoryId)} />
              <DetailRow label="서비스" value={order.productName} />
              <DetailRow
                label="작업 수량"
                value={`${formatNumber(order.qty)}${unitLabel}`}
              />
              {order.targetUrl && (
                <DetailRow
                  label={orderUrlLabel(data, order.categoryId)}
                  value={<ExternalUrl url={order.targetUrl} />}
                />
              )}
              {order.requestNote && (
                <div className="flex flex-col gap-1.5 pt-1">
                  <span className="text-muted-foreground">광고주 요청사항</span>
                  <p className="rounded-lg bg-muted/60 p-3 whitespace-pre-wrap">
                    {order.requestNote}
                  </p>
                </div>
              )}
              {order.files.length > 0 && (
                <div className="flex flex-col gap-1.5 pt-1">
                  <span className="text-muted-foreground">참고자료</span>
                  <FileList files={order.files} />
                </div>
              )}
              {product?.guide?.length ? (
                <div className="flex flex-col gap-1.5 pt-1">
                  <span className="text-muted-foreground">서비스 안내</span>
                  <ul className="flex list-disc flex-col gap-1 pl-4 text-[13px] text-muted-foreground">
                    {product.guide.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>일정 · 정산</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <DetailRow label="배정일" value={formatDateTime(order.assignedAt)} />
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
              <DetailRow label="작업 시작" value={formatDate(order.startedAt)} />
              <DetailRow label="결과 등록" value={formatDate(order.submittedAt)} />
              <DetailRow label="작업 완료" value={formatDate(order.completedAt)} />
              <Separator />
              <DetailRow
                label="매입단가"
                value={order.unitCost !== undefined ? formatWon(order.unitCost) : "-"}
              />
              <DetailRow
                label="정산 예정액"
                value={
                  <span className="text-base font-semibold text-primary">
                    {formatWon(settlement)}
                  </span>
                }
              />

              <Separator />
              <span className="text-muted-foreground">진행 이력</span>
              <OrderHistoryList order={order} />
            </CardContent>
          </Card>
        </div>

        {order.status === "IN_PROGRESS" ? (
          <ResultForm order={order} unitLabel={unitLabel} />
        ) : (
          <OrderResultCard order={order} />
        )}
      </div>
    </>
  );
}

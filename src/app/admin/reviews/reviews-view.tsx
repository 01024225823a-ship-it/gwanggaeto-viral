"use client";

import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { FileList } from "@/components/common/file-picker";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { DetailRow, ExternalUrl, OrderCafeInfo } from "@/components/order/order-detail-parts";
import { ApproveButton, RevisionDialog } from "@/components/order/review-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { orderUrlLabel } from "@/lib/domain/order-form";
import { customerName, findProduct, partnerName } from "@/lib/domain/selectors";
import type { AppData, Order } from "@/lib/domain/types";
import { formatDateTime, formatNumber, formatWon } from "@/lib/format";
import { useData } from "@/lib/store/data";

export function AdminReviewsView() {
  const { data } = useData();

  // 오래 대기한 건부터 처리하도록 제출 시각 오름차순으로 정렬한다
  const queue = data.orders
    .filter((o) => o.status === "IN_REVIEW")
    .sort((a, b) => (a.submittedAt ?? "").localeCompare(b.submittedAt ?? ""));

  return (
    <>
      <PageHeader
        title="검수관리"
        description={
          queue.length > 0
            ? `검수 대기중인 작업이 ${queue.length}건 있습니다. 승인하면 광고주에게 결과가 공개됩니다.`
            : "실행사가 제출한 작업 결과를 검수합니다."
        }
      />

      {queue.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardCheck}
            title="검수 대기중인 작업이 없습니다"
            description="실행사가 결과를 제출하면 이곳에 표시됩니다."
            action={
              <Button variant="outline" asChild>
                <Link href="/admin/orders">주문관리로</Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <ul className="flex flex-col gap-5">
          {queue.map((order) => (
            <li key={order.orderNo}>
              <ReviewCard order={order} data={data} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function ReviewCard({ order, data }: { order: Order; data: AppData }) {
  const product = findProduct(data, order.productId);
  const unitLabel = product?.unitLabel ?? "";
  const result = order.result;
  const doneQty = result?.doneQty ?? order.qty;
  const partial = doneQty < order.qty;
  const settlement = (order.unitCost ?? 0) * doneQty;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Link
              href={`/admin/orders/${order.orderNo}`}
              className="num text-sm font-medium hover:underline"
            >
              {order.orderNo}
            </Link>
            <StatusBadge status={order.status} />
          </div>
          <span className="num text-xs text-muted-foreground">
            제출 {formatDateTime(order.submittedAt)}
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* 주문 내용 */}
          <div className="flex flex-col gap-3 text-sm">
            <p className="font-medium">{order.productName}</p>
            <DetailRow label="광고주" value={customerName(data, order.customerId)} />
            <DetailRow label="실행사" value={partnerName(data, order.partnerId)} />
            <DetailRow
              label="주문 수량"
              value={`${formatNumber(order.qty)}${unitLabel}`}
            />
            <DetailRow label="정산 예정액" value={formatWon(settlement)} />
            {order.targetUrl && (
              <DetailRow
                label={orderUrlLabel(data, order.categoryId)}
                value={<ExternalUrl url={order.targetUrl} />}
              />
            )}
            <OrderCafeInfo order={order} />
            {order.requestNote && (
              <div className="flex flex-col gap-1.5">
                <span className="text-muted-foreground">광고주 요청사항</span>
                <p className="rounded-lg bg-muted/60 p-3 whitespace-pre-wrap">
                  {order.requestNote}
                </p>
              </div>
            )}
          </div>

          {/* 제출 결과 */}
          <div className="flex flex-col gap-3 rounded-xl bg-muted/40 p-4 text-sm">
            <p className="font-medium">제출된 작업 결과</p>
            <DetailRow
              label="완료 수량"
              value={
                <span className={partial ? "text-amber-600" : undefined}>
                  {formatNumber(doneQty)} / {formatNumber(order.qty)}
                  {unitLabel}
                  {partial && " (부분 완료)"}
                </span>
              }
            />

            {result?.resultUrls.length ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-muted-foreground">결과 링크</span>
                <ul className="flex flex-col gap-1.5">
                  {result.resultUrls.map((url) => (
                    <li key={url}>
                      <ExternalUrl url={url} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {result?.memo && (
              <div className="flex flex-col gap-1.5">
                <span className="text-muted-foreground">실행사 메모</span>
                <p className="whitespace-pre-wrap">{result.memo}</p>
              </div>
            )}

            {result?.files.length ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-muted-foreground">결과 파일</span>
                <FileList files={result.files} />
              </div>
            ) : null}
          </div>
        </div>

        <Separator />

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button size="sm" variant="ghost" asChild>
            <Link href={`/admin/orders/${order.orderNo}`}>주문 상세</Link>
          </Button>
          <RevisionDialog order={order} />
          <ApproveButton order={order} />
        </div>
      </CardContent>
    </Card>
  );
}

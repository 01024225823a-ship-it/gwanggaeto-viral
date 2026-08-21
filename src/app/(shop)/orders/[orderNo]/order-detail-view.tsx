"use client";

import Link from "next/link";
import { CheckCircle2, ChevronLeft, FileSearch, Headphones, Link2 } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { FileList } from "@/components/common/file-picker";
import { CustomerStatusBadge } from "@/components/customer/customer-status-badge";
import { CustomerStepper } from "@/components/customer/customer-stepper";
import { ExternalUrl } from "@/components/order/order-detail-parts";
import { Button } from "@/components/ui/button";
import { customerStageMeta, customerTimeline } from "@/lib/domain/customer-status";
import { orderUrlLabel } from "@/lib/domain/order-form";
import { categoryName, findOrder, findProduct } from "@/lib/domain/selectors";
import type { Order } from "@/lib/domain/types";
import {
  formatDate,
  formatDateTime,
  formatNumber,
  formatPoint,
  formatWon,
} from "@/lib/format";
import { useData } from "@/lib/store/data";
import { useSession } from "@/lib/store/session";
import { cn } from "@/lib/utils";

export function OrderDetailView({ orderNo }: { orderNo: string }) {
  const { account } = useSession();
  const { data } = useData();

  const order = findOrder(data, orderNo);

  // 다른 광고주의 주문은 열람할 수 없다 (향후 서버 권한 검증으로 이관)
  if (!order || order.customerId !== account?.customerId) {
    return (
      <div className="rounded-2xl border border-border">
        <EmptyState
          icon={FileSearch}
          title="주문을 찾을 수 없습니다"
          description="삭제되었거나 접근 권한이 없는 주문입니다."
          action={
            <Button asChild>
              <Link href="/orders">주문내역으로</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const product = findProduct(data, order.productId);
  const unitLabel = product?.unitLabel ?? "";
  const done = order.status === "COMPLETED";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href="/orders"
          className="inline-flex w-fit items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          주문내역으로
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{order.productName}</h1>
            <p className="num mt-1 text-[13px] text-muted-foreground">
              주문번호 {order.orderNo} · {formatDateTime(order.createdAt)}
            </p>
          </div>
          <CustomerStatusBadge status={order.status} className="px-3 py-1.5 text-[13px]" />
        </div>
      </div>

      {/* 진행 단계 */}
      <section className="rounded-2xl border border-border p-5 sm:p-6">
        <CustomerStepper order={order} />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* 주문 정보 */}
        <section className="flex flex-col gap-3 rounded-2xl border border-border p-5">
          <h2 className="text-[15px] font-bold">주문 정보</h2>
          <dl className="flex flex-col gap-2.5 text-sm">
            <Row label="카테고리" value={categoryName(data, order.categoryId)} />
            <Row label="서비스" value={order.productName} />
            <Row label="수량" value={`${formatNumber(order.qty)}${unitLabel}`} />
            <Row label="단가" value={`${formatWon(order.unitPrice)} / ${unitLabel}`} />
            <div className="my-1 border-t border-border" />
            <Row
              label="주문금액"
              value={
                <span className="text-base font-bold text-primary">
                  {formatPoint(order.amount)}
                </span>
              }
            />
            {order.targetUrl && (
              <Row
                label={orderUrlLabel(data, order.categoryId)}
                value={<ExternalUrl url={order.targetUrl} />}
              />
            )}
          </dl>

          {order.requestNote && (
            <div className="mt-1 flex flex-col gap-1.5">
              <span className="text-[13px] text-muted-foreground">요청사항</span>
              <p className="rounded-xl bg-muted/50 p-3.5 text-sm whitespace-pre-wrap">
                {order.requestNote}
              </p>
            </div>
          )}

          {order.files.length > 0 && (
            <div className="mt-1 flex flex-col gap-1.5">
              <span className="text-[13px] text-muted-foreground">첨부파일</span>
              <FileList files={order.files} />
            </div>
          )}
        </section>

        {/* 진행 상황 */}
        <section className="flex flex-col gap-3 rounded-2xl border border-border p-5">
          <h2 className="text-[15px] font-bold">진행 상황</h2>
          <dl className="flex flex-col gap-2.5 text-sm">
            <Row label="주문일" value={formatDate(order.createdAt)} />
            {order.dueDate && order.status !== "CANCELED" && (
              <Row
                label={done ? "작업 완료일" : "완료 예정일"}
                value={formatDate(done ? order.completedAt : order.dueDate)}
              />
            )}
          </dl>

          <ol className="mt-1 flex flex-col gap-3.5">
            {customerTimeline(order).map((entry) => {
              const reached = Boolean(entry.at);
              return (
                <li key={entry.stage} className="flex gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                      reached ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground/50",
                    )}
                  >
                    <CheckCircle2 className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-[13px] font-semibold",
                        reached ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {entry.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {reached ? `${formatDateTime(entry.at)} · ${entry.note}` : "대기중"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="mt-auto flex items-center justify-between gap-3 rounded-xl bg-muted/50 p-3.5">
            <p className="text-[13px] text-muted-foreground">
              진행 상황이 궁금하신가요?
            </p>
            <Button size="sm" variant="outline" asChild>
              <Link href="/support">
                <Headphones />
                문의하기
              </Link>
            </Button>
          </div>
        </section>
      </div>

      {/* 작업 결과 — 완료된 주문에만 공개 */}
      {done && order.result && <ResultSection order={order} unitLabel={unitLabel} />}

      {!done && order.status !== "CANCELED" && (
        <p className="rounded-2xl bg-muted/50 p-4 text-center text-[13px] text-muted-foreground">
          {customerStageMeta(order.status).description}
        </p>
      )}
    </div>
  );
}

function ResultSection({ order, unitLabel }: { order: Order; unitLabel: string }) {
  const result = order.result;
  if (!result) return null;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[15px] font-bold">작업 결과</h2>
        <span className="num text-xs text-muted-foreground">
          {formatDate(order.completedAt)} 완료
        </span>
      </div>

      <dl className="flex flex-col gap-2.5 text-sm">
        <Row
          label="완료 수량"
          value={`${formatNumber(result.doneQty)}${unitLabel} / 주문 ${formatNumber(order.qty)}${unitLabel}`}
        />
      </dl>

      {result.resultUrls.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[13px] text-muted-foreground">결과 링크</span>
          <ul className="flex flex-col gap-2">
            {result.resultUrls.map((url) => (
              <li
                key={url}
                className="flex items-center gap-2 rounded-xl bg-surface px-3.5 py-2.5 text-sm"
              >
                <Link2 className="size-3.5 shrink-0 text-muted-foreground" />
                <ExternalUrl url={url} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.memo && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] text-muted-foreground">작업 메모</span>
          <p className="rounded-xl bg-surface p-3.5 text-sm whitespace-pre-wrap">{result.memo}</p>
        </div>
      )}

      {result.files.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] text-muted-foreground">결과 파일</span>
          <FileList files={result.files} />
        </div>
      )}
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="num min-w-0 text-right font-medium">{value}</dd>
    </div>
  );
}

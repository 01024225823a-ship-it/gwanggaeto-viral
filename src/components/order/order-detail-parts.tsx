import { ExternalLink, Link2 } from "lucide-react";
import { FileList } from "@/components/common/file-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { contentTypeLabel } from "@/lib/domain/content-type";
import { orderUrlLabel } from "@/lib/domain/order-form";
import { ContentTypeGuide } from "@/components/order/content-type-picker";
import { cafeGroupName, resolveCafeNames } from "@/lib/mock/cafes";
import { categoryName, customerName } from "@/lib/domain/selectors";
import { statusLabel } from "@/lib/domain/status";
import type { AppData, Order } from "@/lib/domain/types";
import { formatDateTime, formatNumber, formatPoint, formatWon, shortenUrl } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/mock/accounts";

/** 라벨 - 값 한 줄. 주문 상세 화면 전반에서 재사용한다. */
export function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="num min-w-0 text-right font-medium">{value}</span>
    </div>
  );
}

/** 외부 링크 — http로 시작하지 않으면 일반 텍스트로 표시한다 */
export function ExternalUrl({ url }: { url: string }) {
  if (!url.startsWith("http")) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Link2 className="size-3.5 shrink-0 text-muted-foreground" />
        {url}
      </span>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex max-w-full items-center gap-1.5 text-primary hover:underline"
    >
      <span className="truncate">{shortenUrl(url)}</span>
      <ExternalLink className="size-3.5 shrink-0" />
    </a>
  );
}

/**
 * 카페 상품 주문의 작업 카테고리 · 선택 카페.
 * 주문완료 / 광고주 주문상세 / 관리자 주문상세 · 검수 / 실행사 작업상세가 공유한다.
 */
export function OrderCafeInfo({
  order,
  label = "선택 카페",
  showContentGuide = false,
}: {
  order: Order;
  label?: string;
  /** 실행사 화면처럼 원고 작성 방식까지 보여줘야 하는 경우 */
  showContentGuide?: boolean;
}) {
  const names = resolveCafeNames(order.selectedCafeIds, order.selectedCafeNames);
  if (!order.contentType && !order.cafeGroupId && names.length === 0) return null;

  return (
    <div className="flex flex-col gap-2.5 pt-1">
      {order.contentType && (
        <>
          <DetailRow label="원고 유형" value={contentTypeLabel(order.contentType)} />
          {showContentGuide && <ContentTypeGuide contentType={order.contentType} />}
        </>
      )}
      {order.cafeGroupId && (
        <DetailRow label="작업 카테고리" value={cafeGroupName(order.cafeGroupId)} />
      )}
      {names.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-muted-foreground">
            {label} <span className="num">{formatNumber(names.length)}개</span>
          </span>
          <ol className="grid gap-1 rounded-lg bg-muted/60 p-3 sm:grid-cols-2">
            {names.map((name, i) => (
              <li key={`${name}-${i}`} className="flex gap-2 text-[13px]">
                <span className="num w-4 shrink-0 text-right text-muted-foreground">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">{name}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

/** 주문 기본 정보 카드 */
export function OrderInfoCard({
  order,
  data,
  showCustomer = false,
}: {
  order: Order;
  data: AppData;
  showCustomer?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>주문 정보</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {showCustomer && <DetailRow label="광고주" value={customerName(data, order.customerId)} />}
        <DetailRow label="카테고리" value={categoryName(data, order.categoryId)} />
        <DetailRow label="서비스" value={order.productName} />
        <DetailRow label="수량" value={formatNumber(order.qty)} />
        <DetailRow label="단가" value={formatWon(order.unitPrice)} />
        <Separator />
        <DetailRow
          label="결제 금액"
          value={
            <span className="text-base font-semibold text-primary">{formatPoint(order.amount)}</span>
          }
        />
        <DetailRow label="주문일시" value={formatDateTime(order.createdAt)} />
        <OrderCafeInfo order={order} />
        {order.targetUrl && (
          <DetailRow
            label={orderUrlLabel(data, order.categoryId)}
            value={<ExternalUrl url={order.targetUrl} />}
          />
        )}
        {order.requestNote && (
          <div className="flex flex-col gap-1.5 pt-1">
            <span className="text-muted-foreground">요청사항</span>
            <p className="rounded-lg bg-muted/60 p-3 whitespace-pre-wrap">{order.requestNote}</p>
          </div>
        )}
        {order.files.length > 0 && (
          <div className="flex flex-col gap-1.5 pt-1">
            <span className="text-muted-foreground">첨부파일</span>
            <FileList files={order.files} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** 상태 변경 이력 타임라인 */
export function OrderHistoryList({ order }: { order: Order }) {
  return (
    <ol className="flex flex-col gap-3">
      {[...order.history].reverse().map((entry, i) => (
        <li key={`${entry.status}-${entry.at}-${i}`} className="flex gap-2.5">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/50" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">{entry.note ?? statusLabel(entry.status)}</p>
            <p className="num text-xs text-muted-foreground">
              {formatDateTime(entry.at)} · {ROLE_LABEL[entry.by]}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** 실행사가 등록한 작업 결과 카드 */
export function OrderResultCard({
  order,
  actions,
}: {
  order: Order;
  actions?: React.ReactNode;
}) {
  const result = order.result;
  if (!result) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>작업 결과</CardTitle>
        <p className="text-sm text-muted-foreground">
          {order.status === "IN_REVIEW"
            ? `${formatDateTime(result.submittedAt)} 제출 · 검수 대기중`
            : `${formatDateTime(result.submittedAt)} 등록`}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        <DetailRow
          label="완료 수량"
          value={`${formatNumber(result.doneQty)} / ${formatNumber(order.qty)}`}
        />

        {result.resultUrls.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-muted-foreground">결과 링크</span>
            <ul className="flex flex-col gap-1.5">
              {result.resultUrls.map((url) => (
                <li key={url}>
                  <ExternalUrl url={url} />
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.memo && (
          <div className="flex flex-col gap-1.5">
            <span className="text-muted-foreground">실행사 메모</span>
            <p className="rounded-lg bg-muted/60 p-3 whitespace-pre-wrap">{result.memo}</p>
          </div>
        )}

        {result.files.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-muted-foreground">결과 파일</span>
            <FileList files={result.files} />
          </div>
        )}

        {order.reviewNote && (
          <div className="flex flex-col gap-1.5 rounded-lg bg-amber-50 p-3 ring-1 ring-amber-200">
            <span className="text-[13px] font-medium text-amber-800">관리자 수정 요청</span>
            <p className="whitespace-pre-wrap text-amber-900">{order.reviewNote}</p>
          </div>
        )}

        {actions && <div className="flex flex-wrap justify-end gap-2 pt-1">{actions}</div>}
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CircleCheck,
  Info,
  LogIn,
  Minus,
  PackageSearch,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { LoginRequiredDialog } from "@/components/auth/login-required-dialog";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { FilePicker } from "@/components/common/file-picker";
import { OrderSteps } from "@/components/customer/order-steps";
import { CafeGroupPicker, CafePicker, SelectedCafeList } from "@/components/order/cafe-picker";
import { ContentTypePicker } from "@/components/order/content-type-picker";
import { ExternalUrl, OrderCafeInfo } from "@/components/order/order-detail-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON } from "@/config/category-icons";
import type { ContentType } from "@/lib/domain/content-type";
import { contentTypeLabel } from "@/lib/domain/content-type";
import { orderFormCopy } from "@/lib/domain/order-form";
import { findCategory, findProduct } from "@/lib/domain/selectors";
import type { AttachedFile, Order, Product } from "@/lib/domain/types";
import { cafeGroupName, findCafe, publishableCafesOf } from "@/lib/mock/cafes";
import { formatNumber, formatPoint, formatWon } from "@/lib/format";
import { useData } from "@/lib/store/data";
import { useSession } from "@/lib/store/session";
import { cn } from "@/lib/utils";

export function CustomerOrderView({ productId }: { productId: string }) {
  const { account } = useSession();
  const { data, createOrder } = useData();

  const product = findProduct(data, productId);
  const category = findCategory(data, product?.categoryId);
  const customer = data.customers.find((c) => c.id === account?.customerId);

  const [qty, setQty] = useState<number>(product?.minQty ?? 1);
  const [contentType, setContentType] = useState<ContentType | "">("");
  const [cafeGroupId, setCafeGroupId] = useState("");
  const [selectedCafeIds, setSelectedCafeIds] = useState<string[]>([]);
  const [targetUrl, setTargetUrl] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [completed, setCompleted] = useState<Order | null>(null);

  if (!product || !product.visible) {
    return (
      <div className="rounded-2xl border border-border">
        <EmptyState
          icon={PackageSearch}
          title="서비스를 찾을 수 없습니다"
          description="판매가 종료되었거나 잘못된 주소입니다."
          action={
            <Button asChild>
              <Link href="/services">서비스 둘러보기</Link>
            </Button>
          }
        />
      </div>
    );
  }

  // 카테고리별 주문정보 입력 문구 (유튜브는 롱폼 URL 전용 폼, 카페는 카페 직접 선택)
  const form = orderFormCopy(data, product);

  // 카페 상품 — 선택한 작업 카테고리에서 고객이 고를 수 있는 카페
  const availableCafes = form.cafeSelection ? publishableCafesOf(cafeGroupId) : [];
  const selectedCafeNames = selectedCafeIds.map((id) => findCafe(id)?.name ?? id);
  /** 선택 가능한 카페 수 = 주문 수량 (수량 입력이 비어 있는 동안에는 0) */
  const cafeLimit = Number.isFinite(qty) && qty > 0 ? qty : 0;

  /** 수량이 줄면 초과 선택된 카페를 잘라내 항상 "수량 = 최대 선택 수"를 유지한다 */
  function changeQty(next: number) {
    setQty(next);
    if (Number.isFinite(next) && next >= 0 && selectedCafeIds.length > next) {
      setSelectedCafeIds((prev) => prev.slice(0, Math.max(0, next)));
    }
  }

  /** 카테고리를 바꾸면 이전 카테고리에서 고른 카페는 초기화한다 */
  function changeCafeGroup(nextGroupId: string) {
    setCafeGroupId(nextGroupId);
    setSelectedCafeIds([]);
  }

  if (completed) {
    return (
      <OrderComplete order={completed} unitLabel={product.unitLabel} urlLabel={form.urlLabel} />
    );
  }

  // 비로그인 사용자도 상품 정보는 볼 수 있고, 주문 단계만 로그인을 요구한다
  const canOrder = account?.role === "CUSTOMER";
  const amount = product.price * qty;
  const point = customer?.point ?? 0;
  const shortage = Math.max(0, amount - point);
  const Icon = CATEGORY_ICONS[category?.slug ?? ""] ?? DEFAULT_CATEGORY_ICON;

  const validation = (() => {
    if (!Number.isFinite(qty) || qty < product.minQty)
      return {
        ok: false,
        message: `최소 ${formatNumber(product.minQty)}${product.unitLabel}부터 주문할 수 있어요`,
      };
    if (qty > product.maxQty)
      return {
        ok: false,
        message: `최대 ${formatNumber(product.maxQty)}${product.unitLabel}까지 주문할 수 있어요`,
      };
    if (form.urlRequired && !targetUrl.trim())
      return { ok: false, message: form.urlMissingMessage };
    if (form.contentTypeSelection && !contentType)
      return { ok: false, message: "원고 유형을 선택해 주세요" };
    if (form.cafeSelection) {
      if (!cafeGroupId) return { ok: false, message: "작업 카테고리를 선택해 주세요" };
      if (availableCafes.length < qty)
        return {
          ok: false,
          message: `선택 가능한 카페가 ${formatNumber(availableCafes.length)}개뿐이에요`,
        };
      if (selectedCafeIds.length !== qty)
        return {
          ok: false,
          message: `주문 수량 ${formatNumber(qty)}건에 맞게 카페 ${formatNumber(qty)}개를 선택해주세요.`,
        };
    }
    if (shortage > 0) return { ok: false, message: `포인트가 ${formatPoint(shortage)} 부족해요` };
    return { ok: true, message: "" };
  })();

  function submit() {
    if (!account?.customerId || !product) return;
    try {
      const order = createOrder({
        customerId: account.customerId,
        productId: product.id,
        qty,
        targetUrl: targetUrl.trim(),
        requestNote: requestNote.trim(),
        files,
        // 카페 상품만 원고 유형·선택 카페를 함께 저장한다 (ID가 기준, 이름은 스냅샷)
        contentType: form.contentTypeSelection && contentType ? contentType : undefined,
        cafeGroupId: form.cafeSelection ? cafeGroupId : undefined,
        selectedCafeIds: form.cafeSelection ? selectedCafeIds : undefined,
        selectedCafeNames: form.cafeSelection ? selectedCafeNames : undefined,
      });
      setCompleted(order);
      toast.success("주문이 접수되었습니다.", { description: order.orderNo });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "주문에 실패했습니다.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <OrderSteps current={canOrder ? 2 : 1} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* 선택한 서비스 */}
          <section className="rounded-2xl border border-border p-5">
            <div className="flex items-start gap-3.5">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                <Icon className="size-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground">{category?.name}</p>
                <h1 className="mt-0.5 text-lg font-bold tracking-tight">{product.name}</h1>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                  {product.description}
                </p>
              </div>
              <Link
                href={`/services?category=${category?.slug ?? ""}`}
                className="shrink-0 text-[13px] font-medium text-muted-foreground hover:text-primary"
              >
                변경
              </Link>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <InfoTile label="단가" value={`${formatWon(product.price)} / ${product.unitLabel}`} />
              <InfoTile
                label="최소 주문수량"
                value={`${formatNumber(product.minQty)}${product.unitLabel}`}
              />
              <InfoTile label="예상 소요기간" value={`약 ${product.leadDays}일`} />
            </dl>

            {product.guide?.length ? (
              <ul className="mt-4 flex flex-col gap-1.5 rounded-xl bg-muted/50 p-4">
                {product.guide.map((line) => (
                  <li key={line} className="flex gap-2 text-[13px] text-muted-foreground">
                    <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    {line}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          {form.notices.length > 0 && <ProductNotice notices={form.notices} />}

          {/* 주문정보 입력 — 로그인한 광고주에게만 노출 */}
          {canOrder && (
          <section className="flex flex-col gap-5 rounded-2xl border border-border p-5">
            <h2 className="text-[15px] font-bold">
              <span className="num mr-1.5 text-primary">02</span>주문정보 입력
            </h2>

            {form.contentTypeSelection && (
              <div className="flex flex-col gap-2">
                <Label className="text-[13px]">
                  원고 유형 <span className="text-destructive">*</span>
                </Label>
                <ContentTypePicker value={contentType} onChange={setContentType} />
              </div>
            )}

            {form.cafeSelection && (
              <div className="flex flex-col gap-2">
                <Label className="text-[13px]">
                  작업 카테고리 <span className="text-destructive">*</span>
                </Label>
                <CafeGroupPicker value={cafeGroupId} onChange={changeCafeGroup} />
                {cafeGroupId ? (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {cafeGroupName(cafeGroupId)}
                    </span>{" "}
                    카테고리에서 지금 작업 가능한 카페{" "}
                    <span className="num font-semibold text-foreground">
                      {formatNumber(availableCafes.length)}개
                    </span>
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    배포를 원하는 카페의 작업 카테고리를 먼저 선택해 주세요.
                  </p>
                )}
              </div>
            )}

            {form.showUrl && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="targetUrl" className="text-[13px]">
                  {form.urlLabel}
                  {form.urlRequired && <span className="text-destructive"> *</span>}
                </Label>
                <Input
                  id="targetUrl"
                  type="url"
                  inputMode="url"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder={form.urlPlaceholder}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">{form.urlHint}</p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="qty" className="text-[13px]">
                수량 <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-xl border border-input">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11 rounded-r-none"
                    aria-label="수량 줄이기"
                    onClick={() => changeQty(Math.max(product.minQty, qty - product.minQty))}
                  >
                    <Minus />
                  </Button>
                  <Input
                    id="qty"
                    type="number"
                    inputMode="numeric"
                    min={product.minQty}
                    max={product.maxQty}
                    value={qty || ""}
                    onChange={(e) => changeQty(Number(e.target.value))}
                    className="num h-11 w-24 rounded-none border-0 text-center text-base font-semibold focus-visible:ring-0"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11 rounded-l-none"
                    aria-label="수량 늘리기"
                    onClick={() => changeQty(Math.min(product.maxQty, qty + product.minQty))}
                  >
                    <Plus />
                  </Button>
                </div>
                <span className="text-sm text-muted-foreground">{product.unitLabel}</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {qtyPresets(product).map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant={qty === preset ? "secondary" : "outline"}
                    size="xs"
                    onClick={() => changeQty(preset)}
                  >
                    {formatNumber(preset)}
                    {product.unitLabel}
                  </Button>
                ))}
              </div>
            </div>

            {form.cafeSelection && cafeGroupId && (
              <div className="flex flex-col gap-2">
                <Label className="text-[13px]">
                  카페 선택 <span className="text-destructive">*</span>
                </Label>
                <CafePicker
                  groupId={cafeGroupId}
                  limit={cafeLimit}
                  value={selectedCafeIds}
                  onChange={setSelectedCafeIds}
                  notice={form.cafeNotice}
                  noticeExample={form.cafeNoticeExample}
                />
                {selectedCafeIds.length !== cafeLimit && (
                  <p className="text-[13px] font-medium text-amber-600">
                    주문 수량 {formatNumber(cafeLimit)}건에 맞게 카페{" "}
                    {formatNumber(cafeLimit)}개를 선택해주세요.
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="requestNote" className="text-[13px]">
                요청사항{" "}
                <span className="font-normal text-muted-foreground">{form.noteLabelSuffix}</span>
              </Label>
              {form.noteNotice && (
                <p className="rounded-xl bg-amber-50 p-3.5 text-[13px] leading-relaxed whitespace-pre-line text-amber-900 ring-1 ring-amber-200">
                  {form.noteNotice}
                </p>
              )}
              <Textarea
                id="requestNote"
                rows={4}
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                placeholder={form.notePlaceholder}
              />
              {form.noteHint && <p className="text-xs text-muted-foreground">{form.noteHint}</p>}
            </div>

            {form.showFile && (
              <div className="flex flex-col gap-2">
                <Label className="text-[13px]">파일 첨부</Label>
                {form.fileNotice && (
                  <p className="rounded-xl bg-muted/60 px-3.5 py-2.5 text-[13px] text-muted-foreground">
                    {form.fileNotice}
                  </p>
                )}
                <FilePicker
                  value={files}
                  onChange={setFiles}
                  hint="사진·원고 등 (프로토타입에서는 파일명만 기록됩니다)"
                />
              </div>
            )}
          </section>
          )}
        </div>

        {/* 주문금액 */}
        <aside className="lg:sticky lg:top-22 lg:h-fit">
          {!canOrder ? (
            <GuestOrderPanel productId={product.id} price={product.price} unitLabel={product.unitLabel} />
          ) : (
          <div className="flex flex-col gap-4 rounded-2xl border border-border p-5">
            <h2 className="text-[15px] font-bold">
              <span className="num mr-1.5 text-primary">03</span>주문금액 확인
            </h2>

            <div className="flex flex-col gap-2 text-sm">
              <SummaryRow label="단가" value={`${formatWon(product.price)} / ${product.unitLabel}`} />
              <SummaryRow
                label="수량"
                value={`${formatNumber(qty || 0)}${product.unitLabel}`}
              />
            </div>

            {form.contentTypeSelection && contentType && (
              <SummaryRow label="원고 유형" value={contentTypeLabel(contentType)} />
            )}

            {form.cafeSelection && (
              <div className="flex flex-col gap-2 rounded-xl bg-muted/50 p-3.5">
                <div className="flex items-center justify-between gap-2 text-[13px]">
                  <span className="text-muted-foreground">
                    {cafeGroupId ? cafeGroupName(cafeGroupId) : "선택 카페"}
                  </span>
                  <span className="num font-semibold">
                    {formatNumber(selectedCafeIds.length)} / {formatNumber(cafeLimit)}개
                  </span>
                </div>
                {selectedCafeNames.length > 0 ? (
                  <SelectedCafeList names={selectedCafeNames} />
                ) : (
                  <p className="text-xs text-muted-foreground">아직 선택한 카페가 없습니다.</p>
                )}
              </div>
            )}

            <div className="rounded-xl bg-accent/50 p-4 text-center">
              <p className="text-[13px] font-medium text-muted-foreground">총 주문금액</p>
              <p className="num mt-1 text-2xl font-bold tracking-tight text-primary">
                {formatWon(amount)}
              </p>
            </div>

            <div className="flex flex-col gap-2 rounded-xl bg-muted/50 p-3.5 text-[13px]">
              <SummaryRow label="보유 포인트" value={formatPoint(point)} muted />
              <SummaryRow
                label="주문 후 잔액"
                value={formatPoint(Math.max(0, point - amount))}
                muted
              />
            </div>

            {shortage > 0 && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3.5 text-amber-800 ring-1 ring-amber-200">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold">
                    포인트가 {formatPoint(shortage)} 부족합니다.
                  </p>
                  <Link
                    href="/points"
                    className="mt-0.5 inline-flex items-center gap-1 text-[13px] underline underline-offset-2"
                  >
                    포인트 충전하러 가기
                    <ArrowRight className="size-3" />
                  </Link>
                </div>
              </div>
            )}

            <ConfirmDialog
              trigger={
                <Button size="lg" className="h-12 w-full text-[15px]" disabled={!validation.ok}>
                  {validation.ok ? `${formatPoint(amount)}로 주문하기` : validation.message}
                </Button>
              }
              title="이대로 주문할까요?"
              description="주문과 동시에 보유 포인트에서 주문금액이 차감됩니다."
              confirmLabel="주문하기"
              onConfirm={submit}
            >
              <div className="flex flex-col gap-2 rounded-xl bg-muted/60 p-3.5 text-sm">
                <SummaryRow label="서비스" value={product.name} />
                {targetUrl.trim() && (
                  <SummaryRow label={form.urlLabel} value={targetUrl.trim()} />
                )}
                {form.contentTypeSelection && contentType && (
                  <SummaryRow label="원고 유형" value={contentTypeLabel(contentType)} />
                )}
                {form.cafeSelection && cafeGroupId && (
                  <SummaryRow label="작업 카테고리" value={cafeGroupName(cafeGroupId)} />
                )}
                <SummaryRow
                  label="수량"
                  value={`${formatNumber(qty)}${product.unitLabel}`}
                />
                {form.cafeSelection && selectedCafeNames.length > 0 && (
                  <div className="flex flex-col gap-1.5 pt-1">
                    <span className="text-muted-foreground">
                      선택 카페{" "}
                      <span className="num">{formatNumber(selectedCafeNames.length)}개</span>
                    </span>
                    <SelectedCafeList
                      names={selectedCafeNames}
                      className="max-h-40 overflow-y-auto rounded-lg bg-surface p-2.5"
                    />
                  </div>
                )}
                {requestNote.trim() && <SummaryRow label="요청사항" value={requestNote.trim()} />}
                <SummaryRow label="주문금액" value={formatPoint(amount)} />
              </div>
            </ConfirmDialog>

            <p className="text-center text-xs text-muted-foreground">
              주문 후 진행 상황은 주문내역에서 확인할 수 있어요.
            </p>
          </div>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** 주문 전 반드시 확인해야 하는 상품 안내 박스 */
function ProductNotice({ notices }: { notices: string[] }) {
  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
      <p className="flex items-center gap-1.5 text-[13px] font-bold text-amber-900">
        <AlertTriangle className="size-4 shrink-0" />
        주문 전 확인해주세요
      </p>
      <ul className="flex flex-col gap-1.5">
        {notices.map((notice) => (
          <li key={notice} className="flex gap-2 text-[13px] leading-relaxed text-amber-900">
            <span className="mt-[7px] size-1 shrink-0 rounded-full bg-amber-500" />
            {notice}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** 비로그인 사용자에게 보여주는 주문 안내 패널 */
function GuestOrderPanel({
  productId,
  price,
  unitLabel,
}: {
  productId: string;
  price: number;
  unitLabel: string;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border p-5">
      <div className="rounded-xl bg-accent/50 p-4 text-center">
        <p className="text-[13px] font-medium text-muted-foreground">단가</p>
        <p className="num mt-1 text-2xl font-bold tracking-tight text-primary">
          {formatWon(price)}
          <span className="ml-1 text-sm font-medium text-muted-foreground">/ {unitLabel}</span>
        </p>
      </div>

      <p className="text-[13px] leading-relaxed text-muted-foreground">
        로그인하시면 수량과 요청사항을 입력하고 보유 포인트로 바로 주문할 수 있습니다.
      </p>

      <LoginRequiredDialog
        redirectTo={`/order/${productId}`}
        trigger={
          <Button size="lg" className="h-12 w-full text-[15px]">
            <LogIn />
            로그인하고 주문하기
          </Button>
        }
      />

      <Button variant="outline" asChild>
        <Link href="/services">다른 서비스 둘러보기</Link>
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        로그인 없이도 서비스와 가격은 자유롭게 확인하실 수 있어요.
      </p>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/50 px-3.5 py-2.5">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="num mt-0.5 text-[13px] font-semibold">{value}</dd>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className={cn("num min-w-0 truncate text-right font-semibold", muted && "font-medium")}>
        {value}
      </span>
    </div>
  );
}

function OrderComplete({
  order,
  unitLabel,
  urlLabel,
}: {
  order: Order;
  unitLabel: string;
  urlLabel: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <OrderSteps current={4} />

      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-5 rounded-2xl border border-border px-6 py-12 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CircleCheck className="size-8" />
        </span>
        <div>
          <p className="text-xl font-bold tracking-tight">주문이 접수되었습니다</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            작업이 준비되면 주문내역에서 진행 상황을 확인하실 수 있어요.
          </p>
        </div>

        <dl className="flex w-full flex-col gap-2 rounded-xl bg-muted/50 p-4 text-left text-sm">
          <SummaryRow label="주문번호" value={order.orderNo} />
          <SummaryRow label="서비스" value={order.productName} />
          {order.targetUrl && (
            <SummaryRow label={urlLabel} value={<ExternalUrl url={order.targetUrl} />} />
          )}
          <SummaryRow label="수량" value={`${formatNumber(order.qty)}${unitLabel}`} />
          <SummaryRow label="주문금액" value={formatPoint(order.amount)} />
          <OrderCafeInfo order={order} />
          {order.requestNote && (
            <div className="flex flex-col gap-1.5 pt-1">
              <span className="text-muted-foreground">요청사항</span>
              <p className="rounded-lg bg-surface p-3 whitespace-pre-wrap">{order.requestNote}</p>
            </div>
          )}
        </dl>

        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <Button size="lg" className="h-11 flex-1" asChild>
            <Link href={`/orders/${order.orderNo}`}>주문 상세보기</Link>
          </Button>
          <Button size="lg" variant="outline" className="h-11 flex-1" asChild>
            <Link href="/services">다른 서비스 보기</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

/** 수량 입력 편의용 프리셋 — 최소 수량 배수 중 최대 수량 이하인 값 */
function qtyPresets(product: Product): number[] {
  const candidates = [1, 2, 5, 10].map((m) => product.minQty * m);
  return [...new Set(candidates)].filter((v) => v <= product.maxQty).slice(0, 4);
}

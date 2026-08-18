"use client";

import { useState } from "react";
import { CreditCard, Landmark, Wallet } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BRAND } from "@/config/brand";
import type { PointTx } from "@/lib/domain/types";
import { formatDateTime, formatNumber, formatPoint, formatWon } from "@/lib/format";
import { useData } from "@/lib/store/data";
import { useSession } from "@/lib/store/session";
import { cn } from "@/lib/utils";

const PRESETS = [100_000, 500_000, 1_000_000, 3_000_000];

const TX_LABEL: Record<PointTx["type"], string> = {
  CHARGE: "충전",
  USE: "사용",
  REFUND: "환불",
};

export function CustomerPointsView() {
  const { account } = useSession();
  const { data, chargePoint } = useData();

  const customer = data.customers.find((c) => c.id === account?.customerId);
  const txs = data.pointTxs.filter((t) => t.customerId === account?.customerId);

  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<"CARD" | "TRANSFER">("TRANSFER");

  function handleCharge() {
    if (!account?.customerId) return;
    chargePoint(account.customerId, amount, method);
    setAmount(0);
    toast.success(`${formatPoint(amount)}가 충전되었습니다.`);
  }

  return (
    <>
      <PageHeader
        title="포인트 충전"
        description={`서비스 주문은 포인트로 결제됩니다. 1원 = 1${BRAND.point.unit}`}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* 헤더의 "포인트 사용내역" 메뉴가 이 위치로 이동한다 */}
          <Card id="history" className="scroll-mt-24">
            <CardHeader>
              <CardTitle>포인트 사용 내역</CardTitle>
            </CardHeader>
            <CardContent>
              {txs.length === 0 ? (
                <EmptyState icon={Wallet} title="포인트 내역이 없습니다" />
              ) : (
                <div className="scrollbar-thin overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>일시</TableHead>
                        <TableHead>구분</TableHead>
                        <TableHead>내용</TableHead>
                        <TableHead className="text-right">증감</TableHead>
                        <TableHead className="text-right">잔액</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {txs.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="num whitespace-nowrap text-muted-foreground">
                            {formatDateTime(tx.createdAt)}
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                tx.type === "USE"
                                  ? "bg-muted text-muted-foreground"
                                  : "bg-emerald-50 text-emerald-700",
                              )}
                            >
                              {TX_LABEL[tx.type]}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-64 truncate">
                            {tx.title}
                            {tx.orderNo && (
                              <p className="num text-xs text-muted-foreground">{tx.orderNo}</p>
                            )}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "num text-right font-medium whitespace-nowrap",
                              tx.amount > 0 ? "text-emerald-600" : "text-foreground",
                            )}
                          >
                            {tx.amount > 0 ? "+" : ""}
                            {formatNumber(tx.amount)}
                          </TableCell>
                          <TableCell className="num text-right whitespace-nowrap text-muted-foreground">
                            {formatNumber(tx.balance)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>포인트 충전</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="rounded-xl bg-primary/5 p-4 text-center ring-1 ring-primary/15">
                <p className="text-[13px] text-muted-foreground">사용 가능 포인트</p>
                <p className="num mt-1 text-2xl font-semibold text-primary">
                  {formatPoint(customer?.point ?? 0)}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="chargeAmount">충전 금액</Label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESETS.map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      variant={amount === preset ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAmount(preset)}
                    >
                      {formatNumber(preset / 10_000)}만원
                    </Button>
                  ))}
                </div>
                <Input
                  id="chargeAmount"
                  type="number"
                  min={0}
                  step={10_000}
                  value={amount || ""}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder="직접 입력"
                  className="num"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>결제 수단</Label>
                <div className="grid grid-cols-2 gap-2">
                  <MethodButton
                    active={method === "TRANSFER"}
                    onClick={() => setMethod("TRANSFER")}
                    icon={<Landmark className="size-4" />}
                    label="계좌이체"
                  />
                  <MethodButton
                    active={method === "CARD"}
                    onClick={() => setMethod("CARD")}
                    icon={<CreditCard className="size-4" />}
                    label="신용카드"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 rounded-lg bg-muted/60 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">결제 금액</span>
                  <span className="num font-medium">{formatWon(amount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">충전 후 잔액</span>
                  <span className="num font-medium">
                    {formatPoint((customer?.point ?? 0) + amount)}
                  </span>
                </div>
              </div>

              <ConfirmDialog
                trigger={
                  <Button size="lg" className="w-full" disabled={amount <= 0}>
                    {amount > 0 ? `${formatWon(amount)} 충전하기` : "충전 금액을 입력하세요"}
                  </Button>
                }
                title="포인트를 충전할까요?"
                description={`${
                  method === "CARD" ? "신용카드" : "계좌이체"
                }로 ${formatWon(amount)}을 결제합니다. 프로토타입에서는 실제 결제 없이 포인트가 즉시 지급됩니다.`}
                confirmLabel="충전하기"
                onConfirm={handleCharge}
              />

              <p className="text-xs text-muted-foreground">
                세금계산서가 필요하면 충전 후 문의하기로 요청해 주세요.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>안내</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5 text-[13px] text-muted-foreground">
              <p>· 충전한 포인트는 서비스 주문 결제에 사용됩니다.</p>
              <p>· 주문이 취소되면 사용한 포인트가 전액 환불됩니다.</p>
              <p>· 고객센터 {BRAND.support.phone} · {BRAND.support.hours}</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}

function MethodButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary/5 text-primary"
          : "border-border text-muted-foreground hover:bg-muted",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

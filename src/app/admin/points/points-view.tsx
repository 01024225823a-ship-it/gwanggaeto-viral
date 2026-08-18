"use client";

import { Wallet } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/empty-state";
import { Field } from "@/components/common/field";
import { FormDialog } from "@/components/common/form-dialog";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { customerName } from "@/lib/domain/selectors";
import type { Customer, PointTx } from "@/lib/domain/types";
import { formatDateTime, formatNumber, formatPoint, formatWon } from "@/lib/format";
import { useData } from "@/lib/store/data";
import { cn } from "@/lib/utils";

interface ChargeForm {
  amount: number;
  method: "CARD" | "TRANSFER";
}

const TX_LABEL: Record<PointTx["type"], string> = {
  CHARGE: "충전",
  USE: "사용",
  REFUND: "환불",
};

export function AdminPointsView() {
  const { data, chargePoint } = useData();

  const totalPoint = data.customers.reduce((acc, c) => acc + c.point, 0);
  const totalCharged = data.pointTxs
    .filter((t) => t.type === "CHARGE")
    .reduce((acc, t) => acc + t.amount, 0);
  const totalUsed = data.pointTxs
    .filter((t) => t.type === "USE")
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  return (
    <>
      <PageHeader
        title="포인트관리"
        description="광고주 포인트 잔액을 확인하고 충전 포인트를 지급합니다."
      />

      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="총 보유 포인트" value={formatPoint(totalPoint)} icon={Wallet} tone="primary" />
          <StatCard label="누적 충전" value={formatWon(totalCharged)} icon={Wallet} tone="emerald" />
          <StatCard label="누적 사용" value={formatWon(totalUsed)} icon={Wallet} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>광고주별 포인트</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="scrollbar-thin overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>광고주</TableHead>
                    <TableHead>담당자</TableHead>
                    <TableHead className="text-right">누적 충전</TableHead>
                    <TableHead className="text-right">누적 사용</TableHead>
                    <TableHead className="text-right">보유 포인트</TableHead>
                    <TableHead className="text-right">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.customers.map((customer) => {
                    const txs = data.pointTxs.filter((t) => t.customerId === customer.id);
                    const charged = txs
                      .filter((t) => t.type === "CHARGE")
                      .reduce((acc, t) => acc + t.amount, 0);
                    const used = txs
                      .filter((t) => t.type === "USE")
                      .reduce((acc, t) => acc + Math.abs(t.amount), 0);
                    return (
                      <TableRow key={customer.id}>
                        <TableCell className="max-w-48 truncate font-medium">
                          {customer.company}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {customer.manager}
                        </TableCell>
                        <TableCell className="num text-right whitespace-nowrap text-muted-foreground">
                          {formatWon(charged)}
                        </TableCell>
                        <TableCell className="num text-right whitespace-nowrap text-muted-foreground">
                          {formatWon(used)}
                        </TableCell>
                        <TableCell className="num text-right font-medium whitespace-nowrap">
                          {formatPoint(customer.point)}
                        </TableCell>
                        <TableCell className="text-right">
                          <ChargeDialog
                            customer={customer}
                            onCharge={(form) => {
                              chargePoint(customer.id, form.amount, form.method);
                              toast.success(
                                `${customer.company}에 ${formatPoint(form.amount)}를 지급했습니다.`,
                              );
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>전체 포인트 내역</CardTitle>
          </CardHeader>
          <CardContent>
            {data.pointTxs.length === 0 ? (
              <EmptyState icon={Wallet} title="포인트 내역이 없습니다" />
            ) : (
              <div className="scrollbar-thin overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>일시</TableHead>
                      <TableHead>광고주</TableHead>
                      <TableHead>구분</TableHead>
                      <TableHead>내용</TableHead>
                      <TableHead className="text-right">증감</TableHead>
                      <TableHead className="text-right">잔액</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.pointTxs.slice(0, 40).map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="num whitespace-nowrap text-muted-foreground">
                          {formatDateTime(tx.createdAt)}
                        </TableCell>
                        <TableCell className="max-w-40 truncate">
                          {customerName(data, tx.customerId)}
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
    </>
  );
}

function ChargeDialog({
  customer,
  onCharge,
}: {
  customer: Customer;
  onCharge: (form: ChargeForm) => void;
}) {
  return (
    <FormDialog<ChargeForm>
      trigger={
        <Button size="sm" variant="outline">
          포인트 지급
        </Button>
      }
      title="포인트 지급"
      description={`${customer.company} · 현재 잔액 ${formatPoint(customer.point)}`}
      submitLabel="지급"
      initial={() => ({ amount: 0, method: "TRANSFER" })}
      onSubmit={(form) => {
        if (!form.amount || form.amount <= 0) return "지급할 금액을 입력해 주세요.";
        onCharge(form);
      }}
    >
      {(form, patch) => (
        <>
          <Field label="지급 금액" required>
            <Input
              type="number"
              min={0}
              step={10_000}
              value={form.amount || ""}
              onChange={(e) => patch({ amount: Number(e.target.value) })}
              className="num"
              placeholder="1000000"
            />
          </Field>
          <Field label="입금 수단">
            <Select
              value={form.method}
              onValueChange={(v) => patch({ method: v as ChargeForm["method"] })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TRANSFER">계좌이체</SelectItem>
                <SelectItem value="CARD">신용카드</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="rounded-lg bg-muted/60 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">지급 후 잔액</span>
              <span className="num font-medium">
                {formatPoint(customer.point + (form.amount || 0))}
              </span>
            </div>
          </div>
        </>
      )}
    </FormDialog>
  );
}

"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { eligiblePartners, findProduct, resolveUnitCost } from "@/lib/domain/selectors";
import type { Order } from "@/lib/domain/types";
import {
  formatNumber,
  formatPercent,
  formatWon,
  fromDateInput,
  toDateInput,
} from "@/lib/format";
import { useData } from "@/lib/store/data";

/** 관리자 실행사 배정 모달 — 매입단가와 예상 마진을 함께 확인하고 배정한다 */
export function AssignDialog({
  order,
  trigger,
}: {
  order: Order;
  trigger?: React.ReactNode;
}) {
  const { data, assignOrder } = useData();
  const [open, setOpen] = useState(false);

  const product = findProduct(data, order.productId);
  const partners = eligiblePartners(data, order.productId);

  const [partnerId, setPartnerId] = useState<string>(
    order.partnerId ?? product?.defaultPartnerId ?? partners[0]?.id ?? "",
  );
  const [dueDate, setDueDate] = useState<string>(() =>
    toDateInput(order.dueDate ?? defaultDue(product?.leadDays ?? 7)),
  );

  const unitCost = partnerId ? resolveUnitCost(data, partnerId, order.productId) : 0;
  const cost = unitCost * order.qty;
  const margin = order.amount - cost;
  const marginRate = order.amount > 0 ? (margin / order.amount) * 100 : 0;

  function handleAssign() {
    if (!partnerId) {
      toast.error("배정할 실행사를 선택해 주세요.");
      return;
    }
    assignOrder(order.orderNo, partnerId, fromDateInput(dueDate));
    setOpen(false);
    toast.success("실행사를 배정했습니다.", {
      description: `${order.orderNo} · ${data.partners.find((p) => p.id === partnerId)?.name ?? ""}`,
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <UserPlus />
            실행사 배정
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>실행사 배정</DialogTitle>
          <DialogDescription>
            <span className="num">{order.orderNo}</span> · {order.productName}{" "}
            {formatNumber(order.qty)}
            {product?.unitLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="partner">실행사</Label>
            <Select value={partnerId} onValueChange={setPartnerId}>
              <SelectTrigger id="partner" className="w-full">
                <SelectValue placeholder="실행사를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {partners.map((partner) => (
                  <SelectItem key={partner.id} value={partner.id}>
                    {partner.name}
                    {partner.id === product?.defaultPartnerId ? " (기본)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {partners.length === 0 && (
              <p className="text-xs text-destructive">
                이 카테고리를 담당할 수 있는 실행사가 없습니다.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="dueDate">작업기한</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="num"
            />
            <p className="text-xs text-muted-foreground">
              기본값은 예상 소요일({product?.leadDays ?? 7}일) 기준입니다.
            </p>
          </div>

          <div className="flex flex-col gap-1.5 rounded-lg bg-muted/60 p-3 text-sm">
            <CostRow label="주문금액" value={formatWon(order.amount)} />
            <CostRow
              label="매입원가"
              value={`${formatWon(cost)} (${formatWon(unitCost)}/단위)`}
            />
            <CostRow
              label="예상 마진"
              value={`${formatWon(margin)} · ${formatPercent(marginRate)}`}
              accent
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="lg">
              취소
            </Button>
          </DialogClose>
          <Button size="lg" onClick={handleAssign} disabled={!partnerId}>
            배정하기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CostRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={`num font-medium ${accent ? "text-primary" : ""}`}>{value}</span>
    </div>
  );
}

function defaultDue(leadDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + leadDays);
  return d.toISOString();
}

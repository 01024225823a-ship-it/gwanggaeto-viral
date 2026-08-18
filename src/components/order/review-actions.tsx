"use client";

import { useState } from "react";
import { CircleCheck, RotateCcw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Order } from "@/lib/domain/types";
import { formatNumber, formatPoint, formatWon } from "@/lib/format";
import { useData } from "@/lib/store/data";

/** 검수 승인 — 주문을 완료 처리하고 실행사 정산 건을 생성한다 */
export function ApproveButton({ order, className }: { order: Order; className?: string }) {
  const { approveOrder } = useData();
  const doneQty = order.result?.doneQty ?? order.qty;
  const settlement = (order.unitCost ?? 0) * doneQty;

  return (
    <ConfirmDialog
      trigger={
        <Button size="sm" className={className}>
          <CircleCheck />
          검수 승인
        </Button>
      }
      title="검수를 승인할까요?"
      description="주문이 작업완료 처리되고 광고주에게 결과가 공개됩니다. 실행사 정산 건도 함께 생성됩니다."
      confirmLabel="승인하기"
      onConfirm={() => {
        approveOrder(order.orderNo);
        toast.success("검수를 승인했습니다.", { description: order.orderNo });
      }}
    >
      <div className="flex flex-col gap-1.5 rounded-lg bg-muted/60 p-3 text-sm">
        <SummaryRow label="주문번호" value={order.orderNo} />
        <SummaryRow label="완료 수량" value={formatNumber(doneQty)} />
        <SummaryRow label="정산 예정액" value={formatWon(settlement)} />
      </div>
    </ConfirmDialog>
  );
}

/** 수정 요청 — 작업중 상태로 되돌리고 사유를 실행사에게 전달한다 */
export function RevisionDialog({ order }: { order: Order }) {
  const { requestRevision } = useData();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  function handleSubmit() {
    if (!note.trim()) {
      toast.error("수정 요청 사유를 입력해 주세요.");
      return;
    }
    requestRevision(order.orderNo, note.trim());
    setOpen(false);
    setNote("");
    toast.success("수정을 요청했습니다.", { description: order.orderNo });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <RotateCcw />
          수정 요청
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>수정 요청</DialogTitle>
          <DialogDescription>
            주문이 작업중 상태로 돌아가고, 실행사에게 요청 내용이 전달됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="revisionNote">
            요청 사유 <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="revisionNote"
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="예) 결과 링크 3건이 누락되었습니다. 확인 후 다시 등록해 주세요."
          />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="lg">
              취소
            </Button>
          </DialogClose>
          <Button size="lg" onClick={handleSubmit}>
            수정 요청
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** 주문 취소 — 접수 상태에서만 가능하며 포인트를 환불한다 */
export function CancelOrderDialog({ order }: { order: Order }) {
  const { cancelOrder } = useData();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  function handleSubmit() {
    if (!reason.trim()) {
      toast.error("취소 사유를 입력해 주세요.");
      return;
    }
    cancelOrder(order.orderNo, reason.trim());
    setOpen(false);
    setReason("");
    toast.success("주문을 취소하고 포인트를 환불했습니다.", { description: order.orderNo });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="destructive">
          <XCircle />
          주문 취소
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>주문을 취소할까요?</DialogTitle>
          <DialogDescription>
            결제된 {formatPoint(order.amount)}가 광고주에게 환불됩니다. 되돌릴 수 없습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="cancelReason">
            취소 사유 <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="cancelReason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="예) 광고주 요청으로 주문 취소"
          />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="lg">
              닫기
            </Button>
          </DialogClose>
          <Button size="lg" variant="destructive" onClick={handleSubmit}>
            취소 처리
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="num font-medium">{value}</span>
    </div>
  );
}

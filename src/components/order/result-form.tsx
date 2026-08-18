"use client";

import { useState } from "react";
import { Plus, Send, X } from "lucide-react";
import { toast } from "sonner";
import { FilePicker } from "@/components/common/file-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AttachedFile, Order } from "@/lib/domain/types";
import { formatNumber } from "@/lib/format";
import { useData } from "@/lib/store/data";

/**
 * 실행사 작업 결과 등록 폼.
 * 제출하면 주문이 "검수중" 상태로 넘어가고 관리자 검수 대기열에 올라간다.
 */
export function ResultForm({ order, unitLabel }: { order: Order; unitLabel: string }) {
  const { submitResult } = useData();

  const [doneQty, setDoneQty] = useState<number>(order.result?.doneQty ?? order.qty);
  const [urls, setUrls] = useState<string[]>(
    order.result?.resultUrls.length ? order.result.resultUrls : [""],
  );
  const [memo, setMemo] = useState(order.result?.memo ?? "");
  const [files, setFiles] = useState<AttachedFile[]>(order.result?.files ?? []);

  function handleSubmit() {
    if (!Number.isFinite(doneQty) || doneQty <= 0) {
      toast.error("완료 수량을 입력해 주세요.");
      return;
    }
    if (doneQty > order.qty) {
      toast.error(`완료 수량은 주문 수량(${formatNumber(order.qty)})을 넘을 수 없습니다.`);
      return;
    }

    const resultUrls = urls.map((u) => u.trim()).filter(Boolean);
    if (resultUrls.length === 0 && !memo.trim()) {
      toast.error("결과 링크 또는 작업 메모 중 하나는 입력해 주세요.");
      return;
    }

    submitResult(order.orderNo, { doneQty, resultUrls, files, memo: memo.trim() });
    toast.success("작업 결과를 제출했습니다.", { description: "관리자 검수 후 완료 처리됩니다." });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>작업 결과 등록</CardTitle>
        <p className="text-sm text-muted-foreground">
          제출하면 관리자 검수가 시작되며, 승인 후 정산 대상에 포함됩니다.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {order.reviewNote && (
          <div className="flex flex-col gap-1 rounded-lg bg-amber-50 p-3 ring-1 ring-amber-200">
            <span className="text-[13px] font-medium text-amber-800">관리자 수정 요청</span>
            <p className="text-sm whitespace-pre-wrap text-amber-900">{order.reviewNote}</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="doneQty">
            완료 수량 <span className="text-destructive">*</span>
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="doneQty"
              type="number"
              inputMode="numeric"
              min={1}
              max={order.qty}
              value={doneQty || ""}
              onChange={(e) => setDoneQty(Number(e.target.value))}
              className="num max-w-40"
            />
            <span className="text-sm text-muted-foreground">
              {unitLabel} / 주문 {formatNumber(order.qty)}
              {unitLabel}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label>결과 링크</Label>
          <div className="flex flex-col gap-2">
            {urls.map((url, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={url}
                  onChange={(e) =>
                    setUrls(urls.map((v, idx) => (idx === i ? e.target.value : v)))
                  }
                  placeholder="https://"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="링크 삭제"
                  disabled={urls.length === 1}
                  onClick={() => setUrls(urls.filter((_, idx) => idx !== i))}
                >
                  <X />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => setUrls([...urls, ""])}
          >
            <Plus />
            링크 추가
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="resultMemo">작업 메모</Label>
          <Textarea
            id="resultMemo"
            rows={4}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="진행 방식, 특이사항 등을 남겨주세요."
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>결과 파일</Label>
          <FilePicker
            value={files}
            onChange={setFiles}
            label="결과 파일 첨부"
            hint="스크린샷, 리포트 등 (프로토타입에서는 파일명만 기록됩니다)"
          />
        </div>

        <div className="flex justify-end">
          <Button size="lg" onClick={handleSubmit}>
            <Send />
            작업 완료 요청
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

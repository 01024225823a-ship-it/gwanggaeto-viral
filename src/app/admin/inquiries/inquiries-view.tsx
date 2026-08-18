"use client";

import { useState } from "react";
import Link from "next/link";
import { Headphones } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/empty-state";
import { Field } from "@/components/common/field";
import { FilterTabs } from "@/components/common/filter-tabs";
import { FormDialog } from "@/components/common/form-dialog";
import { PageHeader } from "@/components/common/page-header";
import { InquiryBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { customerName } from "@/lib/domain/selectors";
import { INQUIRY_CATEGORY_LABEL } from "@/lib/domain/status";
import type { AppData, Inquiry, InquiryStatus } from "@/lib/domain/types";
import { formatDateTime } from "@/lib/format";
import { useData } from "@/lib/store/data";

type Filter = InquiryStatus | "ALL";

export function AdminInquiriesView() {
  const { data } = useData();
  const [filter, setFilter] = useState<Filter>("ALL");

  // 답변 대기건을 먼저, 그다음 최신순
  const all = [...data.inquiries].sort((a, b) => {
    if (a.status !== b.status) return a.status === "OPEN" ? -1 : 1;
    return b.createdAt.localeCompare(a.createdAt);
  });
  const rows = filter === "ALL" ? all : all.filter((i) => i.status === filter);

  const tabs = [
    { value: "ALL" as const, label: "전체", count: all.length },
    { value: "OPEN" as const, label: "답변대기", count: all.filter((i) => i.status === "OPEN").length },
    {
      value: "ANSWERED" as const,
      label: "답변완료",
      count: all.filter((i) => i.status === "ANSWERED").length,
    },
  ];

  return (
    <>
      <PageHeader
        title="문의관리"
        description="광고주 문의에 답변합니다. 답변하면 광고주 문의하기 화면에 즉시 표시됩니다."
      />

      <Card>
        <CardContent className="flex flex-col gap-4">
          <FilterTabs items={tabs} value={filter} onChange={setFilter} />

          {rows.length === 0 ? (
            <EmptyState icon={Headphones} title="문의가 없습니다" />
          ) : (
            <ul className="flex flex-col gap-3">
              {rows.map((inquiry) => (
                <li key={inquiry.id}>
                  <InquiryCard inquiry={inquiry} data={data} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function InquiryCard({ inquiry, data }: { inquiry: Inquiry; data: AppData }) {
  const { answerInquiry } = useData();

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded bg-muted px-1.5 py-0.5">
            {INQUIRY_CATEGORY_LABEL[inquiry.category]}
          </span>
          <span>{customerName(data, inquiry.customerId)}</span>
          {inquiry.orderNo && (
            <Link
              href={`/admin/orders/${inquiry.orderNo}`}
              className="num hover:text-foreground hover:underline"
            >
              {inquiry.orderNo}
            </Link>
          )}
          <span className="num">{formatDateTime(inquiry.createdAt)}</span>
        </div>
        <InquiryBadge status={inquiry.status} />
      </div>

      <div>
        <p className="font-medium">{inquiry.title}</p>
        <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">{inquiry.content}</p>
      </div>

      {inquiry.answer && (
        <div className="rounded-lg bg-muted/60 p-3">
          <p className="text-[13px] font-medium">답변</p>
          <p className="mt-1 text-sm whitespace-pre-wrap">{inquiry.answer}</p>
          <p className="num mt-1.5 text-xs text-muted-foreground">
            {formatDateTime(inquiry.answeredAt)}
          </p>
        </div>
      )}

      <div className="flex justify-end">
        <FormDialog<{ answer: string }>
          trigger={
            <Button size="sm" variant={inquiry.status === "OPEN" ? "default" : "outline"}>
              {inquiry.status === "OPEN" ? "답변하기" : "답변 수정"}
            </Button>
          }
          title="문의 답변"
          description={inquiry.title}
          submitLabel="답변 등록"
          initial={() => ({ answer: inquiry.answer ?? "" })}
          onSubmit={(form) => {
            if (!form.answer.trim()) return "답변 내용을 입력해 주세요.";
            answerInquiry(inquiry.id, form.answer.trim());
            toast.success("답변을 등록했습니다.");
          }}
        >
          {(form, patch) => (
            <>
              <div className="rounded-lg bg-muted/60 p-3 text-sm">
                <p className="text-xs text-muted-foreground">
                  {customerName(data, inquiry.customerId)} ·{" "}
                  {INQUIRY_CATEGORY_LABEL[inquiry.category]}
                </p>
                <p className="mt-1.5 whitespace-pre-wrap">{inquiry.content}</p>
              </div>
              <Field label="답변 내용" required>
                <Textarea
                  rows={6}
                  value={form.answer}
                  onChange={(e) => patch({ answer: e.target.value })}
                  placeholder="문의에 대한 답변을 작성해 주세요."
                />
              </Field>
            </>
          )}
        </FormDialog>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Headphones, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { LoginRequiredDialog } from "@/components/auth/login-required-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { Field } from "@/components/common/field";
import { PageHeader } from "@/components/common/page-header";
import { InquiryBadge } from "@/components/common/status-badge";
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
import { Textarea } from "@/components/ui/textarea";
import { BRAND } from "@/config/brand";
import { customerOrders } from "@/lib/domain/selectors";
import { INQUIRY_CATEGORY_LABEL } from "@/lib/domain/status";
import type { InquiryCategory } from "@/lib/domain/types";
import { formatDateTime } from "@/lib/format";
import { useData } from "@/lib/store/data";
import { useSession } from "@/lib/store/session";

const NO_ORDER = "__none__";
const CATEGORIES: InquiryCategory[] = ["ORDER", "PAYMENT", "SERVICE", "ETC"];

export function CustomerSupportView() {
  const { account } = useSession();
  const { data, createInquiry } = useData();

  // 고객센터 안내는 누구나 볼 수 있고, 문의 등록·내 문의 내역은 로그인이 필요하다
  const customerId = account?.role === "CUSTOMER" ? account.customerId : undefined;
  const canWrite = Boolean(customerId);

  const inquiries = data.inquiries.filter((i) => i.customerId === customerId);
  const orders = customerOrders(data, customerId);

  const [category, setCategory] = useState<InquiryCategory>("ORDER");
  const [orderNo, setOrderNo] = useState<string>(NO_ORDER);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  function handleSubmit() {
    if (!customerId) return;
    if (!title.trim()) {
      toast.error("문의 제목을 입력해 주세요.");
      return;
    }
    if (!content.trim()) {
      toast.error("문의 내용을 입력해 주세요.");
      return;
    }

    createInquiry({
      customerId,
      category,
      title: title.trim(),
      content: content.trim(),
      orderNo: orderNo !== NO_ORDER ? orderNo : undefined,
    });
    setTitle("");
    setContent("");
    setOrderNo(NO_ORDER);
    toast.success("문의가 등록되었습니다.", { description: "영업일 기준 1일 내 답변드립니다." });
  }

  return (
    <>
      <PageHeader title="문의하기" description="주문·결제·서비스에 대해 무엇이든 문의해 주세요." />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          {!canWrite && (
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                  <Headphones className="size-6" />
                </span>
                <div>
                  <p className="font-semibold">문의 등록은 로그인 후 이용할 수 있어요</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    고객센터 연락처와 운영시간은 로그인 없이도 확인하실 수 있습니다.
                  </p>
                </div>
                <LoginRequiredDialog
                  redirectTo="/support"
                  title="로그인이 필요한 서비스입니다"
                  description="문의를 등록하려면 로그인해 주세요."
                  trigger={<Button size="lg">로그인하고 문의하기</Button>}
                />
              </CardContent>
            </Card>
          )}

          {canWrite && (
          <Card>
            <CardHeader>
              <CardTitle>새 문의 작성</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="문의 유형" required>
                  <Select
                    value={category}
                    onValueChange={(v) => setCategory(v as InquiryCategory)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {INQUIRY_CATEGORY_LABEL[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="관련 주문" hint="특정 주문에 대한 문의라면 선택해 주세요.">
                  <Select value={orderNo} onValueChange={setOrderNo}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="선택 안 함" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_ORDER}>선택 안 함</SelectItem>
                      {orders.slice(0, 20).map((order) => (
                        <SelectItem key={order.orderNo} value={order.orderNo}>
                          {order.orderNo} · {order.productName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field label="제목" required>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="문의 제목을 입력해 주세요."
                />
              </Field>

              <Field label="내용" required>
                <Textarea
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="문의 내용을 자세히 적어주시면 더 정확하게 답변드릴 수 있습니다."
                />
              </Field>

              <div className="flex justify-end">
                <Button size="lg" onClick={handleSubmit}>
                  문의 등록
                </Button>
              </div>
            </CardContent>
          </Card>
          )}

          {canWrite && (
          <Card>
            <CardHeader>
              <CardTitle>내 문의 내역</CardTitle>
            </CardHeader>
            <CardContent>
              {inquiries.length === 0 ? (
                <EmptyState icon={Headphones} title="문의 내역이 없습니다" />
              ) : (
                <ul className="flex flex-col gap-3">
                  {inquiries.map((inquiry) => (
                    <li
                      key={inquiry.id}
                      className="flex flex-col gap-2.5 rounded-xl border border-border p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          {INQUIRY_CATEGORY_LABEL[inquiry.category]}
                          {inquiry.orderNo && (
                            <span className="num"> · {inquiry.orderNo}</span>
                          )}
                        </span>
                        <InquiryBadge status={inquiry.status} />
                      </div>
                      <div>
                        <p className="font-medium">{inquiry.title}</p>
                        <p className="num mt-0.5 text-xs text-muted-foreground">
                          {formatDateTime(inquiry.createdAt)}
                        </p>
                      </div>
                      <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                        {inquiry.content}
                      </p>
                      {inquiry.answer && (
                        <div className="rounded-lg bg-muted/60 p-3">
                          <p className="text-[13px] font-medium">{BRAND.name} 답변</p>
                          <p className="mt-1 text-sm whitespace-pre-wrap">{inquiry.answer}</p>
                          <p className="num mt-1.5 text-xs text-muted-foreground">
                            {formatDateTime(inquiry.answeredAt)}
                          </p>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          )}
        </div>

        <aside>
          <Card className="lg:sticky lg:top-22">
            <CardHeader>
              <CardTitle>고객센터</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Phone className="size-4" />
                </span>
                <div>
                  <p className="num font-medium">{BRAND.support.phone}</p>
                  <p className="text-xs text-muted-foreground">{BRAND.support.hours}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Mail className="size-4" />
                </span>
                <div>
                  <p className="font-medium">{BRAND.support.email}</p>
                  <p className="text-xs text-muted-foreground">이메일 문의</p>
                </div>
              </div>
              <p className="mt-1 rounded-lg bg-muted/60 p-3 text-[13px] text-muted-foreground">
                문의는 영업일 기준 1일 이내에 답변드립니다. 작업 진행 상황은 주문내역에서 실시간으로
                확인하실 수 있습니다.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}

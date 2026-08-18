"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/empty-state";
import { Field, ToggleField } from "@/components/common/field";
import { FormDialog } from "@/components/common/form-dialog";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Customer } from "@/lib/domain/types";
import { formatPoint, formatWon } from "@/lib/format";
import { useData } from "@/lib/store/data";
import { cn } from "@/lib/utils";

interface CustomerForm {
  company: string;
  manager: string;
  phone: string;
  email: string;
  bizNo: string;
  grade: Customer["grade"];
  active: boolean;
}

const GRADE_LABEL: Record<Customer["grade"], string> = {
  BASIC: "BASIC",
  PRO: "PRO",
  VIP: "VIP",
};

const GRADE_CLASS: Record<Customer["grade"], string> = {
  BASIC: "bg-muted text-muted-foreground",
  PRO: "bg-sky-50 text-sky-700",
  VIP: "bg-violet-50 text-violet-700",
};

export function AdminCustomersView() {
  const { data, upsertCustomer } = useData();
  const [keyword, setKeyword] = useState("");

  const q = keyword.trim().toLowerCase();
  const rows = data.customers.filter((customer) => {
    if (!q) return true;
    return (
      customer.company.toLowerCase().includes(q) ||
      customer.manager.toLowerCase().includes(q) ||
      customer.email.toLowerCase().includes(q)
    );
  });

  function save(form: CustomerForm, existing?: Customer): string | void {
    const company = form.company.trim();
    if (!company) return "회사명을 입력해 주세요.";
    if (!form.manager.trim()) return "담당자명을 입력해 주세요.";

    upsertCustomer({
      id: existing?.id ?? `cust-${crypto.randomUUID().slice(0, 8)}`,
      company,
      manager: form.manager.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      bizNo: form.bizNo.trim(),
      point: existing?.point ?? 0,
      grade: form.grade,
      active: form.active,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    });
    toast.success(existing ? "광고주 정보를 수정했습니다." : "광고주를 등록했습니다.");
  }

  return (
    <>
      <PageHeader
        title="광고주관리"
        description="광고주 계정과 등급, 포인트 현황을 확인합니다."
        actions={
          <CustomerFormDialog
            trigger={
              <Button size="lg">
                <Plus />
                광고주 등록
              </Button>
            }
            title="광고주 등록"
            onSave={(form) => save(form)}
          />
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex justify-end">
            <div className="relative sm:w-72">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="회사명 · 담당자 · 이메일 검색"
                className="pl-8"
              />
            </div>
          </div>

          {rows.length === 0 ? (
            <EmptyState title="광고주가 없습니다" description="조건에 맞는 광고주가 없습니다." />
          ) : (
            <div className="scrollbar-thin overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>회사명</TableHead>
                    <TableHead>담당자</TableHead>
                    <TableHead>연락처</TableHead>
                    <TableHead>등급</TableHead>
                    <TableHead className="text-right">보유 포인트</TableHead>
                    <TableHead className="text-right">주문</TableHead>
                    <TableHead className="text-right">누적 결제</TableHead>
                    <TableHead>활성</TableHead>
                    <TableHead className="text-right">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((customer) => {
                    const orders = data.orders.filter(
                      (o) => o.customerId === customer.id && o.status !== "CANCELED",
                    );
                    const spend = orders.reduce((acc, o) => acc + o.amount, 0);
                    return (
                      <TableRow key={customer.id}>
                        <TableCell className="max-w-48 truncate font-medium">
                          {customer.company}
                          <p className="num text-xs font-normal text-muted-foreground">
                            {customer.bizNo}
                          </p>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{customer.manager}</TableCell>
                        <TableCell className="num whitespace-nowrap text-muted-foreground">
                          {customer.phone}
                          <p className="text-xs">{customer.email}</p>
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                              GRADE_CLASS[customer.grade],
                            )}
                          >
                            {GRADE_LABEL[customer.grade]}
                          </span>
                        </TableCell>
                        <TableCell className="num text-right whitespace-nowrap">
                          {formatPoint(customer.point)}
                        </TableCell>
                        <TableCell className="num text-right">{orders.length}</TableCell>
                        <TableCell className="num text-right whitespace-nowrap">
                          {formatWon(spend)}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={customer.active}
                            aria-label={`${customer.company} 활성`}
                            onCheckedChange={(checked) =>
                              upsertCustomer({ ...customer, active: checked })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button size="sm" variant="ghost" asChild>
                              <Link href="/admin/points">포인트</Link>
                            </Button>
                            <CustomerFormDialog
                              trigger={
                                <Button size="sm" variant="outline">
                                  수정
                                </Button>
                              }
                              title="광고주 수정"
                              customer={customer}
                              onSave={(form) => save(form, customer)}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function CustomerFormDialog({
  trigger,
  title,
  customer,
  onSave,
}: {
  trigger: React.ReactNode;
  title: string;
  customer?: Customer;
  onSave: (form: CustomerForm) => string | void;
}) {
  return (
    <FormDialog<CustomerForm>
      trigger={trigger}
      title={title}
      submitLabel={customer ? "수정" : "등록"}
      initial={() => ({
        company: customer?.company ?? "",
        manager: customer?.manager ?? "",
        phone: customer?.phone ?? "",
        email: customer?.email ?? "",
        bizNo: customer?.bizNo ?? "",
        grade: customer?.grade ?? "BASIC",
        active: customer?.active ?? true,
      })}
      onSubmit={onSave}
    >
      {(form, patch) => (
        <>
          <Field label="회사명" required>
            <Input
              value={form.company}
              onChange={(e) => patch({ company: e.target.value })}
              placeholder="예) (주)그린푸드컴퍼니"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="담당자" required>
              <Input value={form.manager} onChange={(e) => patch({ manager: e.target.value })} />
            </Field>
            <Field label="연락처">
              <Input
                value={form.phone}
                onChange={(e) => patch({ phone: e.target.value })}
                placeholder="010-0000-0000"
                className="num"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="이메일">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => patch({ email: e.target.value })}
              />
            </Field>
            <Field label="사업자등록번호">
              <Input
                value={form.bizNo}
                onChange={(e) => patch({ bizNo: e.target.value })}
                placeholder="000-00-00000"
                className="num"
              />
            </Field>
          </div>
          <Field label="등급" hint="향후 등급별 단가 정책 확장 시 사용됩니다.">
            <Select
              value={form.grade}
              onValueChange={(v) => patch({ grade: v as Customer["grade"] })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BASIC">BASIC</SelectItem>
                <SelectItem value="PRO">PRO</SelectItem>
                <SelectItem value="VIP">VIP</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <ToggleField
            title="계정 활성"
            description="비활성 시 로그인 및 주문이 제한됩니다."
            control={
              <Switch checked={form.active} onCheckedChange={(v) => patch({ active: v })} />
            }
          />
        </>
      )}
    </FormDialog>
  );
}

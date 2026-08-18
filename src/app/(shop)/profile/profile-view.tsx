"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Field } from "@/components/common/field";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { customerOrders, orderStats } from "@/lib/domain/selectors";
import { formatDate, formatPoint, formatWon } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/mock/accounts";
import { useData } from "@/lib/store/data";
import { useSession } from "@/lib/store/session";

export function CustomerProfileView() {
  const router = useRouter();
  const { account, logout } = useSession();
  const { data, upsertCustomer } = useData();

  const customer = data.customers.find((c) => c.id === account?.customerId);
  const orders = customerOrders(data, account?.customerId);
  const stats = orderStats(orders);

  const [form, setForm] = useState({
    company: customer?.company ?? "",
    manager: customer?.manager ?? "",
    phone: customer?.phone ?? "",
    email: customer?.email ?? "",
    bizNo: customer?.bizNo ?? "",
  });

  function patch(next: Partial<typeof form>) {
    setForm((prev) => ({ ...prev, ...next }));
  }

  function handleSave() {
    if (!customer) return;
    if (!form.company.trim()) {
      toast.error("회사명을 입력해 주세요.");
      return;
    }
    upsertCustomer({
      ...customer,
      company: form.company.trim(),
      manager: form.manager.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      bizNo: form.bizNo.trim(),
    });
    toast.success("회사 정보를 저장했습니다.");
  }

  return (
    <>
      <PageHeader title="내 정보" description="회사 정보와 이용 현황을 확인합니다." />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle>회사 정보</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field label="회사명" required>
              <Input value={form.company} onChange={(e) => patch({ company: e.target.value })} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="담당자">
                <Input value={form.manager} onChange={(e) => patch({ manager: e.target.value })} />
              </Field>
              <Field label="연락처">
                <Input
                  value={form.phone}
                  onChange={(e) => patch({ phone: e.target.value })}
                  className="num"
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
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
                  className="num"
                />
              </Field>
            </div>
            <div className="flex justify-end">
              <Button size="lg" onClick={handleSave}>
                저장
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>이용 현황</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <InfoRow label="등급" value={customer?.grade ?? "-"} />
              <InfoRow label="가입일" value={formatDate(customer?.createdAt)} />
              <Separator />
              <InfoRow label="누적 주문" value={`${stats.total}건`} />
              <InfoRow label="완료 주문" value={`${stats.completed}건`} />
              <InfoRow label="누적 결제" value={formatWon(stats.amount)} />
              <InfoRow label="보유 포인트" value={formatPoint(customer?.point ?? 0)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>로그인 계정</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <InfoRow label="이름" value={account?.name ?? "-"} />
              <InfoRow label="이메일" value={account?.email ?? "-"} />
              <InfoRow label="권한" value={account ? ROLE_LABEL[account.role] : "-"} />
              <p className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
                프로토타입 단계에서는 데모 계정으로 로그인합니다. 실제 회원가입·인증은 이후 단계에서
                연결됩니다.
              </p>
              <ConfirmDialog
                trigger={
                  <Button variant="outline" className="w-full">
                    <LogOut />
                    로그아웃
                  </Button>
                }
                title="로그아웃할까요?"
                description="다시 로그인 화면으로 이동합니다. 저장된 데모 데이터는 유지됩니다."
                confirmLabel="로그아웃"
                onConfirm={() => {
                  logout();
                  router.push("/login");
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="num font-medium">{value}</span>
    </div>
  );
}

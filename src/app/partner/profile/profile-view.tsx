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
import { Textarea } from "@/components/ui/textarea";
import { categoryName, findProduct, partnerOrders, settlementTotals } from "@/lib/domain/selectors";
import { formatDate, formatWon } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/mock/accounts";
import { useData } from "@/lib/store/data";
import { useSession } from "@/lib/store/session";

export function PartnerProfileView() {
  const router = useRouter();
  const { account, logout } = useSession();
  const { data, upsertPartner } = useData();

  const partner = data.partners.find((p) => p.id === account?.partnerId);
  const jobs = partnerOrders(data, account?.partnerId);
  const totals = settlementTotals(data, account?.partnerId);

  const [form, setForm] = useState({
    manager: partner?.manager ?? "",
    phone: partner?.phone ?? "",
    email: partner?.email ?? "",
    specialty: partner?.specialty ?? "",
    memo: partner?.memo ?? "",
  });

  function patch(next: Partial<typeof form>) {
    setForm((prev) => ({ ...prev, ...next }));
  }

  function handleSave() {
    if (!partner) return;
    if (!form.manager.trim()) {
      toast.error("담당자명을 입력해 주세요.");
      return;
    }
    upsertPartner({
      ...partner,
      manager: form.manager.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      specialty: form.specialty.trim(),
      memo: form.memo.trim() || undefined,
    });
    toast.success("실행사 정보를 저장했습니다.");
  }

  return (
    <>
      <PageHeader title="내 정보" description="담당자 정보와 계약 단가를 확인합니다." />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>{partner?.name ?? "실행사"} 정보</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="담당자" required>
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
              <Field label="이메일">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => patch({ email: e.target.value })}
                />
              </Field>
              <Field label="전문분야">
                <Input
                  value={form.specialty}
                  onChange={(e) => patch({ specialty: e.target.value })}
                />
              </Field>
              <Field label="메모">
                <Textarea
                  rows={2}
                  value={form.memo}
                  onChange={(e) => patch({ memo: e.target.value })}
                />
              </Field>
              <div className="flex justify-end">
                <Button size="lg" onClick={handleSave}>
                  저장
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>계약 단가</CardTitle>
              <p className="text-sm text-muted-foreground">
                단가 변경이 필요하면 운영팀에 문의해 주세요. 별도 계약 단가가 없는 서비스는 기본
                원가가 적용됩니다.
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {partner?.unitCosts.length ? (
                partner.unitCosts.map((unit) => (
                  <div
                    key={unit.productId}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border px-3.5 py-2.5 text-sm"
                  >
                    <span className="min-w-0 truncate">
                      {findProduct(data, unit.productId)?.name ?? unit.productId}
                    </span>
                    <span className="num shrink-0 font-medium">{formatWon(unit.cost)}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">등록된 계약 단가가 없습니다.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>담당 카테고리</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1.5">
              {partner?.categoryIds.map((id) => (
                <span
                  key={id}
                  className="rounded-full bg-muted px-2.5 py-1 text-[13px] text-muted-foreground"
                >
                  {categoryName(data, id)}
                </span>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>활동 현황</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <InfoRow label="등록일" value={formatDate(partner?.createdAt)} />
              <InfoRow label="누적 배정" value={`${jobs.length}건`} />
              <InfoRow
                label="완료 작업"
                value={`${jobs.filter((o) => o.status === "COMPLETED").length}건`}
              />
              <Separator />
              <InfoRow label="정산 예정" value={formatWon(totals.pending + totals.scheduled)} />
              <InfoRow label="지급 완료" value={formatWon(totals.paid)} />
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
              <ConfirmDialog
                trigger={
                  <Button variant="outline" className="w-full">
                    <LogOut />
                    로그아웃
                  </Button>
                }
                title="로그아웃할까요?"
                description="다시 로그인 화면으로 이동합니다."
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

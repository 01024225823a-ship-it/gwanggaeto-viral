"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/empty-state";
import { Field, ToggleField } from "@/components/common/field";
import { FormDialog } from "@/components/common/form-dialog";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { categoryName, settlementTotals } from "@/lib/domain/selectors";
import type { AppData, Partner } from "@/lib/domain/types";
import { formatWon } from "@/lib/format";
import { useData } from "@/lib/store/data";

interface PartnerForm {
  name: string;
  manager: string;
  phone: string;
  email: string;
  specialty: string;
  memo: string;
  categoryIds: string[];
  /** productId → 매입단가 입력값 (빈 문자열이면 상품 기본 원가 사용) */
  unitCosts: Record<string, string>;
  active: boolean;
}

export function AdminPartnersView() {
  const { data, upsertPartner } = useData();
  const [keyword, setKeyword] = useState("");

  const q = keyword.trim().toLowerCase();
  const rows = data.partners.filter((partner) => {
    if (!q) return true;
    return (
      partner.name.toLowerCase().includes(q) || partner.manager.toLowerCase().includes(q)
    );
  });

  function save(form: PartnerForm, existing?: Partner): string | void {
    const name = form.name.trim();
    if (!name) return "실행사명을 입력해 주세요.";
    if (!form.manager.trim()) return "담당자명을 입력해 주세요.";
    if (form.categoryIds.length === 0) return "담당 카테고리를 하나 이상 선택해 주세요.";

    const unitCosts = Object.entries(form.unitCosts)
      .filter(([, value]) => value.trim() !== "" && Number(value) > 0)
      .map(([productId, value]) => ({ productId, cost: Number(value) }));

    upsertPartner({
      id: existing?.id ?? `ptn-${crypto.randomUUID().slice(0, 8)}`,
      name,
      manager: form.manager.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      categoryIds: form.categoryIds,
      unitCosts,
      specialty: form.specialty.trim(),
      active: form.active,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      memo: form.memo.trim() || undefined,
    });
    toast.success(existing ? "실행사 정보를 수정했습니다." : "실행사를 등록했습니다.");
  }

  return (
    <>
      <PageHeader
        title="실행사관리"
        description="작업을 수행하는 실행사와 서비스별 매입단가를 관리합니다."
        actions={
          <PartnerFormDialog
            trigger={
              <Button size="lg">
                <Plus />
                실행사 등록
              </Button>
            }
            title="실행사 등록"
            data={data}
            onSave={(form) => save(form)}
          />
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex justify-end">
            <div className="relative sm:w-64">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="실행사 · 담당자 검색"
                className="pl-8"
              />
            </div>
          </div>

          {rows.length === 0 ? (
            <EmptyState title="실행사가 없습니다" description="조건에 맞는 실행사가 없습니다." />
          ) : (
            <div className="scrollbar-thin overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>실행사</TableHead>
                    <TableHead>담당자</TableHead>
                    <TableHead>담당 카테고리</TableHead>
                    <TableHead className="text-right">진행중</TableHead>
                    <TableHead className="text-right">완료</TableHead>
                    <TableHead className="text-right">정산 예정</TableHead>
                    <TableHead>활성</TableHead>
                    <TableHead className="text-right">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((partner) => {
                    const jobs = data.orders.filter((o) => o.partnerId === partner.id);
                    const active = jobs.filter(
                      (o) =>
                        o.status === "ASSIGNED" ||
                        o.status === "IN_PROGRESS" ||
                        o.status === "IN_REVIEW",
                    ).length;
                    const done = jobs.filter((o) => o.status === "COMPLETED").length;
                    const totals = settlementTotals(data, partner.id);
                    return (
                      <TableRow key={partner.id}>
                        <TableCell className="max-w-48 truncate font-medium">
                          {partner.name}
                          <p className="truncate text-xs font-normal text-muted-foreground">
                            {partner.specialty}
                          </p>
                        </TableCell>
                        <TableCell className="num whitespace-nowrap">
                          {partner.manager}
                          <p className="text-xs text-muted-foreground">{partner.phone}</p>
                        </TableCell>
                        <TableCell className="max-w-56">
                          <div className="flex flex-wrap gap-1">
                            {partner.categoryIds.map((id) => (
                              <span
                                key={id}
                                className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
                              >
                                {categoryName(data, id)}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="num text-right">{active}</TableCell>
                        <TableCell className="num text-right">{done}</TableCell>
                        <TableCell className="num text-right whitespace-nowrap">
                          {formatWon(totals.pending + totals.scheduled)}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={partner.active}
                            aria-label={`${partner.name} 활성`}
                            onCheckedChange={(checked) =>
                              upsertPartner({ ...partner, active: checked })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <PartnerFormDialog
                            trigger={
                              <Button size="sm" variant="outline">
                                수정
                              </Button>
                            }
                            title="실행사 수정"
                            data={data}
                            partner={partner}
                            onSave={(form) => save(form, partner)}
                          />
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

function PartnerFormDialog({
  trigger,
  title,
  data,
  partner,
  onSave,
}: {
  trigger: React.ReactNode;
  title: string;
  data: AppData;
  partner?: Partner;
  onSave: (form: PartnerForm) => string | void;
}) {
  return (
    <FormDialog<PartnerForm>
      trigger={trigger}
      title={title}
      submitLabel={partner ? "수정" : "등록"}
      initial={() => ({
        name: partner?.name ?? "",
        manager: partner?.manager ?? "",
        phone: partner?.phone ?? "",
        email: partner?.email ?? "",
        specialty: partner?.specialty ?? "",
        memo: partner?.memo ?? "",
        categoryIds: partner?.categoryIds ?? [],
        unitCosts: Object.fromEntries(
          (partner?.unitCosts ?? []).map((u) => [u.productId, String(u.cost)]),
        ),
        active: partner?.active ?? true,
      })}
      onSubmit={onSave}
    >
      {(form, patch) => {
        const scopedProducts = data.products.filter((p) =>
          form.categoryIds.includes(p.categoryId),
        );
        return (
          <>
            <Field label="실행사명" required>
              <Input value={form.name} onChange={(e) => patch({ name: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="담당자" required>
                <Input value={form.manager} onChange={(e) => patch({ manager: e.target.value })} />
              </Field>
              <Field label="연락처">
                <Input
                  value={form.phone}
                  onChange={(e) => patch({ phone: e.target.value })}
                  className="num"
                  placeholder="010-0000-0000"
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
                placeholder="예) 유튜브·인스타 지표 작업 전문"
              />
            </Field>

            <Field label="담당 카테고리" required hint="선택한 카테고리의 주문만 배정할 수 있습니다.">
              <div className="grid grid-cols-2 gap-2">
                {data.categories.map((category) => {
                  const checked = form.categoryIds.includes(category.id);
                  return (
                    <label
                      key={category.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(next) =>
                          patch({
                            categoryIds: next
                              ? [...form.categoryIds, category.id]
                              : form.categoryIds.filter((id) => id !== category.id),
                          })
                        }
                      />
                      {category.name}
                    </label>
                  );
                })}
              </div>
            </Field>

            {scopedProducts.length > 0 && (
              <Field
                label="서비스별 매입단가"
                hint="비워두면 상품에 설정된 기본 원가가 적용됩니다."
              >
                <div className="flex flex-col gap-2">
                  {scopedProducts.map((product) => (
                    <div key={product.id} className="flex items-center gap-2">
                      <Label className="min-w-0 flex-1 truncate text-[13px] font-normal">
                        {product.name}
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        value={form.unitCosts[product.id] ?? ""}
                        onChange={(e) =>
                          patch({
                            unitCosts: { ...form.unitCosts, [product.id]: e.target.value },
                          })
                        }
                        placeholder={String(product.cost)}
                        className="num w-32"
                      />
                    </div>
                  ))}
                </div>
              </Field>
            )}

            <Field label="메모">
              <Textarea
                rows={2}
                value={form.memo}
                onChange={(e) => patch({ memo: e.target.value })}
                placeholder="협업 시 참고할 내용"
              />
            </Field>

            <ToggleField
              title="실행사 활성"
              description="비활성 시 배정 대상에서 제외됩니다."
              control={
                <Switch checked={form.active} onCheckedChange={(v) => patch({ active: v })} />
              }
            />
          </>
        );
      }}
    </FormDialog>
  );
}

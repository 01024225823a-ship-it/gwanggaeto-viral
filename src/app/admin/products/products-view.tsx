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
import { Textarea } from "@/components/ui/textarea";
import { categoryName } from "@/lib/domain/selectors";
import type { AppData, Product } from "@/lib/domain/types";
import { formatNumber, formatPercent, formatWon } from "@/lib/format";
import { useData } from "@/lib/store/data";

interface ProductForm {
  categoryId: string;
  name: string;
  description: string;
  price: number;
  cost: number;
  minQty: number;
  maxQty: number;
  unitLabel: string;
  leadDays: number;
  defaultPartnerId: string;
  urlPlaceholder: string;
  guide: string;
  visible: boolean;
  recommended: boolean;
  requiresUrl: boolean;
  allowsFile: boolean;
}

const NO_PARTNER = "__none__";

export function AdminProductsView() {
  const { data, upsertProduct } = useData();
  const [categoryId, setCategoryId] = useState("ALL");
  const [keyword, setKeyword] = useState("");

  const q = keyword.trim().toLowerCase();
  const rows = data.products.filter((product) => {
    if (categoryId !== "ALL" && product.categoryId !== categoryId) return false;
    if (!q) return true;
    return product.name.toLowerCase().includes(q);
  });

  function save(form: ProductForm, existing?: Product): string | void {
    const name = form.name.trim();
    if (!form.categoryId) return "카테고리를 선택해 주세요.";
    if (!name) return "상품명을 입력해 주세요.";
    if (form.price <= 0) return "판매가를 입력해 주세요.";
    if (form.cost < 0) return "원가는 0 이상이어야 합니다.";
    if (form.minQty <= 0) return "최소 수량은 1 이상이어야 합니다.";
    if (form.maxQty < form.minQty) return "최대 수량은 최소 수량보다 커야 합니다.";

    upsertProduct({
      id: existing?.id ?? `prd-${crypto.randomUUID().slice(0, 8)}`,
      categoryId: form.categoryId,
      name,
      description: form.description.trim(),
      price: form.price,
      cost: form.cost,
      minQty: form.minQty,
      maxQty: form.maxQty,
      unitLabel: form.unitLabel.trim() || "건",
      leadDays: form.leadDays,
      defaultPartnerId:
        form.defaultPartnerId && form.defaultPartnerId !== NO_PARTNER
          ? form.defaultPartnerId
          : undefined,
      urlPlaceholder: form.urlPlaceholder.trim() || undefined,
      guide: form.guide
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      visible: form.visible,
      recommended: form.recommended,
      requiresUrl: form.requiresUrl,
      allowsFile: form.allowsFile,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    });
    toast.success(existing ? "상품을 수정했습니다." : "상품을 등록했습니다.");
  }

  return (
    <>
      <PageHeader
        title="상품관리"
        description="판매가·원가와 주문 화면 노출 여부를 관리합니다."
        actions={
          <ProductFormDialog
            trigger={
              <Button size="lg">
                <Plus />
                상품 등록
              </Button>
            }
            title="상품 등록"
            data={data}
            onSave={(form) => save(form)}
          />
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체 카테고리</SelectItem>
                {data.categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative sm:w-64">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="상품명 검색"
                className="pl-8"
              />
            </div>
          </div>

          {rows.length === 0 ? (
            <EmptyState title="상품이 없습니다" description="조건에 맞는 상품이 없습니다." />
          ) : (
            <div className="scrollbar-thin overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>카테고리</TableHead>
                    <TableHead>상품명</TableHead>
                    <TableHead className="text-right">판매가</TableHead>
                    <TableHead className="text-right">원가</TableHead>
                    <TableHead className="text-right">마진율</TableHead>
                    <TableHead className="text-right">수량범위</TableHead>
                    <TableHead className="text-right">소요일</TableHead>
                    <TableHead>추천</TableHead>
                    <TableHead>노출</TableHead>
                    <TableHead className="text-right">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((product) => {
                    const margin = product.price - product.cost;
                    const rate = product.price > 0 ? (margin / product.price) * 100 : 0;
                    return (
                      <TableRow key={product.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {categoryName(data, product.categoryId)}
                        </TableCell>
                        <TableCell className="max-w-56 truncate font-medium">
                          {product.name}
                        </TableCell>
                        <TableCell className="num text-right whitespace-nowrap">
                          {formatWon(product.price)}
                        </TableCell>
                        <TableCell className="num text-right whitespace-nowrap text-muted-foreground">
                          {formatWon(product.cost)}
                        </TableCell>
                        <TableCell className="num text-right">{formatPercent(rate)}</TableCell>
                        <TableCell className="num text-right whitespace-nowrap text-muted-foreground">
                          {formatNumber(product.minQty)}~{formatNumber(product.maxQty)}
                          {product.unitLabel}
                        </TableCell>
                        <TableCell className="num text-right text-muted-foreground">
                          {product.leadDays}일
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={product.recommended}
                            aria-label={`${product.name} 추천`}
                            onCheckedChange={(checked) =>
                              upsertProduct({ ...product, recommended: checked })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={product.visible}
                            aria-label={`${product.name} 노출`}
                            onCheckedChange={(checked) =>
                              upsertProduct({ ...product, visible: checked })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <ProductFormDialog
                            trigger={
                              <Button size="sm" variant="outline">
                                수정
                              </Button>
                            }
                            title="상품 수정"
                            data={data}
                            product={product}
                            onSave={(form) => save(form, product)}
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

function ProductFormDialog({
  trigger,
  title,
  data,
  product,
  onSave,
}: {
  trigger: React.ReactNode;
  title: string;
  data: AppData;
  product?: Product;
  onSave: (form: ProductForm) => string | void;
}) {
  return (
    <FormDialog<ProductForm>
      trigger={trigger}
      title={title}
      submitLabel={product ? "수정" : "등록"}
      initial={() => ({
        categoryId: product?.categoryId ?? data.categories[0]?.id ?? "",
        name: product?.name ?? "",
        description: product?.description ?? "",
        price: product?.price ?? 0,
        cost: product?.cost ?? 0,
        minQty: product?.minQty ?? 1,
        maxQty: product?.maxQty ?? 100,
        unitLabel: product?.unitLabel ?? "건",
        leadDays: product?.leadDays ?? 7,
        defaultPartnerId: product?.defaultPartnerId ?? NO_PARTNER,
        urlPlaceholder: product?.urlPlaceholder ?? "",
        guide: product?.guide?.join("\n") ?? "",
        visible: product?.visible ?? true,
        recommended: product?.recommended ?? false,
        requiresUrl: product?.requiresUrl ?? false,
        allowsFile: product?.allowsFile ?? false,
      })}
      onSubmit={onSave}
    >
      {(form, patch) => {
        const margin = form.price - form.cost;
        const rate = form.price > 0 ? (margin / form.price) * 100 : 0;
        return (
          <>
            <Field label="카테고리" required>
              <Select value={form.categoryId} onValueChange={(v) => patch({ categoryId: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  {data.categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="상품명" required>
              <Input
                value={form.name}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder="예) 유튜브 조회수"
              />
            </Field>

            <Field label="설명">
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => patch({ description: e.target.value })}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="판매가 (원/단위)" required>
                <Input
                  type="number"
                  min={0}
                  value={form.price || ""}
                  onChange={(e) => patch({ price: Number(e.target.value) })}
                  className="num"
                />
              </Field>
              <Field label="실행원가 (원/단위)" required>
                <Input
                  type="number"
                  min={0}
                  value={form.cost || ""}
                  onChange={(e) => patch({ cost: Number(e.target.value) })}
                  className="num"
                />
              </Field>
            </div>

            <div className="rounded-lg bg-muted/60 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">단위당 마진</span>
                <span className="num font-medium text-primary">
                  {formatWon(margin)} · {formatPercent(rate)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Field label="최소 수량" required>
                <Input
                  type="number"
                  min={1}
                  value={form.minQty || ""}
                  onChange={(e) => patch({ minQty: Number(e.target.value) })}
                  className="num"
                />
              </Field>
              <Field label="최대 수량" required>
                <Input
                  type="number"
                  min={1}
                  value={form.maxQty || ""}
                  onChange={(e) => patch({ maxQty: Number(e.target.value) })}
                  className="num"
                />
              </Field>
              <Field label="수량 단위">
                <Input
                  value={form.unitLabel}
                  onChange={(e) => patch({ unitLabel: e.target.value })}
                  placeholder="건"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="예상 소요일" hint="배정 시 작업기한 기본값">
                <Input
                  type="number"
                  min={1}
                  value={form.leadDays || ""}
                  onChange={(e) => patch({ leadDays: Number(e.target.value) })}
                  className="num"
                />
              </Field>
              <Field label="기본 실행사" hint="배정 화면에서 우선 추천됩니다.">
                <Select
                  value={form.defaultPartnerId}
                  onValueChange={(v) => patch({ defaultPartnerId: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PARTNER}>지정 안 함</SelectItem>
                    {data.partners.map((partner) => (
                      <SelectItem key={partner.id} value={partner.id}>
                        {partner.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <ToggleField
              title="작업 URL 입력 필수"
              description="주문 시 광고주가 대상 URL을 입력해야 합니다."
              control={
                <Switch
                  checked={form.requiresUrl}
                  onCheckedChange={(v) => patch({ requiresUrl: v })}
                />
              }
            />

            {form.requiresUrl && (
              <Field label="URL 입력 힌트">
                <Input
                  value={form.urlPlaceholder}
                  onChange={(e) => patch({ urlPlaceholder: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </Field>
            )}

            <ToggleField
              title="파일 첨부 허용"
              description="원고·이미지 등 참고자료를 첨부할 수 있습니다."
              control={
                <Switch
                  checked={form.allowsFile}
                  onCheckedChange={(v) => patch({ allowsFile: v })}
                />
              }
            />

            <Field label="상품 안내" hint="한 줄에 하나씩 입력하면 주문 화면에 목록으로 표시됩니다.">
              <Textarea
                rows={3}
                value={form.guide}
                onChange={(e) => patch({ guide: e.target.value })}
                placeholder={"영상이 공개 상태여야 합니다.\n작업 시작 후 24시간 내 유입이 시작됩니다."}
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <ToggleField
                title="주문 화면 노출"
                control={
                  <Switch checked={form.visible} onCheckedChange={(v) => patch({ visible: v })} />
                }
              />
              <ToggleField
                title="추천 상품"
                control={
                  <Switch
                    checked={form.recommended}
                    onCheckedChange={(v) => patch({ recommended: v })}
                  />
                }
              />
            </div>
          </>
        );
      }}
    </FormDialog>
  );
}

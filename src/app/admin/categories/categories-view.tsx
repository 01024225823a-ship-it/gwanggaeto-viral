"use client";

import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Field, ToggleField } from "@/components/common/field";
import { FormDialog } from "@/components/common/form-dialog";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import type { Category } from "@/lib/domain/types";
import { useData } from "@/lib/store/data";

interface CategoryForm {
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  active: boolean;
}

export function AdminCategoriesView() {
  const { data, upsertCategory } = useData();
  const categories = [...data.categories].sort((a, b) => a.sortOrder - b.sortOrder);

  function save(form: CategoryForm, existing?: Category): string | void {
    const name = form.name.trim();
    const slug = form.slug.trim().toLowerCase();
    if (!name) return "카테고리명을 입력해 주세요.";
    if (!slug) return "슬러그를 입력해 주세요.";

    const duplicated = data.categories.some(
      (c) => c.slug === slug && c.id !== existing?.id,
    );
    if (duplicated) return "이미 사용중인 슬러그입니다.";

    upsertCategory({
      id: existing?.id ?? `cat-${slug}`,
      name,
      slug,
      description: form.description.trim(),
      sortOrder: form.sortOrder,
      active: form.active,
    });
    toast.success(existing ? "카테고리를 수정했습니다." : "카테고리를 등록했습니다.");
  }

  return (
    <>
      <PageHeader
        title="카테고리관리"
        description="주문 화면에 노출되는 서비스 카테고리와 순서를 관리합니다."
        actions={
          <CategoryFormDialog
            trigger={
              <Button size="lg">
                <Plus />
                카테고리 등록
              </Button>
            }
            title="카테고리 등록"
            nextSortOrder={categories.length + 1}
            onSave={(form) => save(form)}
          />
        }
      />

      <Card>
        <CardContent>
          <div className="scrollbar-thin overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">순서</TableHead>
                  <TableHead>카테고리명</TableHead>
                  <TableHead>슬러그</TableHead>
                  <TableHead>설명</TableHead>
                  <TableHead className="text-right">상품 수</TableHead>
                  <TableHead>노출</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => {
                  const productCount = data.products.filter(
                    (p) => p.categoryId === category.id,
                  ).length;
                  return (
                    <TableRow key={category.id}>
                      <TableCell className="num text-muted-foreground">
                        {category.sortOrder}
                      </TableCell>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="num text-muted-foreground">{category.slug}</TableCell>
                      <TableCell className="max-w-72 truncate text-muted-foreground">
                        {category.description}
                      </TableCell>
                      <TableCell className="num text-right">{productCount}</TableCell>
                      <TableCell>
                        <Switch
                          checked={category.active}
                          aria-label={`${category.name} 노출`}
                          onCheckedChange={(checked) => {
                            upsertCategory({ ...category, active: checked });
                            toast.success(
                              `${category.name} 카테고리를 ${checked ? "노출" : "숨김"} 처리했습니다.`,
                            );
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <CategoryFormDialog
                          trigger={
                            <Button size="sm" variant="outline">
                              수정
                            </Button>
                          }
                          title="카테고리 수정"
                          category={category}
                          onSave={(form) => save(form, category)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function CategoryFormDialog({
  trigger,
  title,
  category,
  nextSortOrder,
  onSave,
}: {
  trigger: React.ReactNode;
  title: string;
  category?: Category;
  nextSortOrder?: number;
  onSave: (form: CategoryForm) => string | void;
}) {
  return (
    <FormDialog<CategoryForm>
      trigger={trigger}
      title={title}
      submitLabel={category ? "수정" : "등록"}
      initial={() => ({
        name: category?.name ?? "",
        slug: category?.slug ?? "",
        description: category?.description ?? "",
        sortOrder: category?.sortOrder ?? nextSortOrder ?? 1,
        active: category?.active ?? true,
      })}
      onSubmit={onSave}
    >
      {(form, patch) => (
        <>
          <Field label="카테고리명" required>
            <Input
              value={form.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="예) 유튜브"
            />
          </Field>
          <Field label="슬러그" required hint="영문 소문자·하이픈. URL과 필터에 사용됩니다.">
            <Input
              value={form.slug}
              onChange={(e) => patch({ slug: e.target.value })}
              placeholder="youtube"
              className="num"
              disabled={Boolean(category)}
            />
          </Field>
          <Field label="설명">
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="주문 화면에서 카테고리 아래에 표시되는 안내 문구입니다."
            />
          </Field>
          <Field label="노출 순서">
            <Input
              type="number"
              min={1}
              value={form.sortOrder || ""}
              onChange={(e) => patch({ sortOrder: Number(e.target.value) })}
              className="num max-w-28"
            />
          </Field>
          <ToggleField
            title="주문 화면 노출"
            description="끄면 광고주 주문 화면에서 이 카테고리와 소속 상품이 보이지 않습니다."
            control={
              <Switch checked={form.active} onCheckedChange={(v) => patch({ active: v })} />
            }
          />
        </>
      )}
    </FormDialog>
  );
}

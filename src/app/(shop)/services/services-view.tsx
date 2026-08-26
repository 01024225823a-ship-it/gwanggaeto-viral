"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PackageSearch, Search } from "lucide-react";
import { CategoryGrid, RECOMMEND_SLUG } from "@/components/customer/category-grid";
import { ProductCard } from "@/components/customer/product-card";
import { ServiceToolCard } from "@/components/customer/service-tool-card";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { activeCategories, findCategory, visibleProducts } from "@/lib/domain/selectors";
import { filterServiceTools } from "@/lib/domain/service-tools";
import { useData } from "@/lib/store/data";

export function CustomerServicesView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data } = useData();

  const categorySlug = searchParams.get("category") ?? "";
  const query = searchParams.get("q") ?? "";
  const [keyword, setKeyword] = useState(query);

  const categories = activeCategories(data);
  const products = visibleProducts(data);
  const category = categories.find((c) => c.slug === categorySlug);

  const q = query.trim().toLowerCase();
  const rows = products.filter((product) => {
    if (categorySlug === RECOMMEND_SLUG && !product.recommended) return false;
    if (category && product.categoryId !== category.id) return false;
    if (!q) return true;
    return (
      product.name.toLowerCase().includes(q) ||
      product.description.toLowerCase().includes(q) ||
      (findCategory(data, product.categoryId)?.name.toLowerCase().includes(q) ?? false)
    );
  });

  // 도구형 서비스는 상품과 같은 필터를 적용해 목록 맨 앞에 노출한다
  const tools = filterServiceTools({
    categorySlug: categorySlug && categorySlug !== RECOMMEND_SLUG ? categorySlug : undefined,
    query: query,
    recommendedOnly: categorySlug === RECOMMEND_SLUG,
    activeCategorySlugs: categories.map((c) => c.slug),
  });

  const heading = q
    ? `'${query}' 검색 결과`
    : categorySlug === RECOMMEND_SLUG
      ? "추천 서비스"
      : (category?.name ?? "전체 서비스");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next = keyword.trim();
    const params = new URLSearchParams();
    if (next) params.set("q", next);
    else if (categorySlug) params.set("category", categorySlug);
    router.push(`/services${params.toString() ? `?${params}` : ""}`);
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={submit} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="필요한 서비스를 검색해보세요."
            aria-label="서비스 검색"
            className="h-12 rounded-xl pl-11 text-[15px]"
          />
        </div>
        <Button type="submit" size="lg" className="h-12 px-5 text-[15px]">
          검색
        </Button>
      </form>

      <CategoryGrid categories={categories} activeSlug={q ? undefined : categorySlug} />

      <section>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold tracking-tight sm:text-xl">{heading}</h1>
            <p className="num mt-1 text-[13px] text-muted-foreground">
            {rows.length + tools.length}개 서비스
          </p>
          </div>
          {(category || q || categorySlug) && (
            <Button variant="outline" size="sm" onClick={() => router.push("/services")}>
              전체 서비스 보기
            </Button>
          )}
        </div>

        {category?.description && !q && (
          <p className="mt-2 rounded-xl bg-muted/50 px-4 py-3 text-[13px] text-muted-foreground">
            {category.description}
          </p>
        )}

        {rows.length === 0 && tools.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title="찾는 서비스가 없습니다"
            description="다른 검색어나 카테고리로 찾아보세요. 원하는 서비스가 없다면 문의해 주세요."
            action={
              <Button variant="outline" onClick={() => router.push("/support")}>
                문의하기
              </Button>
            }
          />
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tools.map((tool) => (
              <li key={tool.id} className="flex">
                <ServiceToolCard tool={tool} className="w-full" />
              </li>
            ))}
            {rows.map((product) => (
              <li key={product.id} className="flex">
                <ProductCard
                  product={product}
                  category={findCategory(data, product.categoryId)}
                  className="w-full"
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

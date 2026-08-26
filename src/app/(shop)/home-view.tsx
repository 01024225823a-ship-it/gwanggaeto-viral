"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, PackageSearch, Search, Truck, Wallet } from "lucide-react";
import { CategoryGrid } from "@/components/customer/category-grid";
import { CustomerStatusBadge } from "@/components/customer/customer-status-badge";
import { ProductCard } from "@/components/customer/product-card";
import { ServiceToolBanner, ServiceToolCard } from "@/components/customer/service-tool-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { activeCategories, customerOrders, findCategory, visibleProducts } from "@/lib/domain/selectors";
import { filterServiceTools } from "@/lib/domain/service-tools";
import type { Order } from "@/lib/domain/types";
import { formatDate, formatNumber, formatPoint } from "@/lib/format";
import { useData } from "@/lib/store/data";
import { useSession } from "@/lib/store/session";

export function CustomerHomeView() {
  const router = useRouter();
  const { account } = useSession();
  const { data } = useData();
  const [keyword, setKeyword] = useState("");

  const categories = activeCategories(data);
  const products = visibleProducts(data);
  const recommended = products.filter((p) => p.recommended).slice(0, 7);
  // 도구형 서비스(AI 블로그 콘텐츠 제작)는 추천 목록 맨 앞에 함께 노출한다
  const tools = filterServiceTools({
    recommendedOnly: true,
    activeCategorySlugs: categories.map((c) => c.slug),
  });

  // 개인화 영역(진행중 주문·보유 포인트)은 로그인한 광고주에게만 보여준다
  const customerId = account?.role === "CUSTOMER" ? account.customerId : undefined;
  const customer = data.customers.find((c) => c.id === customerId);

  const activeOrders = customerOrders(data, customerId)
    .filter((o) => o.status !== "COMPLETED" && o.status !== "CANCELED")
    .slice(0, 3);

  function search(e: React.FormEvent) {
    e.preventDefault();
    const q = keyword.trim();
    router.push(q ? `/services?q=${encodeURIComponent(q)}` : "/services");
  }

  return (
    <div className="flex flex-col gap-10">
      {/* 히어로 + 검색 */}
      <section className="rounded-3xl bg-accent/50 px-5 py-9 text-center sm:px-10 sm:py-12">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          마케팅 서비스를 쉽고 빠르게 주문하세요
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          유튜브부터 블로그·카페·언론보도까지, 필요한 서비스를 골라 바로 주문할 수 있습니다.
        </p>

        <form onSubmit={search} className="mx-auto mt-6 flex max-w-xl items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="필요한 서비스를 검색해보세요."
              aria-label="서비스 검색"
              className="h-12 rounded-xl bg-surface pl-11 text-[15px]"
            />
          </div>
          <Button type="submit" size="lg" className="h-12 px-5 text-[15px]">
            검색
          </Button>
        </form>
      </section>

      {/* 카테고리 */}
      <section>
        <SectionTitle title="어떤 서비스가 필요하세요?" />
        <CategoryGrid categories={categories} className="mt-4" />
      </section>

      {/* 도구형 서비스 안내 */}
      {tools.map((tool) => (
        <ServiceToolBanner key={tool.id} tool={tool} />
      ))}

      {/* 진행중인 주문 */}
      {activeOrders.length > 0 && (
        <section>
          <SectionTitle
            title="진행중인 주문"
            action={<MoreLink href="/orders" label="주문내역 전체보기" />}
          />
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeOrders.map((order) => (
              <li key={order.orderNo}>
                <ActiveOrderCard order={order} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 추천 서비스 */}
      <section>
        <SectionTitle
          title="추천 서비스"
          description="가장 많이 주문하는 인기 서비스입니다."
          action={<MoreLink href="/services" label="전체 서비스 보기" />}
        />
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tools.map((tool) => (
            <li key={tool.id} className="flex">
              <ServiceToolCard tool={tool} className="w-full" />
            </li>
          ))}
          {recommended.map((product) => (
            <li key={product.id} className="flex">
              <ProductCard
                product={product}
                category={findCategory(data, product.categoryId)}
                className="w-full"
              />
            </li>
          ))}
        </ul>
      </section>

      {/* 이용 방법 */}
      <section className="rounded-3xl border border-border p-6 sm:p-8">
        <SectionTitle title="이렇게 진행됩니다" />
        <ol className="mt-5 grid gap-4 sm:grid-cols-3">
          <HowStep
            n={1}
            icon={PackageSearch}
            title="서비스 선택"
            description="원하는 카테고리에서 서비스를 고르고 수량을 정합니다."
          />
          <HowStep
            n={2}
            icon={Wallet}
            title="포인트로 주문"
            description="충전한 포인트로 간편하게 결제하면 주문이 접수됩니다."
          />
          <HowStep
            n={3}
            icon={Truck}
            title="진행 확인"
            description="작업 진행 상황과 완료된 결과를 주문내역에서 확인합니다."
          />
        </ol>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Button asChild>
            <Link href="/services">
              서비스 둘러보기
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/guide">이용안내 자세히 보기</Link>
          </Button>
          {customer && (
            <span className="num ml-auto text-[13px] text-muted-foreground">
              보유 포인트 <span className="font-semibold text-primary">{formatPoint(customer.point)}</span>
            </span>
          )}
        </div>
      </section>
    </div>
  );
}

function SectionTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 className="text-lg font-bold tracking-tight sm:text-xl">{title}</h2>
        {description && <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function MoreLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-[13px] font-medium text-muted-foreground hover:text-primary"
    >
      {label}
      <ArrowRight className="size-3.5" />
    </Link>
  );
}

function ActiveOrderCard({ order }: { order: Order }) {
  return (
    <Link
      href={`/orders/${order.orderNo}`}
      className="flex h-full flex-col gap-2.5 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-primary/40 hover:bg-accent/30"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="num text-[11px] text-muted-foreground">{order.orderNo}</span>
        <CustomerStatusBadge status={order.status} />
      </div>
      <p className="line-clamp-1 font-semibold">{order.productName}</p>
      <p className="num mt-auto text-[13px] text-muted-foreground">
        {formatNumber(order.qty)} · {formatPoint(order.amount)} · {formatDate(order.createdAt)}
      </p>
    </Link>
  );
}

function HowStep({
  n,
  icon: Icon,
  title,
  description,
}: {
  n: number;
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <li className="flex gap-3">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[15px] font-semibold">
          <span className="num mr-1.5 text-primary">0{n}</span>
          {title}
        </p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </li>
  );
}

"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LoginRequiredDialog } from "@/components/auth/login-required-dialog";
import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON } from "@/config/category-icons";
import type { Category, Product } from "@/lib/domain/types";
import { formatNumber, formatWon } from "@/lib/format";
import { useSession } from "@/lib/store/session";
import { cn } from "@/lib/utils";

const actionClass =
  "relative z-10 inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-[13px] font-semibold text-primary-foreground transition-transform group-hover:translate-x-0.5";

/**
 * 서비스 상품 카드 — 쇼핑몰 상품 목록 스타일.
 *
 * 카드 전체는 누구나 볼 수 있는 상품 화면으로 이동하고,
 * "주문하기"는 로그인한 광고주만 진행할 수 있다. (비로그인은 로그인 안내 모달)
 */
export function ProductCard({
  product,
  category,
  className,
}: {
  product: Product;
  category?: Category;
  className?: string;
}) {
  const { account } = useSession();
  const Icon = CATEGORY_ICONS[category?.slug ?? ""] ?? DEFAULT_CATEGORY_ICON;
  const href = `/order/${product.id}`;
  const canOrder = account?.role === "CUSTOMER";

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_8px_24px_-12px_rgb(16_24_40/0.18)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Icon className="size-5" />
        </span>
        {product.recommended && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
            인기
          </span>
        )}
      </div>

      <div className="min-w-0">
        {category && (
          <p className="text-[11px] font-medium text-muted-foreground">{category.name}</p>
        )}
        {/* 카드 전체를 덮는 링크 — 상품 화면은 비로그인도 열람할 수 있다 */}
        <Link
          href={href}
          className="mt-0.5 line-clamp-1 block text-[15px] font-semibold after:absolute after:inset-0 after:rounded-2xl after:content-['']"
        >
          {product.name}
        </Link>
        <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
          {product.description}
        </p>
      </div>

      <div className="mt-auto flex items-end justify-between gap-2 pt-2">
        <div>
          <p className="num text-lg font-bold tracking-tight">
            {formatWon(product.price)}
            <span className="ml-0.5 text-[13px] font-medium text-muted-foreground">
              / {product.unitLabel}
            </span>
          </p>
          <p className="num mt-0.5 text-[11px] text-muted-foreground">
            최소 {formatNumber(product.minQty)}
            {product.unitLabel}부터
          </p>
        </div>

        {canOrder ? (
          <Link href={href} className={actionClass}>
            주문하기
            <ArrowRight className="size-3.5" />
          </Link>
        ) : (
          <LoginRequiredDialog
            redirectTo={href}
            trigger={
              <button type="button" className={actionClass}>
                주문하기
                <ArrowRight className="size-3.5" />
              </button>
            }
          />
        )}
      </div>
    </div>
  );
}

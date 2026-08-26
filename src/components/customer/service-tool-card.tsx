import Link from "next/link";
import { ArrowRight, Sparkles, WandSparkles } from "lucide-react";
import type { ServiceTool } from "@/lib/domain/service-tools";
import { cn } from "@/lib/utils";

/**
 * 도구형 서비스 카드 — 상품 카드(ProductCard)와 같은 자리에 나란히 놓인다.
 *
 * 상품과 달리 단가·최소수량이 없고, 주문이 아니라 전용 화면으로 바로 들어간다.
 * 비로그인 사용자도 화면을 둘러볼 수 있으므로 로그인 모달을 두지 않는다.
 * (실제 생성 실행 시점에 전용 화면에서 로그인을 요구한다)
 */
export function ServiceToolCard({ tool, className }: { tool: ServiceTool; className?: string }) {
  return (
    <div
      className={cn(
        "group relative flex flex-col gap-3 rounded-2xl border border-primary/25 bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[0_8px_24px_-12px_rgb(16_24_40/0.18)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <WandSparkles className="size-5" />
        </span>
        {tool.badge && (
          <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
            {tool.badge}
          </span>
        )}
      </div>

      <div className="min-w-0">
        <p className="text-[11px] font-medium text-primary">바로 사용하는 도구</p>
        <Link
          href={tool.href}
          className="mt-0.5 line-clamp-1 block text-[15px] font-semibold after:absolute after:inset-0 after:rounded-2xl after:content-['']"
        >
          {tool.name}
        </Link>
        <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
          {tool.description}
        </p>
      </div>

      <div className="mt-auto flex items-end justify-between gap-2 pt-2">
        <ul className="flex flex-wrap gap-1">
          {tool.highlights.map((item) => (
            <li
              key={item}
              className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
            >
              {item}
            </li>
          ))}
        </ul>
        <Link
          href={tool.href}
          className="relative z-10 inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-2 text-[13px] font-semibold text-primary-foreground transition-transform group-hover:translate-x-0.5"
        >
          {tool.cta}
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}

/** 메인 상단 홍보 배너 — 도구형 서비스를 눈에 띄게 안내한다 */
export function ServiceToolBanner({ tool, className }: { tool: ServiceTool; className?: string }) {
  return (
    <section
      className={cn(
        "flex flex-col gap-4 rounded-3xl border border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-center sm:p-7",
        className,
      )}
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
        <Sparkles className="size-6" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {tool.badge && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
              {tool.badge}
            </span>
          )}
          <h2 className="text-lg font-bold tracking-tight sm:text-xl">{tool.name}</h2>
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground sm:text-[15px]">
          {tool.description}
        </p>
      </div>
      <Link
        href={tool.href}
        className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-5 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {tool.cta}
        <ArrowRight className="size-4" />
      </Link>
    </section>
  );
}

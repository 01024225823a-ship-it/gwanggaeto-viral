import Link from "next/link";
import { cn } from "@/lib/utils";
import { BRAND } from "@/config/brand";

/**
 * 로고 — 브랜드 교체 시 이 컴포넌트와 config/brand.ts 만 수정하면 된다.
 * (심볼 자리를 <Image src="/logo.svg" /> 로 바꾸면 이미지 로고로 전환 가능)
 */
export function Logo({
  href = "/",
  size = "md",
  showTagline = false,
  tone = "default",
  className,
}: {
  href?: string;
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  /** invert — 어두운 배경 위에서 사용 */
  tone?: "default" | "invert";
  className?: string;
}) {
  const symbolSize = {
    sm: "size-7 text-[11px]",
    md: "size-8 text-xs",
    lg: "size-11 text-base",
  }[size];

  const nameSize = {
    sm: "text-sm",
    md: "text-[15px]",
    lg: "text-xl",
  }[size];

  const content = (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md font-bold tracking-tight",
          tone === "invert"
            ? "bg-white text-slate-900"
            : "bg-primary text-primary-foreground",
          symbolSize,
        )}
        aria-hidden
      >
        {BRAND.symbol}
      </span>
      <span className="flex flex-col leading-tight">
        <span
          className={cn(
            "font-semibold tracking-tight",
            tone === "invert" ? "text-white" : "text-foreground",
            nameSize,
          )}
        >
          {BRAND.name}
        </span>
        {showTagline && (
          <span
            className={cn(
              "text-[11px]",
              tone === "invert" ? "text-slate-300" : "text-muted-foreground",
            )}
          >
            {BRAND.tagline}
          </span>
        )}
      </span>
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} className="inline-flex rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
      {content}
    </Link>
  );
}

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type StatTone = "default" | "primary" | "amber" | "sky" | "emerald";

const toneClass: Record<StatTone, string> = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  amber: "bg-amber-50 text-amber-600",
  sky: "bg-sky-50 text-sky-600",
  emerald: "bg-emerald-50 text-emerald-600",
};

/** 대시보드 상단 지표 카드 */
export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "default",
  href,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: LucideIcon;
  tone?: StatTone;
  href?: string;
}) {
  const body = (
    <CardContent className="flex items-center gap-3.5">
      {Icon && (
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            toneClass[tone],
          )}
        >
          <Icon className="size-5" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-muted-foreground">{label}</p>
        <p className="num mt-0.5 truncate text-xl font-semibold tracking-tight">{value}</p>
        {sub && <p className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</p>}
      </div>
      {href && <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
    </CardContent>
  );

  if (href) {
    return (
      <Card className="transition-colors hover:bg-muted/40">
        <Link href={href}>{body}</Link>
      </Card>
    );
  }
  return <Card>{body}</Card>;
}

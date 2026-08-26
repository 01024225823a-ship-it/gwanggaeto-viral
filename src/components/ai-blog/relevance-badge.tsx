"use client";

import { CircleCheck, TriangleAlert } from "lucide-react";
import type { RelevanceReport } from "@/lib/ai-blog/types";
import { cn } from "@/lib/utils";

/**
 * 주제 반영도 표시.
 *
 * 생성된 원고가 입력한 주제를 실제로 다루고 있는지 보여준다.
 * 기준에 못 미치면 무엇이 문제인지 함께 알려 다시 생성하거나 직접 고칠 수 있게 한다.
 */
export function RelevanceBadge({
  report,
  className,
}: {
  report: RelevanceReport;
  className?: string;
}) {
  const Icon = report.ok ? CircleCheck : TriangleAlert;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        report.ok ? "bg-primary/10 text-primary" : "bg-amber-100 text-amber-800",
        className,
      )}
      title={
        report.matchedTerms.length > 0
          ? `반영된 표현: ${report.matchedTerms.join(", ")}`
          : "주제 표현을 찾지 못했습니다."
      }
    >
      <Icon className="size-3" />
      주제 반영도 <span className="num">{report.score}</span>
    </span>
  );
}

/** 기준에 못 미칠 때만 보여주는 경고 박스 */
export function RelevanceWarning({
  report,
  onRegenerate,
  className,
}: {
  report: RelevanceReport;
  onRegenerate?: () => void;
  className?: string;
}) {
  if (report.ok || report.issues.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl bg-amber-50 px-4 py-3 text-[13px] text-amber-900 ring-1 ring-amber-200",
        className,
      )}
    >
      <p className="flex items-center gap-1.5 font-semibold">
        <TriangleAlert className="size-4 text-amber-600" />
        입력한 주제가 원고에 충분히 반영되지 않았습니다
      </p>
      <ul className="flex flex-col gap-1 pl-5">
        {report.issues.map((issue) => (
          <li key={issue.code + issue.message} className="list-disc leading-relaxed">
            {issue.message}
          </li>
        ))}
      </ul>
      {onRegenerate && (
        <button
          type="button"
          onClick={onRegenerate}
          className="w-fit rounded-lg bg-amber-600 px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-amber-700"
        >
          다시 생성하기
        </button>
      )}
    </div>
  );
}

/** 추가 요청사항이 어떻게 해석되어 반영됐는지 */
export function ConstraintChips({ labels, className }: { labels: string[]; className?: string }) {
  if (labels.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <span className="text-[11px] text-muted-foreground">반영된 요청</span>
      {labels.map((label) => (
        <span
          key={label}
          className="rounded-md bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground"
        >
          {label}
        </span>
      ))}
    </div>
  );
}

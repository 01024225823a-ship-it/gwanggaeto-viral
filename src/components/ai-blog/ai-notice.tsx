import { Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * AI 생성 콘텐츠 안내.
 * 법률·의료·금융처럼 사실 확인이 중요한 분야에서는 강조 표시로 보여준다.
 */
export function AiFactCheckNotice({
  strong = false,
  className,
}: {
  strong?: boolean;
  className?: string;
}) {
  const Icon = strong ? TriangleAlert : Info;

  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-xl px-4 py-3 text-[13px] leading-relaxed",
        strong
          ? "bg-amber-50 text-amber-900 ring-1 ring-amber-200"
          : "bg-muted/60 text-muted-foreground",
        className,
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", strong ? "text-amber-600" : "text-primary")} />
      <span>
        AI가 생성한 콘텐츠는 참고용이며, 법률·의료·금융 등 전문 분야는 발행 전 사실 확인을
        권장합니다.
        {strong && " 선택하신 분야는 사실관계에 따라 결론이 달라질 수 있으니 원문·전문가 확인을 거쳐 주세요."}
      </span>
    </p>
  );
}

/** 실제 AI API가 아직 연결되지 않았음을 알리는 배지 */
export function AiDemoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground",
        className,
      )}
      title="실제 AI API 연결 전 데모 동작입니다."
    >
      데모 생성
    </span>
  );
}

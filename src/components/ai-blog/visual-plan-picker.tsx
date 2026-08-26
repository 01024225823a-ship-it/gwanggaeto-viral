"use client";

import { ArrowRight, Check, Images, Lightbulb, LoaderCircle, RefreshCw, TriangleAlert } from "lucide-react";
import { AiDemoBadge } from "@/components/ai-blog/ai-notice";
import { Button } from "@/components/ui/button";
import { AI_BLOG_IMAGE_TYPES, imageTypeLabel, visualTypeLabel } from "@/lib/ai-blog/options";
import type {
  AiBlogImageType,
  VisualOverlapReport,
  VisualPlan,
  VisualPlanSet,
} from "@/lib/ai-blog/types";
import { cn } from "@/lib/utils";

/**
 * STEP 4-1 — AI가 만든 이미지 콘텐츠 기획안 선택.
 *
 * 이미지에 들어갈 내용은 여기서 고른 기획안이 그대로 결정한다.
 * 같은 원고라도 다른 기획안을 고르면 완전히 다른 이미지가 나온다.
 */

/** 기획안 카드에 미리 보여줄 내용 */
function planPreview(plan: VisualPlan): string[] {
  if (plan.type === "infographic") return plan.items.map((item) => item.title);
  if (plan.type === "cardnews") return plan.cards.slice(0, 4).map((card) => card.headline);
  return [plan.subheadline].filter(Boolean);
}

function planHeadline(plan: VisualPlan): string {
  return plan.type === "cardnews" ? (plan.cards[0]?.headline ?? plan.concept) : plan.headline;
}

function PlanCard({
  plan,
  selected,
  onSelect,
}: {
  plan: VisualPlan;
  selected: boolean;
  onSelect: () => void;
}) {
  const preview = planPreview(plan);

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex h-full flex-col gap-2 rounded-xl border p-4 text-left transition-colors",
        selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-input hover:bg-accent/50",
      )}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-bold">{plan.concept}</span>
        <span
          className={cn(
            "flex size-4 shrink-0 items-center justify-center rounded-full border",
            selected ? "border-primary bg-primary text-primary-foreground" : "border-input",
          )}
        >
          {selected && <Check className="size-2.5" />}
        </span>
      </span>

      <span className="text-[11px] leading-relaxed text-muted-foreground">{plan.goal}</span>

      <span className="mt-1 line-clamp-2 text-[13px] leading-snug font-semibold">
        {planHeadline(plan)}
      </span>

      {preview.length > 0 && (
        <span className="mt-auto flex flex-wrap gap-1 pt-1">
          {plan.type === "infographic" && (
            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
              {visualTypeLabel(plan.visualType)}
            </span>
          )}
          {preview.map((text, i) => (
            <span
              key={`${text}-${i}`}
              className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
            >
              {text}
            </span>
          ))}
        </span>
      )}
    </button>
  );
}

export function VisualPlanPicker({
  plans,
  selected,
  onSelect,
  onMoreIdeas,
  planning,
  overlap,
  demo,
  onGenerate,
  generating,
  onBack,
}: {
  plans: VisualPlanSet;
  /** 이미지 유형 → 선택된 기획안 id */
  selected: Partial<Record<AiBlogImageType, string>>;
  onSelect: (type: AiBlogImageType, planId: string) => void;
  onMoreIdeas: () => void;
  planning: boolean;
  overlap: VisualOverlapReport | null;
  demo: boolean;
  onGenerate: () => void;
  generating: boolean;
  onBack: () => void;
}) {
  const order = AI_BLOG_IMAGE_TYPES.map((t) => t.id).filter((type) => (plans[type] ?? []).length > 0);
  const ready = order.every((type) => !!selected[type]);

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2 rounded-2xl border border-primary/25 bg-primary/5 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="flex items-center gap-1.5 text-[15px] font-bold">
            <Lightbulb className="size-4 text-primary" />
            AI 추천 이미지 주제
          </h3>
          {demo && <AiDemoBadge />}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-auto bg-surface"
            disabled={planning || generating}
            onClick={onMoreIdeas}
          >
            <RefreshCw className={planning ? "size-4 animate-spin" : "size-4"} />
            다른 아이디어 추천
          </Button>
        </div>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          원고를 요약한 이미지가 아니라, 원고를 <strong className="font-semibold">보완하는</strong>{" "}
          관점으로 기획했습니다. 원하는 기획안을 고르면 그 내용으로 이미지를 만듭니다.
        </p>
      </section>

      {overlap && !overlap.ok && (
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-amber-900 ring-1 ring-amber-200">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
          일부 문구가 원고 문장과 겹칩니다. &lsquo;다른 아이디어 추천&rsquo;으로 다시 만들거나, 겹쳐도
          괜찮다면 그대로 진행하세요.
        </p>
      )}

      {order.map((type) => (
        <section key={type} className="flex flex-col gap-2.5">
          <p className="text-[13px] font-semibold text-muted-foreground">
            {imageTypeLabel(type)}
            <span className="num ml-1.5 font-normal">{(plans[type] ?? []).length}개 제안</span>
          </p>
          <div
            role="radiogroup"
            aria-label={`${imageTypeLabel(type)} 기획안`}
            className="grid gap-2 sm:grid-cols-3"
          >
            {(plans[type] ?? []).map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                selected={selected[type] === plan.id}
                onSelect={() => onSelect(type, plan.id)}
              />
            ))}
          </div>
        </section>
      ))}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-12"
          disabled={planning || generating}
          onClick={onBack}
        >
          이미지 설정으로
        </Button>
        <Button
          type="button"
          size="lg"
          className="h-12"
          disabled={!ready || planning || generating}
          onClick={onGenerate}
        >
          {generating ? <LoaderCircle className="size-4 animate-spin" /> : <Images className="size-4" />}
          {generating ? "만드는 중…" : "이 기획안으로 이미지 만들기"}
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

/** 기획 진행 중 화면 */
export function VisualPlanning() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-surface px-6 py-16">
      <LoaderCircle className="size-8 animate-spin text-primary" />
      <p className="text-[15px] font-semibold">이미지 콘텐츠를 기획하고 있어요</p>
      <p className="text-center text-[13px] leading-relaxed text-muted-foreground">
        원고를 분석해 이미지로 만들면 좋은 관점을 찾는 중입니다.
        <br />
        본문과 겹치지 않는 구성을 잡고 있어요.
      </p>
    </div>
  );
}

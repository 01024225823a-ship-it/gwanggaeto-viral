"use client";

/**
 * [LEGACY] 실사·일러스트 비주얼 파이프라인.
 *
 * AI 블로그 **기본** 이미지 제작 경로는 정보 이미지로 대체됐다.
 *   최종 원고 → InfoVisualPlan (lib/ai-blog/info-visual.ts)
 *             → SVG/Canvas (render/info-layout.ts) → PNG
 *
 * 이 모듈은 기본 경로에서 호출하지 않는다.
 * 향후 별도 "비주얼 이미지" 기능을 다시 붙일 때를 위해 삭제하지 않고 유지한다.
 */

import {
  ArrowRight,
  Check,
  Images,
  Lightbulb,
  LoaderCircle,
  MapPin,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
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
 * 유형마다 필요한 장수만큼 고른다.
 * 본문 비주얼은 위치별로 이미 정해져 나오므로 고르지 않고 목록만 확인한다.
 */

function planPreview(plan: VisualPlan): string[] {
  if (plan.type === "infographic") return plan.items.map((item) => item.title);
  if (plan.type === "cardnews") return plan.cards.slice(0, 4).map((card) => card.headline);
  if (plan.type === "article") return [plan.mood];
  return [plan.subheadline].filter(Boolean);
}

function planHeadline(plan: VisualPlan): string {
  if (plan.type === "cardnews") return plan.cards[0]?.headline ?? plan.concept;
  if (plan.type === "article") return plan.scene;
  return plan.headline;
}

function PlanCard({
  plan,
  selected,
  disabled,
  onSelect,
}: {
  plan: VisualPlan;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const preview = planPreview(plan);

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      disabled={disabled && !selected}
      onClick={onSelect}
      className={cn(
        "flex h-full flex-col gap-2 rounded-xl border p-4 text-left transition-colors",
        selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-input hover:bg-accent/50",
        disabled && !selected && "opacity-50",
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

/** 본문 비주얼 — 고르는 대신 삽입 위치를 확인한다 */
function ArticlePlanList({ plans }: { plans: VisualPlan[] }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {plans.map((plan, i) => {
        if (plan.type !== "article") return null;
        return (
          <li key={plan.id} className="flex flex-col gap-1.5 rounded-xl border border-input p-4">
            <span className="num text-[11px] font-bold text-primary">#{i + 1}</span>
            <p className="flex items-start gap-1 text-[12px] leading-relaxed text-muted-foreground">
              <MapPin className="mt-0.5 size-3 shrink-0" />
              <span className="line-clamp-2">&ldquo;{plan.afterHeading}&rdquo; 아래</span>
            </p>
            <p className="text-[13px] leading-snug font-semibold">{plan.scene}</p>
            <p className="mt-auto flex flex-wrap gap-1 pt-1">
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                {plan.mood}
              </span>
            </p>
          </li>
        );
      })}
    </ul>
  );
}

export function VisualPlanPicker({
  plans,
  selected,
  requiredCounts,
  onToggle,
  onMoreIdeas,
  planning,
  overlap,
  demo,
  onGenerate,
  generating,
  onBack,
}: {
  plans: VisualPlanSet;
  /** 이미지 유형 → 선택된 기획안 id 목록 */
  selected: Partial<Record<AiBlogImageType, string[]>>;
  /** 유형별로 골라야 하는 개수 */
  requiredCounts: Partial<Record<AiBlogImageType, number>>;
  onToggle: (type: AiBlogImageType, planId: string) => void;
  onMoreIdeas: () => void;
  planning: boolean;
  overlap: VisualOverlapReport | null;
  demo: boolean;
  onGenerate: () => void;
  generating: boolean;
  onBack: () => void;
}) {
  const order = AI_BLOG_IMAGE_TYPES.map((t) => t.id).filter(
    (type) => (plans[type] ?? []).length > 0,
  );

  const ready = order.every((type) => {
    if (type === "article") return true;
    const need = requiredCounts[type] ?? 0;
    return need === 0 || (selected[type]?.length ?? 0) === need;
  });

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
          관점으로 기획했습니다. 유형마다 필요한 장수만큼 골라 주세요.
        </p>
      </section>

      {overlap && !overlap.ok && (
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-amber-900 ring-1 ring-amber-200">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
          일부 문구가 원고 문장과 겹칩니다. &lsquo;다른 아이디어 추천&rsquo;으로 다시 만들거나, 겹쳐도
          괜찮다면 그대로 진행하세요.
        </p>
      )}

      {order.map((type) => {
        const rows = plans[type] ?? [];
        const need = requiredCounts[type] ?? 0;
        const chosen = selected[type] ?? [];

        return (
          <section key={type} className="flex flex-col gap-2.5">
            <p className="text-[13px] font-semibold text-muted-foreground">
              {imageTypeLabel(type)}
              {type === "article" ? (
                <span className="num ml-1.5 font-normal">{rows.length}장 · 위치 자동 배치</span>
              ) : (
                <span className="num ml-1.5 font-normal">
                  {chosen.length} / {need}개 선택 · {rows.length}개 제안
                </span>
              )}
            </p>

            {type === "article" ? (
              <ArticlePlanList plans={rows} />
            ) : (
              <div className="grid gap-2 sm:grid-cols-3">
                {rows.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    selected={chosen.includes(plan.id)}
                    disabled={chosen.length >= need}
                    onSelect={() => onToggle(type, plan.id)}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}

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
          {generating ? "디자인 기획 중…" : "이 기획안으로 디자인 받기"}
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

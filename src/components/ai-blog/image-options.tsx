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

import { ArrowRight, Info, LoaderCircle, Minus, Plus, Sparkles, Wand2 } from "lucide-react";
import { OptionCards } from "@/components/ai-blog/option-cards";
import { Field } from "@/components/common/field";
import { Button } from "@/components/ui/button";
import { AI_BLOG_IMAGE_STYLES, AI_BLOG_IMAGE_TYPES, imageTypeLabel } from "@/lib/ai-blog/options";
import type {
  AiBlogAspectRatio,
  AiBlogImageComposition,
  AiBlogImageStyle,
  AiBlogImageType,
  AiBlogOutline,
} from "@/lib/ai-blog/types";
import {
  COMPOSITION_LIMITS,
  COMPOSITION_TOTAL_MAX,
  RATIO_OPTIONS,
  RATIO_SIZE,
  compositionTotal,
  defaultRatio,
} from "@/lib/ai-blog/visual-design";
import { cn } from "@/lib/utils";

export interface ImageOptionValue {
  style: AiBlogImageStyle;
  composition: AiBlogImageComposition;
  ratios: Partial<Record<AiBlogImageType, AiBlogAspectRatio>>;
}

/** 구성 항목 ↔ 이미지 유형 연결 */
const COUNT_FIELDS: Array<{
  key: keyof typeof COMPOSITION_LIMITS;
  type: AiBlogImageType;
  hint: string;
}> = [
  { key: "thumbnailCount", type: "thumbnail", hint: "블로그 상단 썸네일" },
  { key: "articleVisualCount", type: "article", hint: "본문 중간 삽입용" },
  { key: "infographicCount", type: "infographic", hint: "판단 기준 정리" },
  { key: "cardNewsCount", type: "cardnews", hint: "카드 장수" },
];

/** 생성 중 화면 */
export function ImagesGenerating() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-surface px-6 py-16">
      <LoaderCircle className="size-8 animate-spin text-primary" />
      <p className="text-[15px] font-semibold">이미지를 만들고 있어요</p>
      <p className="text-center text-[13px] text-muted-foreground">
        선택하신 기획안으로 구성하는 중입니다.
      </p>
    </div>
  );
}

function Counter({
  label,
  hint,
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-input px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold">{label}</p>
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8"
          aria-label={`${label} 줄이기`}
          disabled={disabled || value <= min}
          onClick={() => onChange(value - 1)}
        >
          <Minus className="size-3.5" />
        </Button>
        <span className="num w-8 text-center text-[15px] font-bold">{value}</span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8"
          aria-label={`${label} 늘리기`}
          disabled={disabled || value >= max}
          onClick={() => onChange(value + 1)}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

/**
 * STEP 4 — 이미지 구성 설정.
 *
 * 몇 장을 만들지, 어떤 비율·스타일로 만들지만 정한다.
 * 이미지에 들어갈 내용은 다음 단계에서 AI가 기획한다.
 */
export function ImageOptions({
  outline,
  value,
  onChange,
  onRecommend,
  onPlan,
  planning,
  onBack,
}: {
  outline: AiBlogOutline;
  value: ImageOptionValue;
  onChange: (patch: Partial<ImageOptionValue>) => void;
  /** AI 자동 추천 */
  onRecommend: () => void;
  onPlan: () => void;
  planning: boolean;
  onBack: () => void;
}) {
  const { composition } = value;
  const total = compositionTotal(composition);
  const over = total > COMPOSITION_TOTAL_MAX;
  const auto = composition.mode === "auto";

  function setCount(key: keyof typeof COMPOSITION_LIMITS, next: number) {
    onChange({ composition: { ...composition, mode: "manual", [key]: next } });
  }

  const activeTypes = COUNT_FIELDS.filter((field) => composition[field.key] > 0);

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-5">
        <p className="text-[11px] font-medium text-muted-foreground">
          확정된 최종 원고 — AI가 이 원고를 분석해 이미지를 기획합니다
        </p>
        <p className="text-[15px] font-bold">{outline.title}</p>
        <p className="num text-[12px] text-muted-foreground">
          공백 제외 {outline.charCount}자 · 소제목 {outline.headings.length}개
        </p>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[15px] font-bold">이미지 구성</h3>
          <span
            className={cn(
              "num rounded-md px-2 py-0.5 text-[12px] font-semibold",
              over ? "bg-destructive/10 text-destructive" : "bg-accent text-accent-foreground",
            )}
          >
            총 {total}장
          </span>
          <Button
            type="button"
            variant={auto ? "default" : "outline"}
            size="sm"
            className="ml-auto"
            disabled={planning}
            onClick={onRecommend}
          >
            <Wand2 className="size-4" />
            AI 자동 추천
          </Button>
        </div>

        <p className="text-[12px] leading-relaxed text-muted-foreground">
          {auto
            ? "원고 분량과 구조에 맞춰 추천한 구성입니다. 아래에서 직접 바꿀 수 있습니다."
            : "직접 설정한 구성입니다. 'AI 자동 추천'을 누르면 원고에 맞게 다시 계산합니다."}
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          {COUNT_FIELDS.map((field) => (
            <Counter
              key={field.key}
              label={imageTypeLabel(field.type)}
              hint={field.hint}
              value={composition[field.key]}
              min={COMPOSITION_LIMITS[field.key].min}
              max={COMPOSITION_LIMITS[field.key].max}
              disabled={planning}
              onChange={(next) => setCount(field.key, next)}
            />
          ))}
        </div>

        {over && (
          <p className="text-[12px] text-destructive">
            전체 최대 {COMPOSITION_TOTAL_MAX}장까지 만들 수 있습니다. 장수를 줄여 주세요.
          </p>
        )}
      </section>

      {activeTypes.length > 0 && (
        <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <Field label="이미지 비율" hint="다운로드 파일 해상도가 함께 결정됩니다.">
            <div className="flex flex-col gap-2">
              {activeTypes.map((field) => {
                const options = RATIO_OPTIONS[field.type] ?? [];
                if (options.length <= 1) return null;
                const current = value.ratios[field.type] ?? defaultRatio(field.type);
                return (
                  <div key={field.type} className="flex flex-wrap items-center gap-2">
                    <span className="w-32 shrink-0 text-[13px] font-medium">
                      {imageTypeLabel(field.type)}
                    </span>
                    {options.map((ratio) => (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => onChange({ ratios: { ...value.ratios, [field.type]: ratio } })}
                        className={cn(
                          "num rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-colors",
                          current === ratio
                            ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                            : "border-input hover:bg-accent/50",
                        )}
                      >
                        {ratio}
                        <span className="ml-1 font-normal text-muted-foreground">
                          {RATIO_SIZE[ratio].width}×{RATIO_SIZE[ratio].height}
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </Field>

          <Field label="이미지 스타일" required>
            <OptionCards
              ariaLabel="이미지 스타일"
              options={AI_BLOG_IMAGE_STYLES}
              value={value.style}
              onChange={(style) => onChange({ style })}
              columns={5}
            />
          </Field>
        </section>
      )}

      <p className="flex items-start gap-2 rounded-xl bg-muted/60 px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
        다음 단계에서 AI가 원고를 분석해 이미지 기획안을 제안합니다. 실제 이미지 생성 API는 아직
        연결되어 있지 않지만, 화면에서 보이는 그대로 PNG 로 다운로드할 수 있습니다.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" size="lg" className="h-12" onClick={onBack}>
          원고 수정으로
        </Button>
        <Button
          type="button"
          size="lg"
          className="h-12"
          disabled={planning || total === 0 || over}
          onClick={onPlan}
        >
          <Sparkles className="size-4" />
          {planning ? "기획하는 중…" : "AI 이미지 기획"}
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export { AI_BLOG_IMAGE_TYPES };

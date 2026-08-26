"use client";

import { ArrowRight, Info, LoaderCircle, Sparkles } from "lucide-react";
import { MultiOptionCards, OptionCards } from "@/components/ai-blog/option-cards";
import { Field } from "@/components/common/field";
import { Button } from "@/components/ui/button";
import {
  AI_BLOG_CARD_COUNTS,
  AI_BLOG_IMAGE_STYLES,
  AI_BLOG_IMAGE_TYPES,
  AI_BLOG_THUMBNAIL_RATIOS,
} from "@/lib/ai-blog/options";
import type {
  AiBlogAspectRatio,
  AiBlogImageStyle,
  AiBlogImageType,
  AiBlogOutline,
} from "@/lib/ai-blog/types";
import { cn } from "@/lib/utils";

export interface ImageOptionValue {
  types: AiBlogImageType[];
  style: AiBlogImageStyle;
  cardCount: number;
  thumbnailRatio: AiBlogAspectRatio;
}

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

/**
 * STEP 4 — 포스팅 이미지 제작 옵션.
 *
 * 여기서는 "무엇을 만들지"만 고른다. 이미지에 들어갈 내용은 다음 단계에서
 * AI가 원고를 분석해 기획한 뒤 사용자가 고른다.
 */
export function ImageOptions({
  outline,
  value,
  onChange,
  onPlan,
  planning,
  onBack,
}: {
  outline: AiBlogOutline;
  value: ImageOptionValue;
  onChange: (patch: Partial<ImageOptionValue>) => void;
  /** 이미지 콘텐츠 기획 요청 */
  onPlan: () => void;
  planning: boolean;
  onBack: () => void;
}) {
  function toggleType(type: AiBlogImageType) {
    onChange({
      types: value.types.includes(type)
        ? value.types.filter((t) => t !== type)
        : [...value.types, type],
    });
  }

  const typeOptions = AI_BLOG_IMAGE_TYPES.map((option) => ({
    id: option.id,
    label: option.label,
    description: option.description,
    detail: [option.ratioLabel, ...option.composition],
  }));

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-5">
        <p className="text-[11px] font-medium text-muted-foreground">
          확정된 최종 원고 — AI가 이 원고를 분석해 이미지를 기획합니다
        </p>
        <p className="text-[15px] font-bold">{outline.title}</p>
        <ul className="mt-1 flex flex-wrap gap-1.5">
          {outline.summary.slice(0, 4).map((point) => (
            <li
              key={point}
              className="rounded-lg bg-muted px-2 py-1 text-[12px] text-muted-foreground"
            >
              {point}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <Field label="만들 이미지" required hint="여러 개를 함께 만들 수 있어요.">
          <MultiOptionCards
            ariaLabel="이미지 유형"
            options={typeOptions}
            values={value.types}
            onToggle={toggleType}
            columns={3}
          />
        </Field>

        {value.types.includes("cardnews") && (
          <Field label="카드뉴스 장수">
            <div className="flex flex-wrap gap-2">
              {AI_BLOG_CARD_COUNTS.map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => onChange({ cardCount: count })}
                  className={cn(
                    "num rounded-xl border px-4 py-2.5 text-[13px] font-semibold transition-colors",
                    value.cardCount === count
                      ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                      : "border-input hover:bg-accent/50",
                  )}
                >
                  {count}장
                </button>
              ))}
            </div>
          </Field>
        )}

        {value.types.includes("thumbnail") && (
          <Field label="대표 이미지 비율">
            <div className="flex flex-wrap gap-2">
              {AI_BLOG_THUMBNAIL_RATIOS.map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => onChange({ thumbnailRatio: ratio })}
                  className={cn(
                    "num rounded-xl border px-4 py-2.5 text-[13px] font-semibold transition-colors",
                    value.thumbnailRatio === ratio
                      ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                      : "border-input hover:bg-accent/50",
                  )}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </Field>
        )}

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

      <p className="flex items-start gap-2 rounded-xl bg-muted/60 px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
        다음 단계에서 AI가 원고를 분석해 이미지 기획안을 제안합니다. 실제 이미지 생성 API는 아직
        연결되어 있지 않아, 기획안과 생성 프롬프트를 데모 미리보기로 보여줍니다.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" size="lg" className="h-12" onClick={onBack}>
          원고 수정으로
        </Button>
        <Button
          type="button"
          size="lg"
          className="h-12"
          disabled={planning || value.types.length === 0}
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

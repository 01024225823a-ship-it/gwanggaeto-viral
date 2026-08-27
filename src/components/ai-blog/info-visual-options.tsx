"use client";

import { ArrowRight, Images, Info, LoaderCircle, Minus, Plus, Sparkles } from "lucide-react";
import { OptionCards } from "@/components/ai-blog/option-cards";
import { Field } from "@/components/common/field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  INFO_COUNT_MAX,
  INFO_COUNT_MIN,
  INFO_RATIO_OPTIONS,
  INFO_THUMBNAIL_RATIOS,
  INFO_VISUAL_STYLES,
  clampInfoCount,
  infoRatioLabel,
  recommendInfoCount,
} from "@/lib/ai-blog/info-visual";
import type {
  AiBlogAspectRatio,
  AiBlogOutline,
  InfoVisualStyle,
} from "@/lib/ai-blog/types";
import { cn } from "@/lib/utils";

export interface InfoVisualOptionValue {
  style: InfoVisualStyle;
  /** 정보 이미지 장수 (대표 이미지 제외) */
  infoCount: number;
  withThumbnail: boolean;
  ratio: AiBlogAspectRatio;
  thumbnailRatio: AiBlogAspectRatio;
}

/** 기획 중 화면 */
export function InfoVisualPlanning() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-surface px-6 py-16">
      <LoaderCircle className="size-8 animate-spin text-primary" />
      <p className="text-[15px] font-semibold">원고에서 시각화할 정보를 뽑고 있어요</p>
      <p className="text-center text-[13px] text-muted-foreground">
        표 · 체크리스트 · 비교 · 순서로 만들 수 있는 정보를 고르는 중입니다.
      </p>
    </div>
  );
}

function RatioPicker({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: AiBlogAspectRatio[];
  value: AiBlogAspectRatio;
  onChange: (next: AiBlogAspectRatio) => void;
  ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap gap-1.5">
      {options.map((ratio) => {
        const selected = ratio === value;
        return (
          <button
            key={ratio}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(ratio)}
            className={cn(
              "num rounded-lg border px-2.5 py-1.5 text-[12px] transition-colors",
              selected
                ? "border-primary bg-primary/5 font-semibold text-primary"
                : "border-input text-muted-foreground hover:bg-accent/50",
            )}
          >
            {infoRatioLabel(ratio)}
          </button>
        );
      })}
    </div>
  );
}

/**
 * STEP 4 — 이미지 제작 옵션.
 *
 * 유형을 사용자가 고르지 않는다. 원고에 어떤 정보가 있는지에 따라
 * Claude 가 유형을 배분하기 때문이다. 여기서는 스타일·비율·장수만 정한다.
 */
export function InfoVisualOptions({
  outline,
  articleLength,
  value,
  onChange,
  onPlan,
  planning,
  onBack,
}: {
  outline: AiBlogOutline;
  articleLength: number;
  value: InfoVisualOptionValue;
  onChange: (patch: Partial<InfoVisualOptionValue>) => void;
  onPlan: () => void;
  planning: boolean;
  onBack: () => void;
}) {
  const recommended = recommendInfoCount(outline, articleLength);
  const total = value.infoCount + (value.withThumbnail ? 1 : 0);

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 sm:p-7">
        <div className="flex flex-col gap-1">
          <h2 className="text-[15px] font-bold">이미지 제작</h2>
          <p className="text-[13px] text-muted-foreground">
            원고를 분석해 본문에 넣을 <b>정보 카드·표·체크리스트</b>를 만듭니다. 사진이나 일러스트가
            아니라, 이미지 한 장만 봐도 도움이 되는 정보 이미지입니다.
          </p>
        </div>

        <p className="flex items-start gap-2 rounded-xl bg-accent/50 px-3 py-2.5 text-[12px] leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>
            현재 원고
            <span className="num mx-1 font-semibold text-foreground">{outline.charCount}자</span>·
            소제목 <span className="num font-semibold text-foreground">{outline.headings.length}개</span>
            기준으로 정보 이미지{" "}
            <span className="num font-semibold text-foreground">{recommended}장</span>을 추천합니다.
            시각화할 정보가 부족하면 장수를 줄이는 편이 좋습니다.
          </span>
        </p>

        <Field label="디자인 스타일" hint="정보 구조는 그대로 두고 색·여백·타이포만 달라집니다.">
          <OptionCards
            options={INFO_VISUAL_STYLES}
            value={value.style}
            onChange={(style) => onChange({ style })}
            ariaLabel="디자인 스타일"
            columns={4}
          />
        </Field>

        <Field label="이미지 장수" hint="대표 이미지 1장 + 정보 이미지로 구성합니다.">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 rounded-xl border border-input p-3">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold">정보 이미지</p>
                <p className="text-[11px] text-muted-foreground">표 · 체크리스트 · 비교 · 순서</p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-8"
                  aria-label="정보 이미지 줄이기"
                  disabled={value.infoCount <= INFO_COUNT_MIN}
                  onClick={() => onChange({ infoCount: clampInfoCount(value.infoCount - 1) })}
                >
                  <Minus className="size-3.5" />
                </Button>
                <span className="num w-8 text-center text-[15px] font-bold">{value.infoCount}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-8"
                  aria-label="정보 이미지 늘리기"
                  disabled={value.infoCount >= INFO_COUNT_MAX}
                  onClick={() => onChange({ infoCount: clampInfoCount(value.infoCount + 1) })}
                >
                  <Plus className="size-3.5" />
                </Button>
              </div>
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-input p-3">
              <Checkbox
                checked={value.withThumbnail}
                onCheckedChange={(checked) => onChange({ withThumbnail: checked === true })}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold">대표 이미지 만들기</span>
                <span className="block text-[11px] text-muted-foreground">
                  큰 제목 + 짧은 서브카피 (정보는 넣지 않습니다)
                </span>
              </span>
            </label>

            <div className="flex flex-wrap items-center gap-2 text-[12px]">
              <span className="text-muted-foreground">
                총 <span className="num font-bold text-foreground">{total}장</span>
              </span>
              {value.infoCount !== recommended && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[12px]"
                  onClick={() => onChange({ infoCount: recommended })}
                >
                  <Sparkles className="size-3.5" />
                  추천값({recommended}장)으로
                </Button>
              )}
            </div>
          </div>
        </Field>

        <Field label="정보 이미지 비율">
          <RatioPicker
            options={INFO_RATIO_OPTIONS}
            value={value.ratio}
            onChange={(ratio) => onChange({ ratio })}
            ariaLabel="정보 이미지 비율"
          />
        </Field>

        {value.withThumbnail && (
          <Field label="대표 이미지 비율">
            <RatioPicker
              options={INFO_THUMBNAIL_RATIOS}
              value={value.thumbnailRatio}
              onChange={(thumbnailRatio) => onChange({ thumbnailRatio })}
              ariaLabel="대표 이미지 비율"
            />
          </Field>
        )}
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" size="lg" className="h-12" onClick={onBack}>
          원고로 돌아가기
        </Button>
        <Button type="button" size="lg" className="h-12" disabled={planning} onClick={onPlan}>
          {planning ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Images className="size-4" />
          )}
          이미지 {total}장 만들기
          {!planning && <ArrowRight className="size-4" />}
        </Button>
      </div>
    </div>
  );
}

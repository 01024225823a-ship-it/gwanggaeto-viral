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

import { ArrowRight, LayoutTemplate, LoaderCircle, Palette, RefreshCw } from "lucide-react";
import { AiDemoBadge } from "@/components/ai-blog/ai-notice";
import { ImageMockCard } from "@/components/ai-blog/image-mock-card";
import { Button } from "@/components/ui/button";
import { designToPreviewAssets } from "@/lib/ai-blog/image-provider";
import { imageStyleLabel, imageTypeLabel } from "@/lib/ai-blog/options";
import type { VisualDesignPlan } from "@/lib/ai-blog/types";
import { layoutLabel } from "@/lib/ai-blog/visual-design";

/**
 * STEP 4-2 — AI가 만든 디자인 기획안 확인.
 *
 * 어떤 레이아웃으로, 어떤 시각 요소를 써서 만들지 미리 보여준다.
 * 마음에 들지 않으면 콘텐츠 기획은 그대로 두고 디자인만 다시 받을 수 있다.
 */

const DENSITY_LABEL: Record<VisualDesignPlan["artDirection"]["density"], string> = {
  low: "여백 넓게",
  medium: "보통",
  high: "정보 밀도 높게",
};

function DesignCard({ design }: { design: VisualDesignPlan }) {
  const previews = designToPreviewAssets(design);
  const isDeck = design.type === "cardnews";

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">
          {imageTypeLabel(design.type)}
        </span>
        <p className="text-[15px] font-bold">{design.concept}</p>
        <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
          <LayoutTemplate className="size-3" />
          {isDeck
            ? `${design.pages?.length ?? 0}장 · 장마다 다른 구성`
            : layoutLabel(design.layout)}
        </span>
      </div>

      <p className="text-[13px] leading-relaxed text-muted-foreground">{design.designGoal}</p>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl bg-muted/60 px-3 py-2">
          <dt className="text-[11px] text-muted-foreground">스타일</dt>
          <dd className="mt-0.5 truncate text-[13px] font-semibold">{imageStyleLabel(design.style)}</dd>
        </div>
        <div className="rounded-xl bg-muted/60 px-3 py-2">
          <dt className="text-[11px] text-muted-foreground">팔레트</dt>
          <dd className="mt-0.5 truncate text-[13px] font-semibold">{design.artDirection.palette}</dd>
        </div>
        <div className="rounded-xl bg-muted/60 px-3 py-2">
          <dt className="text-[11px] text-muted-foreground">정보 밀도</dt>
          <dd className="mt-0.5 truncate text-[13px] font-semibold">
            {DENSITY_LABEL[design.artDirection.density]}
          </dd>
        </div>
        <div className="num rounded-xl bg-muted/60 px-3 py-2">
          <dt className="text-[11px] text-muted-foreground">비율</dt>
          <dd className="mt-0.5 truncate text-[13px] font-semibold">{design.ratio}</dd>
        </div>
      </dl>

      {isDeck && design.pages && (
        <ol className="flex flex-wrap gap-1">
          {design.pages.map((page) => (
            <li
              key={page.page}
              className="num rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
            >
              {page.page}장 {layoutLabel(page.layout)}
            </li>
          ))}
        </ol>
      )}

      <div>
        <p className="mb-1.5 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
          <Palette className="size-3" />
          주요 시각 요소
        </p>
        <ul className="flex flex-wrap gap-1">
          {(design.pages?.[0]?.visualElements ?? design.visualElements).slice(0, 4).map((element, i) => (
            <li
              key={`${element.subject}-${i}`}
              className="rounded-md bg-accent px-2 py-0.5 text-[11px] text-accent-foreground"
            >
              {element.subject}
            </li>
          ))}
        </ul>
      </div>

      <ul
        className={
          isDeck
            ? "grid gap-3 sm:grid-cols-3 lg:grid-cols-4"
            : "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        }
      >
        {previews.map((asset) => (
          <li key={asset.id}>
            <ImageMockCard asset={asset} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function VisualDesignPreview({
  designs,
  demo,
  designing,
  generating,
  onRedesign,
  onGenerate,
  onBack,
}: {
  designs: VisualDesignPlan[];
  demo: boolean;
  designing: boolean;
  generating: boolean;
  onRedesign: () => void;
  onGenerate: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2 rounded-2xl border border-primary/25 bg-primary/5 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="flex items-center gap-1.5 text-[15px] font-bold">
            <LayoutTemplate className="size-4 text-primary" />
            AI 추천 디자인
          </h3>
          {demo && <AiDemoBadge />}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-auto bg-surface"
            disabled={designing || generating}
            onClick={onRedesign}
          >
            <RefreshCw className={designing ? "size-4 animate-spin" : "size-4"} />
            다른 디자인 추천
          </Button>
        </div>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          내용은 그대로 두고 <strong className="font-semibold">보여주는 방식</strong>만 기획했습니다.
          레이아웃과 시각 요소가 마음에 들지 않으면 디자인만 다시 받을 수 있습니다.
        </p>
      </section>

      {designs.map((design) => (
        <DesignCard key={design.id} design={design} />
      ))}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-12"
          disabled={designing || generating}
          onClick={onBack}
        >
          기획안 다시 고르기
        </Button>
        <Button
          type="button"
          size="lg"
          className="h-12"
          disabled={designing || generating || designs.length === 0}
          onClick={onGenerate}
        >
          {generating ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {generating ? "만드는 중…" : "이 디자인으로 이미지 생성"}
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

/** 디자인 기획 진행 중 화면 */
export function VisualDesigning() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-surface px-6 py-16">
      <LoaderCircle className="size-8 animate-spin text-primary" />
      <p className="text-[15px] font-semibold">디자인을 기획하고 있어요</p>
      <p className="text-center text-[13px] leading-relaxed text-muted-foreground">
        정보의 성격에 맞는 레이아웃을 고르고,
        <br />
        어떤 일러스트와 아이콘을 쓸지 정하는 중입니다.
      </p>
    </div>
  );
}

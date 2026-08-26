"use client";

import { CircleCheck, Images, Pencil, Plus, RefreshCw } from "lucide-react";
import { AiFactCheckNotice } from "@/components/ai-blog/ai-notice";
import { ArticleBody } from "@/components/ai-blog/article-body";
import { CopyButton } from "@/components/ai-blog/copy-button";
import { ImageMockCard } from "@/components/ai-blog/image-mock-card";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { draftToFullText } from "@/lib/ai-blog/article";
import { imageTypeLabel, needsFactCheck } from "@/lib/ai-blog/options";
import type { AiBlogDraft, AiBlogImageAsset, AiBlogImageType, AiBlogInput } from "@/lib/ai-blog/types";
import { cn } from "@/lib/utils";

/** 결과 화면의 이미지 노출 순서 */
const TYPE_ORDER: AiBlogImageType[] = ["thumbnail", "infographic", "cardnews"];

const GRID_CLASS: Record<AiBlogImageType, string> = {
  thumbnail: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  infographic: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  cardnews: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
};

/**
 * STEP 5 — 결과 확인.
 * 최종 원고와 만들어진 이미지를 한 화면에서 확인하고 복사·저장한다.
 */
export function AiBlogResultView({
  draft,
  input,
  assets,
  onEditArticle,
  onRemakeImages,
  onRestart,
}: {
  draft: AiBlogDraft;
  input: AiBlogInput;
  assets: AiBlogImageAsset[];
  onEditArticle: () => void;
  onRemakeImages: () => void;
  onRestart: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col items-center gap-2 rounded-2xl bg-accent/50 px-5 py-8 text-center">
        <CircleCheck className="size-9 text-primary" />
        <h2 className="text-lg font-bold tracking-tight sm:text-xl">콘텐츠 제작이 완료됐습니다</h2>
        <p className="text-[13px] text-muted-foreground">
          원고와 이미지를 확인하고 블로그에 그대로 활용해 보세요.
        </p>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[15px] font-bold">원고</h3>
          <div className="ml-auto flex items-center gap-1.5">
            <CopyButton size="sm" text={draftToFullText(draft)} toastLabel="원고를 복사했습니다." />
            <Button type="button" variant="outline" size="sm" onClick={onEditArticle}>
              <Pencil className="size-4" />
              수정
            </Button>
          </div>
        </div>
        <h2 className="text-xl leading-snug font-bold tracking-tight sm:text-2xl">{draft.title}</h2>
        <ArticleBody markdown={draft.body} />
      </section>

      <section className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[15px] font-bold">이미지</h3>
          <span className="num text-[13px] text-muted-foreground">{assets.length}장</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={onRemakeImages}
          >
            <RefreshCw className="size-4" />
            이미지 다시 만들기
          </Button>
        </div>

        {assets.length === 0 ? (
          <EmptyState
            icon={Images}
            title="아직 만든 이미지가 없습니다"
            description="이미지 제작 단계에서 원하는 유형을 골라 만들어 보세요."
            action={
              <Button type="button" onClick={onRemakeImages}>
                이미지 만들기
              </Button>
            }
          />
        ) : (
          TYPE_ORDER.map((type) => {
            const rows = assets.filter((a) => a.type === type);
            if (rows.length === 0) return null;
            return (
              <div key={type} className="flex flex-col gap-2.5">
                <p className="text-[13px] font-semibold text-muted-foreground">
                  {imageTypeLabel(type)}
                  <span className="num ml-1.5 font-normal">{rows.length}장</span>
                </p>
                <ul className={cn("grid gap-3", GRID_CLASS[type])}>
                  {rows.map((asset) => (
                    <li key={asset.id}>
                      <ImageMockCard asset={asset} />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })
        )}
      </section>

      <AiFactCheckNotice strong={needsFactCheck(input.category)} />

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" size="lg" className="h-12" onClick={onRestart}>
          <Plus className="size-4" />새 콘텐츠 만들기
        </Button>
        <CopyButton
          size="lg"
          className="h-12"
          variant="default"
          text={draftToFullText(draft)}
          label="원고 전체 복사"
          toastLabel="원고를 복사했습니다."
        />
      </div>
    </div>
  );
}

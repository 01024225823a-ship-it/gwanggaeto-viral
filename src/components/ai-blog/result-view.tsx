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

import { useState } from "react";
import {
  CircleCheck,
  Images,
  LoaderCircle,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { AiFactCheckNotice } from "@/components/ai-blog/ai-notice";
import { ArticleBody } from "@/components/ai-blog/article-body";
import { CopyButton } from "@/components/ai-blog/copy-button";
import { ImageMockCard } from "@/components/ai-blog/image-mock-card";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { draftToFullText } from "@/lib/ai-blog/article";
import { imageTypeLabel, needsFactCheck } from "@/lib/ai-blog/options";
import { downloadAssetsAsZip } from "@/lib/ai-blog/render/download";
import type { AiBlogDraft, AiBlogImageAsset, AiBlogImageType, AiBlogInput } from "@/lib/ai-blog/types";
import { cn } from "@/lib/utils";

/** 결과 화면의 이미지 노출 순서 */
const TYPE_ORDER: AiBlogImageType[] = ["thumbnail", "article", "infographic", "cardnews"];

const GRID_CLASS: Record<AiBlogImageType, string> = {
  thumbnail: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  article: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  infographic: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  cardnews: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
};

interface DownloadState {
  key: string;
  done: number;
  total: number;
}

/** 내보내는 중 진행 표시 */
function ProgressLabel({ progress, forKey }: { progress: DownloadState | null; forKey: string }) {
  if (!progress || progress.key !== forKey) return null;
  return (
    <span className="num inline-flex items-center gap-1 text-[12px] text-muted-foreground">
      <LoaderCircle className="size-3.5 animate-spin" />
      내보내는 중… {progress.done} / {progress.total}
    </span>
  );
}

/**
 * STEP 5 — 결과 확인.
 * 원고와 이미지 세트를 유형별로 묶어 보여주고, 개별·묶음·전체 다운로드를 제공한다.
 */
export function AiBlogResultView({
  draft,
  input,
  assets,
  busyAssetId,
  onEditArticle,
  onRemakeImages,
  onRestart,
  onRedesignAsset,
  onRegenerateAsset,
  onReviseAsset,
}: {
  draft: AiBlogDraft;
  input: AiBlogInput;
  assets: AiBlogImageAsset[];
  /** 재생성 중인 이미지 (해당 카드 버튼 잠금) */
  busyAssetId?: string | null;
  onEditArticle: () => void;
  onRemakeImages: () => void;
  onRestart: () => void;
  onRedesignAsset?: (asset: AiBlogImageAsset) => void;
  onRegenerateAsset?: (asset: AiBlogImageAsset) => void;
  onReviseAsset?: (asset: AiBlogImageAsset, instruction: string) => void;
}) {
  const [progress, setProgress] = useState<DownloadState | null>(null);

  const failedCount = assets.filter((a) => a.status === "FAILED").length;
  const savableCount = assets.length - failedCount;

  async function exportAssets(all: AiBlogImageAsset[], key: string, label?: string) {
    if (progress) return;

    // 생성에 실패한 이미지는 압축에 넣지 않는다
    const rows = all.filter((a) => a.status !== "FAILED");
    if (rows.length === 0) {
      toast.error("내보낼 이미지가 없습니다. 실패한 이미지를 다시 만들어 주세요.");
      return;
    }

    setProgress({ key, done: 0, total: rows.length });
    try {
      const { saved, failed } = await downloadAssetsAsZip(rows, input.topic, {
        zipLabel: label,
        onProgress: (p) => setProgress({ key, done: p.done, total: p.total }),
      });
      if (failed > 0) {
        toast.warning(`이미지 ${saved}장을 저장했습니다. ${failed}장은 만들지 못했습니다.`);
      } else {
        toast.success(`이미지 ${saved}장을 다운로드했습니다.`);
      }
    } catch {
      toast.error("압축 파일을 만드는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col items-center gap-2 rounded-2xl bg-accent/50 px-5 py-8 text-center">
        <CircleCheck className="size-9 text-primary" />
        <h2 className="text-lg font-bold tracking-tight sm:text-xl">콘텐츠 제작이 완료됐습니다</h2>
        <p className="text-[13px] text-muted-foreground">
          원고와 이미지 세트를 확인하고 블로그에 그대로 활용해 보세요.
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
          <h3 className="text-[15px] font-bold">
            이미지 <span className="num">{assets.length}</span>장
          </h3>
          <ProgressLabel progress={progress} forKey="all" />
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRemakeImages}
              disabled={!!progress}
            >
              <RefreshCw className="size-4" />
              이미지 다시 만들기
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!!progress || savableCount === 0}
              onClick={() => exportAssets(assets, "all")}
            >
              <Package className="size-4" />
              전체 이미지 다운로드
            </Button>
          </div>
        </div>

        {failedCount > 0 && (
          <p
            role="alert"
            className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-[12px] text-destructive"
          >
            <TriangleAlert className="size-4 shrink-0" />
            <span className="num">{failedCount}장</span>의 비주얼을 만들지 못했습니다. 해당 카드의
            &lsquo;다시 만들기&rsquo;를 눌러 다시 시도해 주세요. (실패한 이미지는 다운로드에
            포함되지 않습니다)
          </p>
        )}

        {assets.length === 0 ? (
          <EmptyState
            icon={Images}
            title="아직 만든 이미지가 없습니다"
            description="이미지 제작 단계에서 원하는 구성을 골라 만들어 보세요."
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
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13px] font-semibold text-muted-foreground">
                    {imageTypeLabel(type)}
                    <span className="num ml-1.5 font-normal">{rows.length}장</span>
                  </p>
                  <ProgressLabel progress={progress} forKey={type} />
                  {rows.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="ml-auto"
                      disabled={!!progress}
                      onClick={() => exportAssets(rows, type, imageTypeLabel(type))}
                    >
                      <Package className="size-3.5" />
                      {imageTypeLabel(type)} 전체 다운로드
                    </Button>
                  )}
                </div>

                <ul className={cn("grid gap-4", GRID_CLASS[type])}>
                  {rows.map((asset, i) => (
                    <li key={asset.id}>
                      {type === "article" && (
                        <p className="mb-1 text-[11px] font-semibold text-muted-foreground">#{i + 1}</p>
                      )}
                      <ImageMockCard
                        asset={asset}
                        topic={input.topic}
                        order={type === "thumbnail" ? undefined : i + 1}
                        busy={busyAssetId === asset.id}
                        onRedesign={onRedesignAsset ? () => onRedesignAsset(asset) : undefined}
                        onRegenerate={onRegenerateAsset ? () => onRegenerateAsset(asset) : undefined}
                        onRevise={
                          onReviseAsset
                            ? (instruction) => onReviseAsset(asset, instruction)
                            : undefined
                        }
                      />
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

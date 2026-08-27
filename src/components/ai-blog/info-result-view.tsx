"use client";

import { useState } from "react";
import { CircleCheck, Images, LoaderCircle, Package, Pencil, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AiFactCheckNotice } from "@/components/ai-blog/ai-notice";
import { ArticleBody } from "@/components/ai-blog/article-body";
import { CopyButton } from "@/components/ai-blog/copy-button";
import { InfoImageCard } from "@/components/ai-blog/info-image-card";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { draftToFullText } from "@/lib/ai-blog/article";
import { needsFactCheck } from "@/lib/ai-blog/options";
import { downloadInfoImagesAsZip } from "@/lib/ai-blog/render/info-download";
import type { AiBlogDraft, AiBlogInput, InfoVisualImage } from "@/lib/ai-blog/types";

interface DownloadState {
  done: number;
  total: number;
}

/**
 * STEP 5 — 결과 확인.
 *
 * 이미지는 "대표 이미지 / 정보 이미지" 두 그룹으로만 나눈다.
 * (본문 비주얼·인포그래픽·카드뉴스 구분은 기본 화면에서 쓰지 않는다)
 */
export function InfoResultView({
  draft,
  input,
  images,
  busyImageId,
  onEditArticle,
  onRemakeImages,
  onRestart,
  onRestyle,
  onRegenerate,
  onRevise,
}: {
  draft: AiBlogDraft;
  input: AiBlogInput;
  images: InfoVisualImage[];
  /** 다시 만드는 중인 이미지 (해당 카드 잠금) */
  busyImageId?: string | null;
  onEditArticle: () => void;
  onRemakeImages: () => void;
  onRestart: () => void;
  onRestyle?: (image: InfoVisualImage) => void;
  onRegenerate?: (image: InfoVisualImage) => void;
  onRevise?: (image: InfoVisualImage, instruction: string) => void;
}) {
  const [progress, setProgress] = useState<DownloadState | null>(null);

  const thumbnails = images.filter((image) => image.plan.type === "thumbnail");
  const infos = images.filter((image) => image.plan.type !== "thumbnail");

  async function exportAll() {
    if (progress || images.length === 0) return;

    setProgress({ done: 0, total: images.length });
    try {
      const { saved, failed } = await downloadInfoImagesAsZip(images, input.topic, {
        onProgress: setProgress,
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

  /** ZIP 순번과 화면 순번을 맞추기 위해 전체 목록에서의 위치를 쓴다 */
  function cardFor(image: InfoVisualImage) {
    return (
      <InfoImageCard
        image={image}
        topic={input.topic}
        index={images.indexOf(image)}
        busy={busyImageId === image.id}
        onRestyle={onRestyle ? () => onRestyle(image) : undefined}
        onRegenerate={onRegenerate ? () => onRegenerate(image) : undefined}
        onRevise={onRevise ? (instruction) => onRevise(image, instruction) : undefined}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col items-center gap-2 rounded-2xl bg-accent/50 px-5 py-8 text-center">
        <CircleCheck className="size-9 text-primary" />
        <h2 className="text-lg font-bold tracking-tight sm:text-xl">콘텐츠 제작이 완료됐습니다</h2>
        <p className="text-[13px] text-muted-foreground">
          원고와 정보 이미지를 확인하고 블로그에 그대로 활용해 보세요.
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
            이미지 <span className="num">{images.length}</span>장
          </h3>
          {progress && (
            <span className="num inline-flex items-center gap-1 text-[12px] text-muted-foreground">
              <LoaderCircle className="size-3.5 animate-spin" />
              내보내는 중… {progress.done} / {progress.total}
            </span>
          )}
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!!progress}
              onClick={onRemakeImages}
            >
              <RefreshCw className="size-4" />
              이미지 다시 만들기
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!!progress || images.length === 0}
              onClick={exportAll}
            >
              <Package className="size-4" />
              전체 이미지 다운로드
            </Button>
          </div>
        </div>

        {images.length === 0 ? (
          <EmptyState
            icon={Images}
            title="아직 만든 이미지가 없습니다"
            description="이미지 제작 단계에서 스타일과 장수를 골라 만들어 보세요."
            action={
              <Button type="button" onClick={onRemakeImages}>
                이미지 만들기
              </Button>
            }
          />
        ) : (
          <>
            {thumbnails.length > 0 && (
              <div className="flex flex-col gap-2.5">
                <p className="text-[13px] font-semibold text-muted-foreground">대표 이미지</p>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {thumbnails.map((image) => (
                    <li key={image.id}>{cardFor(image)}</li>
                  ))}
                </ul>
              </div>
            )}

            {infos.length > 0 && (
              <div className="flex flex-col gap-2.5">
                <p className="text-[13px] font-semibold text-muted-foreground">
                  정보 이미지
                  <span className="num ml-1.5 font-normal">{infos.length}장</span>
                </p>
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {infos.map((image) => (
                    <li key={image.id}>{cardFor(image)}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
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

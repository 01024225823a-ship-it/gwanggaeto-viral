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
  ChevronDown,
  Download,
  LoaderCircle,
  Palette,
  RefreshCw,
  TriangleAlert,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { SceneSvg } from "@/components/ai-blog/scene-svg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { imageTypeLabel } from "@/lib/ai-blog/options";
import { downloadAsset } from "@/lib/ai-blog/render/download";
import { buildScene } from "@/lib/ai-blog/render/layout";
import type { AiBlogImageAsset } from "@/lib/ai-blog/types";
import { layoutLabel } from "@/lib/ai-blog/visual-design";
import { cn } from "@/lib/utils";

/**
 * 이미지 카드.
 *
 * 미리보기는 SVG, 다운로드는 같은 장면을 캔버스에 그린 PNG다.
 * 두 경로가 같은 장면 데이터를 쓰므로 화면과 저장 파일이 어긋나지 않는다.
 */
export function ImageMockCard({
  asset,
  topic,
  order,
  onRedesign,
  onRegenerate,
  onRevise,
  busy = false,
  className,
}: {
  asset: AiBlogImageAsset;
  /** 파일명에 쓸 포스팅 주제 */
  topic?: string;
  /** 파일명 순번 */
  order?: number;
  /** 같은 콘텐츠 기획 유지 + 디자인만 다시 */
  onRedesign?: () => void;
  /** 같은 기획·디자인으로 이미지만 다시 */
  onRegenerate?: () => void;
  /** 이 이미지 하나에만 적용할 수정 요청 */
  onRevise?: (instruction: string) => void;
  busy?: boolean;
  className?: string;
}) {
  const [openPrompt, setOpenPrompt] = useState(false);
  const [openRevise, setOpenRevise] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [saving, setSaving] = useState(false);

  // 실제 이미지 생성이 실패한 경우 — placeholder 를 그리지 않고 오류 상태를 보여준다
  const failed = asset.status === "FAILED";
  const scene = failed ? null : buildScene(asset);

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      await downloadAsset(asset, topic ?? "AI블로그", order);
      toast.success("이미지를 저장했습니다.");
    } catch {
      toast.error(
        "이미지를 저장하는 중 문제가 발생했습니다. 해당 이미지를 다시 생성한 뒤 시도해주세요.",
      );
    } finally {
      setSaving(false);
    }
  }

  function applyRevision() {
    const value = instruction.trim();
    if (!value || !onRevise) return;
    onRevise(value);
    setInstruction("");
    setOpenRevise(false);
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {scene ? (
        <div className="overflow-hidden rounded-2xl ring-1 ring-border">
          <SceneSvg scene={scene} />
        </div>
      ) : (
        <div
          role="alert"
          className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-destructive/40 bg-destructive/5 px-4 text-center"
        >
          <TriangleAlert className="size-6 text-destructive" />
          <p className="text-[13px] font-semibold text-destructive">
            비주얼 생성에 실패했습니다. 다시 만들기를 눌러주세요.
          </p>
          {asset.error && (
            <p className="text-[11px] leading-relaxed text-muted-foreground">{asset.error}</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1">
        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
          {asset.type === "cardnews"
            ? `${asset.index} / ${asset.totalPages ?? asset.index}장`
            : imageTypeLabel(asset.type)}
        </span>
        <span className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] text-accent-foreground">
          {layoutLabel(asset.layout)}
        </span>
        <span className="num rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {asset.width ?? "?"}×{asset.height ?? "?"}
        </span>
      </div>

      {asset.afterHeading && (
        <p className="rounded-lg bg-primary/5 px-2.5 py-1.5 text-[11px] leading-relaxed text-primary">
          추천 삽입 위치 · &ldquo;{asset.afterHeading}&rdquo; 아래
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          size="sm"
          className="flex-1"
          disabled={saving || failed}
          onClick={save}
        >
          {saving ? <LoaderCircle className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
          다운로드
        </Button>
        {onRedesign && (
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onRedesign}>
            <Palette className="size-3.5" />
            다른 디자인
          </Button>
        )}
        {onRegenerate && (
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onRegenerate}>
            <RefreshCw className={busy ? "size-3.5 animate-spin" : "size-3.5"} />
            다시 만들기
          </Button>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {onRevise && (
          <button
            type="button"
            aria-expanded={openRevise}
            onClick={() => setOpenRevise((prev) => !prev)}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-border px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Wand2 className="size-3.5" />
            수정 요청
          </button>
        )}
        <button
          type="button"
          aria-expanded={openPrompt}
          onClick={() => setOpenPrompt((prev) => !prev)}
          className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          프롬프트
          <ChevronDown className={cn("size-3.5 transition-transform", openPrompt && "rotate-180")} />
        </button>
      </div>

      {openRevise && onRevise && (
        <div className="flex gap-1.5">
          <Input
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyRevision();
              }
            }}
            placeholder="예: 인물을 빼고 무릎 일러스트 중심으로"
            className="h-9 text-[12px]"
          />
          <Button
            type="button"
            size="sm"
            className="h-9 shrink-0"
            disabled={busy || !instruction.trim()}
            onClick={applyRevision}
          >
            적용
          </Button>
        </div>
      )}

      {openPrompt && (
        <pre className="scrollbar-thin max-h-56 overflow-auto rounded-xl bg-muted/60 p-3 text-[11px] leading-relaxed whitespace-pre-wrap">
          {asset.prompt}
        </pre>
      )}
    </div>
  );
}

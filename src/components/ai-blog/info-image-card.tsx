"use client";

import { useState } from "react";
import { Download, LoaderCircle, Palette, RefreshCw, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { SceneSvg } from "@/components/ai-blog/scene-svg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { infoRatioLabel, infoVisualStyleLabel, infoVisualTypeLabel } from "@/lib/ai-blog/info-visual";
import { downloadInfoImage } from "@/lib/ai-blog/render/info-download";
import { buildInfoScene } from "@/lib/ai-blog/render/info-layout";
import type { InfoVisualImage } from "@/lib/ai-blog/types";
import { cn } from "@/lib/utils";

/** 자주 쓰는 수정 요청 — 직접 입력 없이 바로 누를 수 있게 둔다 */
const QUICK_REVISIONS = [
  "항목을 3개로 줄여줘",
  "제목을 더 짧게",
  "표 형식으로 바꿔줘",
  "숫자를 더 크게 강조해줘",
];

/**
 * 정보 이미지 카드.
 *
 * 미리보기는 SVG, 다운로드는 같은 장면을 캔버스에 그린 PNG다.
 * 두 경로가 같은 장면 데이터를 쓰므로 화면과 저장 파일이 어긋나지 않는다.
 */
export function InfoImageCard({
  image,
  topic,
  index,
  busy = false,
  onRestyle,
  onRegenerate,
  onRevise,
  className,
}: {
  image: InfoVisualImage;
  /** 파일명에 쓸 포스팅 주제 */
  topic: string;
  /** 파일명·ZIP 순번 */
  index: number;
  busy?: boolean;
  /** 같은 정보를 다른 스타일로 다시 그린다 (AI 호출 없음) */
  onRestyle?: () => void;
  /** 같은 자리에 다른 정보로 다시 기획한다 */
  onRegenerate?: () => void;
  /** 이 이미지 하나에만 적용할 수정 요청 */
  onRevise?: (instruction: string) => void;
  className?: string;
}) {
  const [openRevise, setOpenRevise] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [saving, setSaving] = useState(false);

  const scene = buildInfoScene(image);
  const plan = image.plan;

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      await downloadInfoImage(image, topic, index);
      toast.success("이미지를 저장했습니다.");
    } catch {
      toast.error("이미지를 저장하는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  function applyRevision(value: string) {
    const next = value.trim();
    if (!next || !onRevise) return;
    onRevise(next);
    setInstruction("");
    setOpenRevise(false);
  }

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <div className="relative overflow-hidden rounded-2xl ring-1 ring-border">
        <SceneSvg scene={scene} />
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <LoaderCircle className="size-7 animate-spin text-primary" />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
          {infoVisualTypeLabel(plan.type)}
        </span>
        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {infoVisualStyleLabel(image.style)}
        </span>
        <span className="num rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {infoRatioLabel(image.ratio)}
        </span>
      </div>

      <div>
        <p className="text-[13px] font-bold">{plan.title}</p>
        {plan.purpose && (
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{plan.purpose}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Button type="button" size="sm" className="flex-1" disabled={saving} onClick={save}>
          {saving ? (
            <LoaderCircle className="size-3.5 animate-spin" />
          ) : (
            <Download className="size-3.5" />
          )}
          다운로드
        </Button>
        {onRestyle && (
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onRestyle}>
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

      {onRevise && (
        <button
          type="button"
          aria-expanded={openRevise}
          onClick={() => setOpenRevise((prev) => !prev)}
          className="inline-flex items-center justify-center gap-1 rounded-lg border border-border px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <Wand2 className="size-3.5" />
          수정 요청
        </button>
      )}

      {openRevise && onRevise && (
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-1.5">
            <Input
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyRevision(instruction);
                }
              }}
              placeholder="예: 항목을 4개에서 3개로 줄여줘"
              className="h-9 text-[12px]"
            />
            <Button
              type="button"
              size="sm"
              className="h-9 shrink-0"
              disabled={busy || !instruction.trim()}
              onClick={() => applyRevision(instruction)}
            >
              적용
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {QUICK_REVISIONS.map((quick) => (
              <button
                key={quick}
                type="button"
                disabled={busy}
                onClick={() => applyRevision(quick)}
                className="rounded-full border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
              >
                {quick}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

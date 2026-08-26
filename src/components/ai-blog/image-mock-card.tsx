"use client";

import { useState } from "react";
import { ChevronDown, Download } from "lucide-react";
import { imageTypeLabel } from "@/lib/ai-blog/options";
import type { AiBlogAspectRatio, AiBlogImageAsset, AiBlogImageStyle } from "@/lib/ai-blog/types";
import { cn } from "@/lib/utils";

/**
 * 이미지 결과 카드.
 *
 * 실제 이미지 생성 API가 연결되지 않은 단계에서는 asset.url이 비어 있으므로
 * 프롬프트에 담긴 텍스트 구성을 그대로 보여주는 "데모 미리보기"를 렌더링한다.
 * API가 붙어 url이 채워지면 같은 자리에 실제 이미지가 표시된다.
 */

const RATIO_CLASS: Record<AiBlogAspectRatio, string> = {
  "1:1": "aspect-square",
  "4:3": "aspect-[4/3]",
  "3:4": "aspect-[3/4]",
  "9:16": "aspect-[9/16]",
};

interface Theme {
  frame: string;
  label: string;
  title: string;
  line: string;
  bullet: string;
  footnote: string;
}

const STYLE_THEME: Record<AiBlogImageStyle, Theme> = {
  business: {
    frame: "bg-slate-900 text-slate-50",
    label: "bg-slate-700 text-slate-100",
    title: "text-white",
    line: "text-slate-200",
    bullet: "bg-sky-400",
    footnote: "text-slate-400",
  },
  clean: {
    frame: "bg-white text-slate-800 ring-1 ring-slate-200",
    label: "bg-primary/10 text-primary",
    title: "text-slate-900",
    line: "text-slate-600",
    bullet: "bg-primary",
    footnote: "text-slate-400",
  },
  warm: {
    frame: "bg-amber-50 text-amber-950 ring-1 ring-amber-200",
    label: "bg-amber-200 text-amber-900",
    title: "text-amber-950",
    line: "text-amber-900/80",
    bullet: "bg-orange-400",
    footnote: "text-amber-700/70",
  },
  minimal: {
    frame: "bg-neutral-100 text-neutral-900 ring-1 ring-neutral-300",
    label: "bg-neutral-900 text-neutral-50",
    title: "text-neutral-900",
    line: "text-neutral-600",
    bullet: "bg-neutral-900",
    footnote: "text-neutral-500",
  },
  news: {
    frame: "bg-white text-slate-900 ring-1 ring-slate-300",
    label: "bg-rose-600 text-white",
    title: "text-slate-900",
    line: "text-slate-700",
    bullet: "bg-rose-600",
    footnote: "text-slate-500",
  },
};

export function ImageMockCard({
  asset,
  className,
}: {
  asset: AiBlogImageAsset;
  className?: string;
}) {
  const [openPrompt, setOpenPrompt] = useState(false);
  const theme = STYLE_THEME[asset.style];
  const isThumbnail = asset.type === "thumbnail";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        className={cn(
          "relative flex flex-col gap-3 overflow-hidden rounded-2xl p-5",
          RATIO_CLASS[asset.ratio],
          theme.frame,
        )}
      >
        <span
          className={cn(
            "w-fit rounded-full px-2 py-0.5 text-[10px] font-bold",
            theme.label,
          )}
        >
          {asset.type === "cardnews" ? `${asset.index}장` : imageTypeLabel(asset.type)}
        </span>

        {isThumbnail ? (
          <div className="flex flex-1 flex-col justify-center">
            {asset.lines.map((line, i) => (
              <p key={`${line}-${i}`} className={cn("text-xl leading-tight font-black sm:text-2xl", theme.title)}>
                {line}
              </p>
            ))}
            {asset.footnote && (
              <p className={cn("mt-3 line-clamp-2 text-[11px]", theme.footnote)}>{asset.footnote}</p>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <p className={cn("line-clamp-3 text-[15px] leading-snug font-bold", theme.title)}>
                {asset.title}
              </p>
              {asset.subtitle && (
                <p className={cn("line-clamp-2 text-[11px]", theme.footnote)}>{asset.subtitle}</p>
              )}
            </div>
            <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
              {asset.lines.map((line, i) => (
                <li key={`${line}-${i}`} className="flex gap-2">
                  <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", theme.bullet)} aria-hidden />
                  <span className={cn("line-clamp-3 text-[12px] leading-relaxed", theme.line)}>
                    {line}
                  </span>
                </li>
              ))}
            </ul>
            {asset.footnote && (
              <p className={cn("text-[10px]", theme.footnote)}>{asset.footnote}</p>
            )}
          </>
        )}

        <span className="absolute top-3 right-3 rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
          데모 미리보기
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled
          title="실제 이미지 생성 API 연결 후 사용할 수 있습니다."
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground opacity-60"
        >
          <Download className="size-3.5" />
          이미지 저장 (데모)
        </button>
        <button
          type="button"
          aria-expanded={openPrompt}
          onClick={() => setOpenPrompt((prev) => !prev)}
          className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          프롬프트
          <ChevronDown className={cn("size-3.5 transition-transform", openPrompt && "rotate-180")} />
        </button>
      </div>

      {openPrompt && (
        <pre className="scrollbar-thin max-h-56 overflow-auto rounded-xl bg-muted/60 p-3 text-[11px] leading-relaxed whitespace-pre-wrap">
          {asset.prompt}
        </pre>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { ArrowRight, Eye, LoaderCircle, PenLine, RefreshCw, Sparkles } from "lucide-react";
import { AiDemoBadge, AiFactCheckNotice } from "@/components/ai-blog/ai-notice";
import { ArticleBody } from "@/components/ai-blog/article-body";
import { CopyButton } from "@/components/ai-blog/copy-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { countChars, draftToFullText } from "@/lib/ai-blog/article";
import { AI_BLOG_REVISE_OPTIONS, needsFactCheck } from "@/lib/ai-blog/options";
import type { AiBlogDraft, AiBlogInput, AiBlogReviseInstruction } from "@/lib/ai-blog/types";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * STEP 3 — 원고 수정 및 확정.
 *
 * 직접 수정 · 다시 생성 · AI로 수정 · 전체 복사를 한 화면에서 처리하고,
 * 확정 시점의 "현재 원고"가 그대로 이미지 제작의 입력이 된다.
 */
export function ArticleEditor({
  draft,
  input,
  onDraftChange,
  onRevise,
  revisingLabel,
  onRegenerate,
  regenerating,
  onConfirm,
}: {
  draft: AiBlogDraft;
  input: AiBlogInput;
  onDraftChange: (next: AiBlogDraft) => void;
  onRevise: (instruction: AiBlogReviseInstruction) => void;
  /** AI 수정 진행 중인 항목명 (없으면 null) */
  revisingLabel: string | null;
  onRegenerate: () => void;
  regenerating: boolean;
  onConfirm: () => void;
}) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [customNote, setCustomNote] = useState("");

  const busy = revisingLabel !== null || regenerating;
  const charCount = countChars(draft.body);
  const ratio = Math.min(100, Math.round((charCount / Math.max(1, input.articleLength)) * 100));

  function requestCustom() {
    const note = customNote.trim();
    if (!note) return;
    onRevise({ action: "custom", label: "직접 입력 요청", note });
    setCustomNote("");
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-input">
            {(
              [
                { id: "edit", label: "직접 수정", icon: PenLine },
                { id: "preview", label: "미리보기", icon: Eye },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMode(tab.id)}
                  aria-pressed={mode === tab.id}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition-colors",
                    mode === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent/50",
                  )}
                >
                  <Icon className="size-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <CopyButton size="sm" text={draftToFullText(draft)} toastLabel="원고를 복사했습니다." />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={onRegenerate}
            >
              <RefreshCw className={regenerating ? "size-4 animate-spin" : "size-4"} />
              다시 생성
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="ai-blog-title" className="text-[13px] font-medium">
            제목
          </label>
          <Input
            id="ai-blog-title"
            value={draft.title}
            onChange={(e) => onDraftChange({ ...draft, title: e.target.value })}
            className="h-11 text-[15px] font-semibold"
          />
        </div>

        {mode === "edit" ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ai-blog-body" className="text-[13px] font-medium">
              본문
            </label>
            <Textarea
              id="ai-blog-body"
              value={draft.body}
              onChange={(e) => onDraftChange({ ...draft, body: e.target.value })}
              rows={24}
              className="text-[14px] leading-relaxed"
            />
          </div>
        ) : (
          <div className="rounded-xl border border-border p-4 sm:p-5">
            <h2 className="text-lg leading-snug font-bold tracking-tight sm:text-xl">
              {draft.title}
            </h2>
            <ArticleBody markdown={draft.body} className="mt-4" />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <span className="num text-[13px] text-muted-foreground">
            공백 제외 {formatNumber(charCount)}자 · 목표 {formatNumber(input.articleLength)}자
          </span>
          <span className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
            <span className="block h-full rounded-full bg-primary" style={{ width: `${ratio}%` }} />
          </span>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="flex items-center gap-1.5 text-[15px] font-bold">
            <Sparkles className="size-4 text-primary" />
            AI 빠른 수정
          </h3>
          <AiDemoBadge />
          {revisingLabel && (
            <span className="ml-auto inline-flex items-center gap-1.5 text-[13px] text-primary">
              <LoaderCircle className="size-3.5 animate-spin" />
              {revisingLabel} 반영 중…
            </span>
          )}
        </div>

        <ul className="flex flex-wrap gap-1.5">
          {AI_BLOG_REVISE_OPTIONS.map((option) => (
            <li key={option.action}>
              <button
                type="button"
                disabled={busy}
                title={option.description}
                onClick={() => onRevise({ action: option.action, label: option.label })}
                className="rounded-lg border border-input px-3 py-2 text-[13px] font-medium transition-colors hover:bg-accent/60 disabled:opacity-50"
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>

        <div className="flex gap-2">
          <Input
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                requestCustom();
              }
            }}
            placeholder="원하는 수정 내용을 직접 적어주세요. 예: 표를 하나 더 넣어주세요."
            className="h-11"
          />
          <Button
            type="button"
            variant="outline"
            className="h-11 shrink-0"
            disabled={busy || !customNote.trim()}
            onClick={requestCustom}
          >
            AI로 수정
          </Button>
        </div>
      </section>

      <AiFactCheckNotice strong={needsFactCheck(input.category)} />

      <div className="flex flex-col gap-2 rounded-2xl border border-primary/25 bg-primary/5 p-5 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold">원고를 확정하고 이미지를 만들까요?</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            지금 화면의 <strong className="font-semibold text-foreground">수정된 최종 원고</strong>를
            기준으로 이미지가 만들어집니다.
          </p>
        </div>
        <Button
          type="button"
          size="lg"
          className="h-12 shrink-0"
          disabled={busy || !draft.title.trim() || !draft.body.trim()}
          onClick={onConfirm}
        >
          이 원고로 이미지 만들기
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

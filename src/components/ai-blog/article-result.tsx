"use client";

import { ArrowRight, LoaderCircle, Pencil, RefreshCw } from "lucide-react";
import { AiDemoBadge, AiFactCheckNotice } from "@/components/ai-blog/ai-notice";
import { ArticleBody } from "@/components/ai-blog/article-body";
import { CopyButton } from "@/components/ai-blog/copy-button";
import { Button } from "@/components/ui/button";
import { draftToFullText } from "@/lib/ai-blog/article";
import {
  articleTypeLabel,
  categoryLabel,
  needsFactCheck,
  purposeLabel,
} from "@/lib/ai-blog/options";
import type { AiBlogDraft, AiBlogInput } from "@/lib/ai-blog/types";
import { formatNumber } from "@/lib/format";

/** 생성 중 화면 — 어떤 작업을 하고 있는지 순서대로 보여준다 */
export function ArticleGenerating({ steps }: { steps: string[] }) {
  return (
    <div className="flex flex-col items-center gap-5 rounded-2xl border border-border bg-surface px-6 py-16">
      <LoaderCircle className="size-8 animate-spin text-primary" />
      <div className="text-center">
        <p className="text-[15px] font-semibold">원고를 만들고 있어요</p>
        <p className="mt-1 text-[13px] text-muted-foreground">잠시만 기다려 주세요.</p>
      </div>
      <ul className="flex flex-col gap-1.5 text-center text-[13px] text-muted-foreground">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ul>
    </div>
  );
}

/** 생성 조건 요약 — 어떤 입력으로 만든 원고인지 한눈에 보여준다 */
export function InputSummary({ input, charCount }: { input: AiBlogInput; charCount: number }) {
  const items = [
    { label: "업종", value: categoryLabel(input.category) },
    { label: "목적", value: purposeLabel(input.purpose) },
    { label: "유형", value: articleTypeLabel(input.articleType) },
    { label: "타깃", value: input.target || "일반 독자" },
    {
      label: "분량",
      value: `${formatNumber(charCount)}자 / 목표 ${formatNumber(input.articleLength)}자`,
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl bg-muted/60 px-3 py-2">
          <dt className="text-[11px] text-muted-foreground">{item.label}</dt>
          <dd className="num mt-0.5 truncate text-[13px] font-semibold">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * STEP 2 — AI 원고 생성 결과.
 * 여기서는 읽기 전용으로 확인만 하고, 수정은 STEP 3에서 한다.
 */
export function ArticleResult({
  draft,
  input,
  charCount,
  regenerating,
  onRegenerate,
  onBack,
  onEdit,
}: {
  draft: AiBlogDraft;
  input: AiBlogInput;
  charCount: number;
  regenerating: boolean;
  onRegenerate: () => void;
  /** 입력 화면으로 되돌아가기 */
  onBack: () => void;
  /** 원고 수정·확정 단계로 이동 */
  onEdit: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <InputSummary input={input} charCount={charCount} />

      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium text-muted-foreground">생성된 원고</span>
          <AiDemoBadge />
          <div className="ml-auto flex items-center gap-1.5">
            <CopyButton size="sm" text={draftToFullText(draft)} toastLabel="원고를 복사했습니다." />
            <Button type="button" variant="outline" size="sm" disabled={regenerating} onClick={onRegenerate}>
              <RefreshCw className={regenerating ? "size-4 animate-spin" : "size-4"} />
              다시 생성
            </Button>
          </div>
        </div>

        <h2 className="text-xl leading-snug font-bold tracking-tight sm:text-2xl">{draft.title}</h2>
        <ArticleBody markdown={draft.body} />
      </section>

      <AiFactCheckNotice strong={needsFactCheck(input.category)} />

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" size="lg" className="h-12" onClick={onBack}>
          입력 다시 하기
        </Button>
        <Button type="button" size="lg" className="h-12" onClick={onEdit}>
          <Pencil className="size-4" />
          원고 수정·확정하기
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

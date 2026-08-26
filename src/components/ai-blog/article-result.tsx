"use client";

import { ArrowRight, Info, LoaderCircle, Pencil, RefreshCw } from "lucide-react";
import { AiDemoBadge, AiFactCheckNotice } from "@/components/ai-blog/ai-notice";
import { ArticleBody } from "@/components/ai-blog/article-body";
import { CopyButton } from "@/components/ai-blog/copy-button";
import {
  ConstraintChips,
  RelevanceBadge,
  RelevanceWarning,
} from "@/components/ai-blog/relevance-badge";
import { Button } from "@/components/ui/button";
import { draftToFullText } from "@/lib/ai-blog/article";
import {
  articleTypeLabel,
  categoryLabel,
  needsFactCheck,
  purposeLabel,
} from "@/lib/ai-blog/options";
import type { AiBlogDraft, AiBlogInput, RelevanceReport } from "@/lib/ai-blog/types";
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

/** 읽지 못한 참고 링크 안내 — 내용을 반영한 것처럼 보이지 않게 명시한다 */
export function UnreadReferenceNotice({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <p className="flex items-start gap-2 rounded-xl bg-muted/60 px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
      <Info className="mt-0.5 size-4 shrink-0 text-primary" />
      입력하신 참고 링크 {count}건은 <strong className="font-semibold">주소만 저장</strong>되었고
      페이지 내용은 자동으로 분석되지 않았습니다. 원고에 꼭 들어가야 할 내용은 참고자료를 &lsquo;직접
      입력&rsquo;으로 넣고 다시 생성해 주세요.
    </p>
  );
}

/** 생성 조건 요약 — 어떤 입력으로 만든 원고인지 한눈에 보여준다 */
export function InputSummary({
  input,
  charCount,
  constraintLabels = [],
}: {
  input: AiBlogInput;
  charCount: number;
  constraintLabels?: string[];
}) {
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
    <div className="flex flex-col gap-2">
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl bg-muted/60 px-3 py-2">
            <dt className="text-[11px] text-muted-foreground">{item.label}</dt>
            <dd className="num mt-0.5 truncate text-[13px] font-semibold">{item.value}</dd>
          </div>
        ))}
      </dl>
      <ConstraintChips labels={constraintLabels} />
    </div>
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
  demo,
  relevance,
  constraintLabels,
  unreadUrlCount,
  regenerating,
  onRegenerate,
  onBack,
  onEdit,
}: {
  draft: AiBlogDraft;
  input: AiBlogInput;
  charCount: number;
  /** 템플릿 Mock 이 만든 원고인지 (실제 AI 응답이면 false) */
  demo: boolean;
  /** 주제 반영도 검증 결과 */
  relevance: RelevanceReport;
  /** 추가 요청사항이 어떻게 해석됐는지 */
  constraintLabels: string[];
  /** 내용을 읽지 못한 참고 링크 수 */
  unreadUrlCount: number;
  regenerating: boolean;
  onRegenerate: () => void;
  /** 입력 화면으로 되돌아가기 */
  onBack: () => void;
  /** 원고 수정·확정 단계로 이동 */
  onEdit: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <InputSummary input={input} charCount={charCount} constraintLabels={constraintLabels} />

      <RelevanceWarning report={relevance} onRegenerate={onRegenerate} />
      <UnreadReferenceNotice count={unreadUrlCount} />

      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium text-muted-foreground">생성된 원고</span>
          {demo && <AiDemoBadge />}
          <RelevanceBadge report={relevance} />
          <div className="ml-auto flex items-center gap-1.5">
            <CopyButton size="sm" text={draftToFullText(draft)} toastLabel="원고를 복사했습니다." />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={regenerating}
              onClick={onRegenerate}
            >
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

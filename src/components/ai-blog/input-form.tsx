"use client";

import { useState } from "react";
import { Link2, Plus, Sparkles, X } from "lucide-react";
import { LoginRequiredDialog } from "@/components/auth/login-required-dialog";
import { AiFactCheckNotice } from "@/components/ai-blog/ai-notice";
import { OptionCards } from "@/components/ai-blog/option-cards";
import { Field } from "@/components/common/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AI_BLOG_ARTICLE_TYPES,
  AI_BLOG_CATEGORIES,
  AI_BLOG_LENGTH_PRESETS,
  AI_BLOG_MAX_LENGTH,
  AI_BLOG_MIN_LENGTH,
  AI_BLOG_PURPOSES,
  needsFactCheck,
} from "@/lib/ai-blog/options";
import { URL_NOT_ANALYZED_NOTICE } from "@/lib/ai-blog/references";
import type { AiBlogInput, AiBlogReference } from "@/lib/ai-blog/types";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const TARGET_SUGGESTIONS = ["전월세 거주자", "30대 여성", "학부모", "자영업자", "사회초년생"];

const NOTE_SUGGESTIONS = [
  "너무 광고성으로 보이지 않게 작성해주세요.",
  "표와 체크리스트를 포함해주세요.",
  "실제 사례를 예시로 들어주세요.",
];

/** 입력값 검증 — 버튼 비활성 사유를 그대로 문구로 보여준다 */
export function validateInput(input: AiBlogInput): { ok: boolean; message: string } {
  if (!input.topic.trim()) return { ok: false, message: "포스팅 주제를 입력해 주세요" };
  if (input.keywords.length === 0) return { ok: false, message: "핵심 키워드를 1개 이상 추가해 주세요" };
  if (!input.category) return { ok: false, message: "업종·분야를 선택해 주세요" };
  if (!input.purpose) return { ok: false, message: "원고 목적을 선택해 주세요" };
  if (!input.articleType) return { ok: false, message: "원고 유형을 선택해 주세요" };
  if (
    !Number.isFinite(input.articleLength) ||
    input.articleLength < AI_BLOG_MIN_LENGTH ||
    input.articleLength > AI_BLOG_MAX_LENGTH
  ) {
    return {
      ok: false,
      message: `글 분량은 ${formatNumber(AI_BLOG_MIN_LENGTH)}~${formatNumber(AI_BLOG_MAX_LENGTH)}자 사이로 입력해 주세요`,
    };
  }
  return { ok: true, message: "" };
}

/**
 * STEP 1 — 콘텐츠 정보 입력.
 *
 * 프롬프트를 길게 쓰지 않아도 되도록 주제·키워드·목적·타깃을 폼으로 받는다.
 * "프롬프트" 같은 개발자용 표현은 화면에 쓰지 않는다.
 */
export function AiBlogInputForm({
  value,
  onChange,
  onSubmit,
  canUse,
  submitting,
}: {
  value: AiBlogInput;
  onChange: (patch: Partial<AiBlogInput>) => void;
  onSubmit: () => void;
  /** 광고주로 로그인했는지 — 아니면 로그인 안내 모달을 띄운다 */
  canUse: boolean;
  submitting: boolean;
}) {
  const [keywordText, setKeywordText] = useState("");
  const [customLength, setCustomLength] = useState(
    !AI_BLOG_LENGTH_PRESETS.includes(value.articleLength),
  );
  const [referenceKind, setReferenceKind] = useState<AiBlogReference["kind"]>("url");
  const [referenceText, setReferenceText] = useState("");

  const validation = validateInput(value);

  function addKeywords(raw: string) {
    const next = raw
      .split(/[,\n]/)
      .map((k) => k.trim())
      .filter(Boolean)
      .filter((k) => !value.keywords.includes(k));
    if (next.length > 0) onChange({ keywords: [...value.keywords, ...next].slice(0, 10) });
    setKeywordText("");
  }

  function addReference() {
    const text = referenceText.trim();
    if (!text) return;
    const reference: AiBlogReference = {
      id: `ref-${Date.now().toString(36)}`,
      kind: referenceKind,
      value: text,
    };
    onChange({ references: [...value.references, reference] });
    setReferenceText("");
  }

  function appendNote(note: string) {
    const current = value.requestNotes.trim();
    if (current.includes(note)) return;
    onChange({ requestNotes: current ? `${current}\n${note}` : note });
  }

  const submitButton = (
    <Button
      type="button"
      size="lg"
      className="h-12 w-full px-6 text-[15px] sm:w-auto"
      disabled={submitting || (canUse && !validation.ok)}
      onClick={canUse ? onSubmit : undefined}
    >
      <Sparkles className="size-4" />
      {submitting ? "원고를 만들고 있어요…" : "AI 원고 생성"}
    </Button>
  );

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <Field label="포스팅 주제" required hint="어떤 내용을 쓸지 한 문장으로 적어주세요.">
          <Input
            value={value.topic}
            onChange={(e) => onChange({ topic: e.target.value })}
            placeholder="예: 집주인이 실거주한다고 나가라고 할 때"
            className="h-11"
          />
        </Field>

        <Field
          label="핵심 키워드"
          required
          hint="엔터 또는 쉼표로 여러 개를 추가할 수 있어요. (최대 10개)"
        >
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Input
                value={keywordText}
                onChange={(e) => setKeywordText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addKeywords(keywordText);
                  }
                }}
                placeholder="예: 집주인 실거주, 전세계약, 갱신요구권"
                className="h-11"
              />
              <Button
                type="button"
                variant="outline"
                className="h-11 shrink-0"
                onClick={() => addKeywords(keywordText)}
              >
                <Plus className="size-4" />
                추가
              </Button>
            </div>
            {value.keywords.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {value.keywords.map((keyword) => (
                  <li key={keyword}>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-[13px] font-medium text-accent-foreground">
                      {keyword}
                      <button
                        type="button"
                        aria-label={`${keyword} 삭제`}
                        onClick={() =>
                          onChange({ keywords: value.keywords.filter((k) => k !== keyword) })
                        }
                        className="text-accent-foreground/60 hover:text-accent-foreground"
                      >
                        <X className="size-3.5" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Field>

        <Field label="업종 · 분야" required>
          <OptionCards
            ariaLabel="업종 분야"
            options={AI_BLOG_CATEGORIES}
            value={value.category}
            onChange={(category) => onChange({ category })}
            columns={5}
          />
        </Field>

        {needsFactCheck(value.category) && <AiFactCheckNotice strong />}
      </section>

      <section className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <Field label="원고 목적" required hint="글의 방향을 정합니다.">
          <OptionCards
            ariaLabel="원고 목적"
            options={AI_BLOG_PURPOSES}
            value={value.purpose}
            onChange={(purpose) => onChange({ purpose })}
            columns={5}
          />
        </Field>

        <Field label="타깃" hint="누가 읽을 글인지 적어주세요. 문장 톤이 달라집니다.">
          <div className="flex flex-col gap-2">
            <Input
              value={value.target}
              onChange={(e) => onChange({ target: e.target.value })}
              placeholder="예: 전월세 거주자"
              className="h-11"
            />
            <ul className="flex flex-wrap gap-1.5">
              {TARGET_SUGGESTIONS.map((suggestion) => (
                <li key={suggestion}>
                  <button
                    type="button"
                    onClick={() => onChange({ target: suggestion })}
                    className="rounded-lg bg-muted px-2.5 py-1 text-[12px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Field>

        <Field label="원고 유형" required>
          <OptionCards
            ariaLabel="원고 유형"
            options={AI_BLOG_ARTICLE_TYPES}
            value={value.articleType}
            onChange={(articleType) => onChange({ articleType })}
            columns={4}
          />
        </Field>

        <Field label="글 분량" required hint="공백 제외 기준입니다.">
          <div className="flex flex-wrap items-center gap-2">
            {AI_BLOG_LENGTH_PRESETS.map((preset) => {
              const selected = !customLength && value.articleLength === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setCustomLength(false);
                    onChange({ articleLength: preset });
                  }}
                  className={cn(
                    "num rounded-xl border px-4 py-2.5 text-[13px] font-semibold transition-colors",
                    selected
                      ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                      : "border-input hover:bg-accent/50",
                  )}
                >
                  {formatNumber(preset)}자
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setCustomLength(true)}
              className={cn(
                "rounded-xl border px-4 py-2.5 text-[13px] font-semibold transition-colors",
                customLength
                  ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                  : "border-input hover:bg-accent/50",
              )}
            >
              직접 입력
            </button>
            {customLength && (
              <Input
                type="number"
                inputMode="numeric"
                min={AI_BLOG_MIN_LENGTH}
                max={AI_BLOG_MAX_LENGTH}
                value={Number.isFinite(value.articleLength) ? value.articleLength : ""}
                onChange={(e) => onChange({ articleLength: Number(e.target.value) })}
                className="num h-11 w-32"
                aria-label="직접 입력 분량"
              />
            )}
          </div>
        </Field>
      </section>

      <section className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <Field
          label="참고자료"
          hint={URL_NOT_ANALYZED_NOTICE}
        >
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <div className="flex overflow-hidden rounded-lg border border-input">
                {(["url", "text"] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setReferenceKind(kind)}
                    className={cn(
                      "px-3 py-2 text-[13px] font-medium transition-colors",
                      referenceKind === kind
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent/50",
                    )}
                  >
                    {kind === "url" ? "URL" : "직접 입력"}
                  </button>
                ))}
              </div>
              <Input
                value={referenceText}
                onChange={(e) => setReferenceText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addReference();
                  }
                }}
                placeholder={
                  referenceKind === "url" ? "https://..." : "참고할 내용을 붙여넣어 주세요."
                }
                className="h-10 min-w-0 flex-1"
              />
              <Button type="button" variant="outline" onClick={addReference}>
                <Plus className="size-4" />
                추가
              </Button>
            </div>

            {value.references.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {value.references.map((reference) => (
                  <li
                    key={reference.id}
                    className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-[13px]"
                  >
                    <Link2 className="size-3.5 shrink-0 text-muted-foreground" />
                    <span
                      className={cn(
                        "shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
                        reference.kind === "text"
                          ? "bg-primary/10 text-primary"
                          : "bg-amber-100 text-amber-800",
                      )}
                    >
                      {reference.kind === "text" ? "원고 반영" : "주소만 저장"}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{reference.value}</span>
                    <button
                      type="button"
                      aria-label="참고자료 삭제"
                      onClick={() =>
                        onChange({
                          references: value.references.filter((r) => r.id !== reference.id),
                        })
                      }
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Field>

        <Field label="추가 요청사항" hint="원하는 톤이나 꼭 넣을 내용을 적어주세요.">
          <div className="flex flex-col gap-2">
            <Textarea
              value={value.requestNotes}
              onChange={(e) => onChange({ requestNotes: e.target.value })}
              placeholder="예: 너무 광고성으로 보이지 않게 작성해주세요."
              rows={4}
            />
            <ul className="flex flex-wrap gap-1.5">
              {NOTE_SUGGESTIONS.map((note) => (
                <li key={note}>
                  <button
                    type="button"
                    onClick={() => appendNote(note)}
                    className="rounded-lg bg-muted px-2.5 py-1 text-[12px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    + {note}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Field>
      </section>

      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-end">
        {!validation.ok && (
          <p className="text-[13px] text-muted-foreground sm:mr-auto">{validation.message}</p>
        )}
        {canUse ? (
          submitButton
        ) : (
          <LoginRequiredDialog
            redirectTo="/ai-blog"
            title="로그인 후 이용할 수 있습니다"
            description="입력한 정보로 원고를 만들고 저장하려면 로그인해 주세요."
            trigger={submitButton}
          />
        )}
      </div>
    </div>
  );
}

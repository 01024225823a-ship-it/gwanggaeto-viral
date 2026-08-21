"use client";

import { useState } from "react";
import { Check, ChevronDown, Info } from "lucide-react";
import { CONTENT_TYPES, findContentType } from "@/lib/domain/content-type";
import type { ContentType } from "@/lib/domain/content-type";
import { cn } from "@/lib/utils";

/**
 * 원고 유형 선택 — 라디오 카드 3개 + 접혀 있는 예시 영역.
 * 예시는 카드 아래 한 곳에서 펼쳐 세 유형을 같은 자리에서 비교할 수 있게 한다.
 */
export function ContentTypePicker({
  value,
  onChange,
}: {
  value: ContentType | "";
  onChange: (next: ContentType) => void;
}) {
  const [openId, setOpenId] = useState<ContentType | "">("");
  const opened = findContentType(openId);

  return (
    <div className="flex flex-col gap-2">
      <div role="radiogroup" aria-label="원고 유형" className="grid gap-2 sm:grid-cols-3">
        {CONTENT_TYPES.map((type) => {
          const selected = type.id === value;
          const open = type.id === openId;
          return (
            <div
              key={type.id}
              role="radio"
              tabIndex={0}
              aria-checked={selected}
              onClick={() => onChange(type.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onChange(type.id);
                }
              }}
              className={cn(
                "flex cursor-pointer flex-col gap-1.5 rounded-xl border p-3.5 transition-colors",
                selected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-input hover:bg-accent/50",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold">{type.label}</span>
                <span
                  className={cn(
                    "flex size-4.5 shrink-0 items-center justify-center rounded-full border",
                    selected ? "border-primary bg-primary text-primary-foreground" : "border-input",
                  )}
                >
                  {selected && <Check className="size-3" />}
                </span>
              </div>
              <p className="text-[13px] leading-relaxed text-muted-foreground">{type.short}</p>
              <button
                type="button"
                aria-expanded={open}
                onClick={(e) => {
                  // 예시 열기는 선택과 분리한다
                  e.stopPropagation();
                  setOpenId(open ? "" : type.id);
                }}
                className="mt-0.5 inline-flex w-fit items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                원고 예시 보기
                <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
              </button>
            </div>
          );
        })}
      </div>

      {opened && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] font-bold">
              {opened.label} <span className="font-normal text-muted-foreground">원고 예시</span>
            </p>
            <button
              type="button"
              onClick={() => setOpenId("")}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              접기
            </button>
          </div>

          <p className="text-[13px] leading-relaxed">{opened.description}</p>

          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold text-muted-foreground">원고 흐름</p>
            <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              {opened.flow.map((step, i) => (
                <li key={step} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-muted-foreground/60">→</span>}
                  <span className="rounded-lg bg-surface px-2 py-1 text-xs">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold text-muted-foreground">예시 원고</p>
            <p className="rounded-lg bg-surface p-3.5 text-[13px] leading-relaxed whitespace-pre-line">
              {opened.sample}
            </p>
          </div>

          {opened.note && (
            <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
              {opened.note}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** 실행사 작업 상세용 원고 유형 안내 — 어떤 방식으로 써야 하는지 흐름까지 보여준다 */
export function ContentTypeGuide({ contentType }: { contentType?: string }) {
  const info = findContentType(contentType);
  if (!info) return null;

  return (
    <div className="flex flex-col gap-1.5 rounded-lg bg-muted/60 p-3">
      <p className="text-[13px] font-semibold">
        {info.label}
        <span className="ml-1.5 font-normal text-muted-foreground">{info.description}</span>
      </p>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {info.flow.map((step, i) => (
          <li key={step} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-muted-foreground/60">→</span>}
            <span className="rounded-md bg-surface px-1.5 py-0.5 text-xs">{step}</span>
          </li>
        ))}
      </ol>
      {info.note && <p className="text-xs text-muted-foreground">{info.note}</p>}
    </div>
  );
}

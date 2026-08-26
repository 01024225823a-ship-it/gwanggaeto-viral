"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CardOption<T extends string> {
  id: T;
  label: string;
  description?: string;
}

/**
 * 선택 카드 그리드 — "프롬프트를 쓰는 도구"처럼 보이지 않도록
 * 목적·유형·스타일 같은 값을 카드로 고르게 한다.
 */
export function OptionCards<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  columns = 3,
  className,
}: {
  options: CardOption<T>[];
  value: T | "";
  onChange: (next: T) => void;
  ariaLabel: string;
  /** 데스크톱 기준 열 수 */
  columns?: 2 | 3 | 4 | 5;
  className?: string;
}) {
  const columnClass = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
    5: "sm:grid-cols-3 lg:grid-cols-5",
  }[columns];

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("grid grid-cols-2 gap-2", columnClass, className)}
    >
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.id)}
            className={cn(
              "flex flex-col gap-1 rounded-xl border p-3 text-left transition-colors",
              selected
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-input hover:bg-accent/50",
            )}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-bold">{option.label}</span>
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full border",
                  selected ? "border-primary bg-primary text-primary-foreground" : "border-input",
                )}
              >
                {selected && <Check className="size-2.5" />}
              </span>
            </span>
            {option.description && (
              <span className="text-[11px] leading-relaxed text-muted-foreground">
                {option.description}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** 여러 개를 고르는 카드 그리드 (이미지 유형 선택 등) */
export function MultiOptionCards<T extends string>({
  options,
  values,
  onToggle,
  ariaLabel,
  columns = 3,
  className,
}: {
  options: Array<CardOption<T> & { detail?: string[] }>;
  values: T[];
  onToggle: (next: T) => void;
  ariaLabel: string;
  columns?: 2 | 3 | 4 | 5;
  className?: string;
}) {
  const columnClass = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
    5: "sm:grid-cols-3 lg:grid-cols-5",
  }[columns];

  return (
    <div aria-label={ariaLabel} className={cn("grid gap-2", columnClass, className)}>
      {options.map((option) => {
        const selected = values.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            role="checkbox"
            aria-checked={selected}
            onClick={() => onToggle(option.id)}
            className={cn(
              "flex flex-col gap-1.5 rounded-xl border p-4 text-left transition-colors",
              selected
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-input hover:bg-accent/50",
            )}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold">{option.label}</span>
              <span
                className={cn(
                  "flex size-4.5 shrink-0 items-center justify-center rounded-md border",
                  selected ? "border-primary bg-primary text-primary-foreground" : "border-input",
                )}
              >
                {selected && <Check className="size-3" />}
              </span>
            </span>
            {option.description && (
              <span className="text-[13px] leading-relaxed text-muted-foreground">
                {option.description}
              </span>
            )}
            {option.detail && option.detail.length > 0 && (
              <span className="mt-0.5 flex flex-wrap gap-1">
                {option.detail.map((d) => (
                  <span key={d} className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                    {d}
                  </span>
                ))}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

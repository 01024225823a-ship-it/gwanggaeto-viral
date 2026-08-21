"use client";

import { useState } from "react";
import { Check, Info, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CAFE_GROUPS,
  publishableCafesOf,
  publishableCountOf,
  regionOptions,
  subCategoryOptions,
} from "@/lib/mock/cafes";
import type { Cafe } from "@/lib/domain/types";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/** 필터 "전체" 옵션 값 — Radix Select는 빈 문자열 값을 허용하지 않는다 */
const ALL = "__all__";

/* ------------------------------------------------------------------ */
/* 1차 카테고리(작업 카테고리) 선택                                     */
/* ------------------------------------------------------------------ */

export function CafeGroupPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (groupId: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {CAFE_GROUPS.map((group) => {
        const count = publishableCountOf(group.id);
        const selected = group.id === value;
        return (
          <button
            key={group.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(group.id)}
            className={cn(
              "flex min-h-11 items-center gap-1.5 rounded-xl border px-3 py-2 text-[13px] transition-colors",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input hover:bg-accent",
            )}
          >
            <span className="font-medium">{group.name}</span>
            <span className={cn("num text-xs", selected ? "opacity-80" : "text-muted-foreground")}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 카페 선택                                                            */
/* ------------------------------------------------------------------ */

export function CafePicker({
  groupId,
  limit,
  value,
  onChange,
  notice,
  noticeExample,
}: {
  /** 선택한 1차 카테고리 */
  groupId: string;
  /** 주문 수량 = 선택 가능한 최대 카페 수 */
  limit: number;
  value: string[];
  onChange: (cafeIds: string[]) => void;
  notice?: string;
  noticeExample?: string;
}) {
  const [query, setQuery] = useState("");
  const [sub, setSub] = useState(ALL);
  const [region, setRegion] = useState(ALL);

  const cafes = publishableCafesOf(groupId);
  const subs = subCategoryOptions(groupId);
  const regions = regionOptions(groupId);

  const keyword = query.trim();
  const filtered = cafes.filter(
    (cafe) =>
      (sub === ALL || cafe.subCategory === sub) &&
      (region === ALL || cafe.region === region) &&
      (!keyword || cafe.name.includes(keyword)),
  );

  // 활동지역별로 묶어 보여준다 (지역 순서는 카탈로그 등장 순서를 따른다)
  const grouped: { region: string; cafes: Cafe[] }[] = [];
  for (const cafe of filtered) {
    const bucket = grouped.find((g) => g.region === cafe.region);
    if (bucket) bucket.cafes.push(cafe);
    else grouped.push({ region: cafe.region, cafes: [cafe] });
  }

  const selectedCafes = value
    .map((id) => cafes.find((c) => c.id === id))
    .filter((c): c is Cafe => Boolean(c));
  const remaining = Math.max(0, limit - value.length);
  // 수량 입력이 비어 있으면(limit 0) 선택 자체를 열지 않는다
  const full = value.length >= limit;
  const noLimit = limit <= 0;

  function toggle(cafe: Cafe) {
    if (value.includes(cafe.id)) {
      onChange(value.filter((id) => id !== cafe.id));
      return;
    }
    // 같은 카페 중복 선택은 막고, 수량을 넘는 선택도 막는다
    if (full) return;
    onChange([...value, cafe.id]);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 선택 현황 */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-accent/50 px-3.5 py-3">
        <p className="text-[13px] font-semibold">
          카페 선택{" "}
          <span className="num text-primary">
            {formatNumber(value.length)} / {formatNumber(limit)}개
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          {noLimit ? (
            "주문 수량을 먼저 입력해 주세요"
          ) : remaining > 0 ? (
            <>
              남은 선택 <span className="num font-semibold">{formatNumber(remaining)}개</span>
            </>
          ) : (
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
              <Check className="size-3.5" />
              선택 완료
            </span>
          )}
        </p>
      </div>

      {/* 선택한 카페 */}
      {selectedCafes.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {selectedCafes.map((cafe, i) => (
            <li key={cafe.id}>
              <button
                type="button"
                onClick={() => toggle(cafe)}
                className="flex items-center gap-1.5 rounded-lg bg-primary/10 py-1.5 pr-1.5 pl-2.5 text-[13px] font-medium text-primary hover:bg-primary/15"
              >
                <span className="num text-[11px] opacity-70">{i + 1}</span>
                {cafe.name}
                <X className="size-3.5" aria-label={`${cafe.name} 선택 해제`} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* 검색 · 필터 */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="카페명 검색"
            className="h-11 pl-9"
            aria-label="카페명 검색"
          />
        </div>
        <div className="flex gap-2">
          <Select value={sub} onValueChange={setSub}>
            <SelectTrigger className="h-11 min-w-0 flex-1 sm:w-36 sm:flex-none">
              <SelectValue placeholder="2차 카테고리" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>2차 전체</SelectItem>
              {subs.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger className="h-11 min-w-0 flex-1 sm:w-32 sm:flex-none">
              <SelectValue placeholder="활동지역" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>지역 전체</SelectItem>
              {regions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 카페 목록 — 지역별 묶음 + 스크롤 */}
      <div className="max-h-[26rem] overflow-y-auto rounded-xl border border-border">
        {grouped.length === 0 ? (
          <p className="px-4 py-10 text-center text-[13px] text-muted-foreground">
            조건에 맞는 카페가 없습니다. 검색어나 필터를 바꿔보세요.
          </p>
        ) : (
          grouped.map((bucket) => (
            <section key={bucket.region}>
              <h4 className="sticky top-0 z-1 flex items-center justify-between gap-2 border-b border-border bg-muted/80 px-3.5 py-2 text-xs font-semibold backdrop-blur">
                {bucket.region}
                <span className="num font-medium text-muted-foreground">
                  {formatNumber(bucket.cafes.length)}개
                </span>
              </h4>
              <ul>
                {bucket.cafes.map((cafe) => {
                  const checked = value.includes(cafe.id);
                  const disabled = !checked && full;
                  return (
                    <li key={cafe.id} className="border-b border-border/60 last:border-0">
                      <label
                        className={cn(
                          "flex min-h-14 cursor-pointer items-center gap-3 px-3.5 py-2.5 transition-colors",
                          checked ? "bg-primary/5" : "hover:bg-muted/50",
                          disabled && "cursor-not-allowed opacity-45",
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          disabled={disabled}
                          onCheckedChange={() => toggle(cafe)}
                          aria-label={`${cafe.name} 선택`}
                        />
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="truncate text-sm font-medium">{cafe.name}</span>
                          <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                            <Badge variant="secondary" className="px-1.5 py-0 text-[11px]">
                              {cafe.subCategory}
                            </Badge>
                            {cafe.district && <span>{cafe.district}</span>}
                            <span className="num">회원 {formatNumber(cafe.members)}</span>
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>

      {full && !noLimit && (
        <p className="text-xs text-muted-foreground">
          주문 수량만큼 모두 선택했습니다. 다른 카페를 고르려면 선택한 카페를 먼저 해제해 주세요.
        </p>
      )}

      {/* 중복 카페 작업 안내 */}
      {notice && (
        <div className="flex items-start gap-2 rounded-xl bg-muted/60 p-3.5">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="min-w-0 text-[13px] leading-relaxed">
            <p>{notice}</p>
            {noticeExample && <p className="mt-0.5 text-muted-foreground">{noticeExample}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 선택 카페 요약 (주문 요약 · 확인 모달)                                */
/* ------------------------------------------------------------------ */

export function SelectedCafeList({
  names,
  className,
}: {
  names: string[];
  className?: string;
}) {
  if (names.length === 0) return null;
  return (
    <ol className={cn("flex flex-col gap-1", className)}>
      {names.map((name, i) => (
        <li key={`${name}-${i}`} className="flex gap-2 text-[13px]">
          <span className="num w-4 shrink-0 text-right text-muted-foreground">{i + 1}</span>
          <span className="min-w-0 flex-1 truncate">{name}</span>
        </li>
      ))}
    </ol>
  );
}

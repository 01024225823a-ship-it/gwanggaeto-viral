import type {
  AiBlogAspectRatio,
  AiBlogOutline,
  InfoVisualImage,
  InfoVisualPlan,
  InfoVisualStyle,
  InfoVisualType,
} from "@/lib/ai-blog/types";
import { sizeOf } from "@/lib/ai-blog/visual-design";

/**
 * 정보 이미지 카탈로그.
 *
 * "복잡한 실사 이미지 / AI 일러스트"가 아니라
 * "블로그 본문에 그대로 넣을 수 있는 전문 정보 카드"를 만드는 것이 목표다.
 *
 *   최종 원고 → Claude(정보 추출·재구성) → InfoVisualPlan → SVG/Canvas → PNG
 *
 * 이 파일은 그 경로에서 쓰는 선택지(유형·스타일·비율·수량)를 한곳에 모은다.
 * 화면·프롬프트·렌더러·Mock 이 모두 이 표를 공유해야 결과가 일관된다.
 */

/* ------------------------------------------------------------------ */
/* 유형                                                                 */
/* ------------------------------------------------------------------ */

export interface InfoVisualTypeSpec {
  id: InfoVisualType;
  label: string;
  /** 화면 설명 */
  description: string;
  /** 어떤 정보일 때 고르는지 (기획 프롬프트에 들어간다) */
  whenToUse: string;
  /** 이 유형이 반드시 채워야 하는 필드 */
  requires: "items" | "table" | "comparison" | "process" | "highlight" | "none";
}

/** 대표 이미지를 제외한 정보 이미지 6종 */
export const INFO_VISUAL_TYPES: InfoVisualTypeSpec[] = [
  {
    id: "summary",
    label: "핵심 요약형",
    description: "01·02 번호를 붙여 핵심만 정리합니다.",
    whenToUse: "주제 전체에서 꼭 알아야 할 항목이 3~4개로 정리될 때",
    requires: "items",
  },
  {
    id: "checklist",
    label: "체크리스트형",
    description: "독자가 하나씩 확인할 항목을 나열합니다.",
    whenToUse: "구매·선택·상담 전에 확인해야 할 것이 있을 때",
    requires: "items",
  },
  {
    id: "process",
    label: "단계·프로세스형",
    description: "순서대로 진행할 단계를 화살표로 잇습니다.",
    whenToUse: "먼저 할 것과 나중에 할 것의 순서가 분명할 때",
    requires: "process",
  },
  {
    id: "comparison",
    label: "비교형",
    description: "두 관점을 좌우로 나눠 대조합니다.",
    whenToUse: "흔한 오해와 실제 기준처럼 대조할 축이 있을 때",
    requires: "comparison",
  },
  {
    id: "table",
    label: "표·기준형",
    description: "기준과 확인 내용을 2열 표로 정리합니다.",
    whenToUse: "항목마다 대응하는 설명이 있어 표가 더 정확할 때",
    requires: "table",
  },
  {
    id: "number",
    label: "숫자 강조형",
    description: "핵심 숫자를 크게 보여주고 항목을 붙입니다.",
    whenToUse: "개수·기간·횟수처럼 숫자 하나로 각인시킬 수 있을 때",
    requires: "highlight",
  },
];

export const INFO_VISUAL_TYPE_IDS = INFO_VISUAL_TYPES.map((t) => t.id);

const TYPE_LABEL: Record<InfoVisualType, string> = {
  thumbnail: "대표 이미지",
  summary: "핵심 요약형",
  checklist: "체크리스트형",
  process: "단계·프로세스형",
  comparison: "비교형",
  table: "표·기준형",
  number: "숫자 강조형",
};

export function infoVisualTypeLabel(type: InfoVisualType): string {
  return TYPE_LABEL[type] ?? type;
}

/* ------------------------------------------------------------------ */
/* 스타일                                                               */
/* ------------------------------------------------------------------ */

export interface InfoVisualStyleSpec {
  id: InfoVisualStyle;
  label: string;
  description: string;
}

/**
 * 스타일 4종.
 * 레이아웃은 정보 유형이 정하고, 스타일은 색·여백·타이포·테두리만 바꾼다.
 */
export const INFO_VISUAL_STYLES: InfoVisualStyleSpec[] = [
  { id: "report", label: "전문 리포트", description: "네이비 헤더 · 흰 본문 · 얇은 구분선" },
  { id: "clean", label: "깔끔한 정보형", description: "화이트 배경 · 블루 포인트 · 둥근 카드" },
  { id: "premium", label: "프리미엄", description: "딥네이비 · 크림 · 뮤트 골드 · 넓은 여백" },
  { id: "friendly", label: "친근한 정보형", description: "소프트 블루 · 민트 · 둥근 요소" },
];

export function infoVisualStyleLabel(style: InfoVisualStyle): string {
  return INFO_VISUAL_STYLES.find((s) => s.id === style)?.label ?? style;
}

export const DEFAULT_INFO_STYLE: InfoVisualStyle = "report";

/** "다른 디자인" — 같은 정보를 다음 스타일로 다시 그린다 */
export function nextInfoStyle(style: InfoVisualStyle): InfoVisualStyle {
  const ids = INFO_VISUAL_STYLES.map((s) => s.id);
  const at = ids.indexOf(style);
  return ids[(at + 1) % ids.length] ?? DEFAULT_INFO_STYLE;
}

/* ------------------------------------------------------------------ */
/* 비율 · 해상도                                                        */
/* ------------------------------------------------------------------ */

/** 정보 이미지 비율 (첫 번째가 기본값) */
export const INFO_RATIO_OPTIONS: AiBlogAspectRatio[] = ["1:1", "4:5", "27:40", "9:16"];

/** 대표 이미지 비율 (첫 번째가 기본값) */
export const INFO_THUMBNAIL_RATIOS: AiBlogAspectRatio[] = ["4:3", "1:1"];

export const DEFAULT_INFO_RATIO: AiBlogAspectRatio = "1:1";
export const DEFAULT_INFO_THUMBNAIL_RATIO: AiBlogAspectRatio = "4:3";

const RATIO_NAME: Partial<Record<AiBlogAspectRatio, string>> = {
  "1:1": "정사각형",
  "4:5": "세로형",
  "27:40": "세로 인포그래픽",
  "9:16": "긴 세로형",
  "4:3": "가로형",
};

/** "정사각형 1080×1080" */
export function infoRatioLabel(ratio: AiBlogAspectRatio): string {
  const { width, height } = sizeOf(ratio);
  const name = RATIO_NAME[ratio] ?? ratio;
  return `${name} ${width}×${height}`;
}

/* ------------------------------------------------------------------ */
/* 장수 추천                                                            */
/* ------------------------------------------------------------------ */

/** 정보 이미지 장수 범위 (대표 이미지 제외) */
export const INFO_COUNT_MIN = 2;
export const INFO_COUNT_MAX = 6;

/**
 * 원고에서 시각화할 재료가 얼마나 있는지 센다.
 * 재료가 부족하면 장수를 억지로 늘리지 않는다.
 */
function materialScore(outline: AiBlogOutline): number {
  let score = 0;
  if (outline.checklist.length >= 3) score += 1;
  if (outline.tableRows.length >= 2) score += 1;
  if (outline.headings.length >= 4) score += 1;
  if (outline.faqs.length >= 3) score += 1;
  if (outline.summary.length >= 3) score += 1;
  return score;
}

/**
 * 정보 이미지 추천 장수 (대표 이미지 제외).
 *
 * 2,000자 → 4장 (대표 포함 5장)
 * 3,000자 → 5~6장 (대표 포함 6~7장)
 *
 * 규칙 기반이라 추가 API 호출이 없다.
 */
export function recommendInfoCount(outline: AiBlogOutline, articleLength: number): number {
  const chars = outline.charCount || articleLength;
  const material = materialScore(outline);

  let count = chars >= 3_000 ? 5 : chars >= 2_000 ? 4 : chars >= 1_200 ? 3 : 2;

  // 재료가 풍부한 장문이면 한 장 더
  if (chars >= 3_000 && material >= 4) count += 1;
  // 짧아도 표·체크리스트·FAQ 가 갖춰져 있으면 만들 거리가 충분하다
  if (material >= 4) count = Math.max(count, 3);
  // 시각화할 거리가 없으면 줄인다 — 같은 정보를 반복하지 않기 위해서다
  if (material <= 1) count = Math.min(count, 3);
  if (material === 0) count = Math.min(count, 2);

  return Math.min(INFO_COUNT_MAX, Math.max(INFO_COUNT_MIN, count));
}

export function clampInfoCount(value: number): number {
  return Math.min(INFO_COUNT_MAX, Math.max(INFO_COUNT_MIN, Math.round(value)));
}

/* ------------------------------------------------------------------ */
/* 기획 결과 정리                                                       */
/* ------------------------------------------------------------------ */

function trimItems(items: InfoVisualPlan["items"], max: number): InfoVisualPlan["items"] {
  return items
    .map((item) => ({ label: item.label.trim(), detail: item.detail?.trim() || undefined }))
    .filter((item) => item.label.length > 0)
    .slice(0, max);
}

/**
 * 유형과 내용이 어긋난 기획을 고친다.
 *
 * 예) type="table" 인데 표가 비어 있으면 요약형으로 내린다.
 * 렌더러가 빈 화면을 그리는 일이 없도록 여기서 한 번에 정리한다.
 */
export function sanitizeInfoPlan(plan: InfoVisualPlan): InfoVisualPlan {
  const items = trimItems(plan.items ?? [], 6);
  const process = trimItems(plan.process ?? [], 5);

  const table =
    plan.table && plan.table.rows.length > 0
      ? {
          headers: [
            plan.table.headers[0]?.trim() || "기준",
            plan.table.headers[1]?.trim() || "확인 내용",
          ] as [string, string],
          rows: plan.table.rows
            .map((row) => [row[0]?.trim() ?? "", row[1]?.trim() ?? ""] as [string, string])
            .filter((row) => row[0].length > 0)
            .slice(0, 6),
        }
      : undefined;

  const comparison =
    plan.comparison &&
    plan.comparison.left.items.length > 0 &&
    plan.comparison.right.items.length > 0
      ? {
          left: {
            title: plan.comparison.left.title.trim() || "이렇게 보이지만",
            items: plan.comparison.left.items.map((v) => v.trim()).filter(Boolean).slice(0, 5),
          },
          right: {
            title: plan.comparison.right.title.trim() || "이것을 확인하세요",
            items: plan.comparison.right.items.map((v) => v.trim()).filter(Boolean).slice(0, 5),
          },
        }
      : undefined;

  const base: InfoVisualPlan = {
    ...plan,
    title: plan.title.trim(),
    subtitle: plan.subtitle?.trim() || undefined,
    purpose: plan.purpose.trim(),
    items,
    table,
    comparison,
    process: process.length > 0 ? process : undefined,
    highlight: plan.highlight?.value.trim()
      ? { value: plan.highlight.value.trim(), caption: plan.highlight.caption.trim() }
      : undefined,
    sourceSections: (plan.sourceSections ?? []).map((s) => s.trim()).filter(Boolean).slice(0, 3),
  };

  // 대표 이미지는 정보를 나열하지 않는다
  if (base.type === "thumbnail") {
    return { ...base, items: [], table: undefined, comparison: undefined, process: undefined, highlight: undefined };
  }

  if (base.type === "table" && !base.table) {
    return { ...base, type: items.length > 0 ? "summary" : "checklist" };
  }
  if (base.type === "comparison" && !base.comparison) {
    return { ...base, type: "summary" };
  }
  if (base.type === "process" && !base.process) {
    return items.length > 0 ? { ...base, type: "process", process: items } : { ...base, type: "checklist" };
  }
  if (base.type === "number") {
    if (base.highlight) return base;
    // 숫자를 안 줬으면 항목 수로 대신한다
    if (items.length > 0) {
      return {
        ...base,
        highlight: { value: String(items.length), caption: base.subtitle ?? base.title },
      };
    }
    return { ...base, type: "checklist" };
  }
  if ((base.type === "summary" || base.type === "checklist") && items.length === 0) {
    if (base.table) return { ...base, type: "table" };
    if (base.process) return { ...base, type: "process" };
  }

  return base;
}

/**
 * 같은 유형이 과도하게 반복되지 않도록 순서를 조정한다.
 * (체크리스트 3장 연속 생성 금지 — 요구사항 9)
 */
export function diversifyInfoPlans(plans: InfoVisualPlan[]): InfoVisualPlan[] {
  const rest = [...plans];
  const out: InfoVisualPlan[] = [];

  while (rest.length > 0) {
    const last = out[out.length - 1]?.type;
    const before = out[out.length - 2]?.type;
    const repeated = last !== undefined && last === before;
    // 같은 유형이 두 번 연속이면, 다음은 다른 유형을 먼저 꺼낸다
    const at = repeated ? rest.findIndex((plan) => plan.type !== last) : -1;
    out.push(...rest.splice(at < 0 ? 0 : at, 1));
  }

  return out;
}

/** 기획 목록에 순번 ID 를 다시 매긴다 (수정 후에도 순서가 유지된다) */
export function withInfoPlanIds(plans: InfoVisualPlan[]): InfoVisualPlan[] {
  return plans.map((plan, i) => ({
    ...plan,
    id: plan.type === "thumbnail" ? "info-thumbnail" : `info-${i}`,
  }));
}

/* ------------------------------------------------------------------ */
/* 렌더 단위                                                            */
/* ------------------------------------------------------------------ */

/** 기획 + 스타일 + 비율 → 렌더러가 그리는 이미지 */
export function toInfoImage(
  plan: InfoVisualPlan,
  style: InfoVisualStyle,
  ratio: AiBlogAspectRatio,
): InfoVisualImage {
  const { width, height } = sizeOf(ratio);
  return { id: plan.id, plan, style, ratio, width, height, mimeType: "image/png" };
}

/** 기획 목록 → 이미지 목록 (대표 이미지만 비율이 다르다) */
export function toInfoImages(
  plans: InfoVisualPlan[],
  style: InfoVisualStyle,
  ratio: AiBlogAspectRatio,
  thumbnailRatio: AiBlogAspectRatio,
  styleOverrides: Record<string, InfoVisualStyle> = {},
): InfoVisualImage[] {
  return plans.map((plan) =>
    toInfoImage(
      plan,
      styleOverrides[plan.id] ?? style,
      plan.type === "thumbnail" ? thumbnailRatio : ratio,
    ),
  );
}

import { outlineFromDraft } from "@/lib/ai-blog/article";
import {
  diversifyInfoPlans,
  sanitizeInfoPlan,
  withInfoPlanIds,
} from "@/lib/ai-blog/info-visual";
import { extractSubject } from "@/lib/ai-blog/subject";
import type {
  AiBlogDraft,
  AiBlogOutline,
  InfoVisualItem,
  InfoVisualPlan,
  InfoVisualPlanRequest,
  InfoVisualPlanResult,
  InfoVisualReviseRequest,
  InfoVisualReviseResult,
  InfoVisualType,
} from "@/lib/ai-blog/types";
import { checkInfoVisualOverlap, createDraftCopyChecker } from "@/lib/ai-blog/visual-overlap";

/**
 * 정보 이미지 기획 — Mock 구현.
 *
 * AI_BLOG_PROVIDER=mock (오프라인 개발·장애 대응) 에서 쓴다.
 * 원고 아웃라인(소제목·체크리스트·표·요약)에서 규칙으로 정보를 뽑아 재구성한다.
 *
 * Claude 판단이 없으므로 표현이 단조롭지만, 화면·렌더러·다운로드 경로를
 * 실제 응답과 똑같은 구조로 검증할 수 있다.
 */

/** 문장을 짧은 라벨로 줄인다 (조사·꼬리말 제거) */
function toLabel(text: string, max = 10): string {
  const value = text
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/g, "")
    .replace(/^(그리고|또한|하지만|따라서)\s+/, "")
    .trim();

  const head = value.split(/[,·:—-]/)[0].trim();
  const words = head.split(" ");

  let out = "";
  for (const word of words) {
    const next = out ? `${out} ${word}` : word;
    if (next.length > max) break;
    out = next;
  }
  return (out || head).slice(0, max);
}

/** 한 줄 설명으로 줄인다 */
function toDetail(text: string, max = 30): string {
  const value = text.replace(/\s+/g, " ").replace(/[.!?]+$/g, "").trim();
  if (value.length <= max) return value;
  const sliced = value.slice(0, max);
  const at = sliced.lastIndexOf(" ");
  return (at >= Math.floor(max * 0.6) ? sliced.slice(0, at) : sliced).trim();
}

function toItems(rows: string[], count: number): InfoVisualItem[] {
  return rows
    .filter(Boolean)
    .slice(0, count)
    .map((row) => ({ label: toLabel(row), detail: toDetail(row) }))
    .filter((item) => item.label.length > 0);
}

/* ------------------------------------------------------------------ */
/* 원고 문장 복사 방지                                                  */
/* ------------------------------------------------------------------ */

/** 문장 꼬리(종결어미·조사)를 걷어내 명사구로 만든다 */
function toNounPhrase(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/g, "")
    .replace(/(습니다|합니다|입니다|하세요|해야 한다|한다|했다|이다|된다|않는다|있다)$/g, "")
    .replace(/(을|를|이|가|은|는|의|와|과)$/g, "")
    .trim();
}

/**
 * 원고 문장을 그대로 옮긴 문구를 짧은 안내형 표현으로 다시 쓴다.
 *
 * Mock 은 Claude 처럼 재기획을 요청할 수 없으므로, 규칙으로 표현을 바꾼다.
 * (요구사항 7 — 원고 문장을 이미지에 그대로 복사하지 않는다)
 */
function rewriteCopied(text: string, isCopied: (value: string) => boolean): string {
  if (!text || !isCopied(text)) return text;

  const core = toNounPhrase(text);
  for (const candidate of [`${core} 확인`, `${core} 여부`, core, core.slice(0, 12)]) {
    if (candidate && !isCopied(candidate)) return candidate;
  }
  return core.slice(0, 10);
}

/** 기획 한 장의 모든 문구를 원고와 대조해 겹치는 것만 다시 쓴다 */
function rewritePlan(plan: InfoVisualPlan, isCopied: (value: string) => boolean): InfoVisualPlan {
  const item = (row: InfoVisualItem): InfoVisualItem => ({
    label: rewriteCopied(row.label, isCopied),
    detail: row.detail ? rewriteCopied(row.detail, isCopied) : undefined,
  });

  return {
    ...plan,
    title: rewriteCopied(plan.title, isCopied),
    subtitle: plan.subtitle ? rewriteCopied(plan.subtitle, isCopied) : undefined,
    items: plan.items.map(item),
    process: plan.process?.map(item),
    table: plan.table
      ? {
          ...plan.table,
          rows: plan.table.rows.map(
            (row) =>
              [rewriteCopied(row[0], isCopied), rewriteCopied(row[1], isCopied)] as [string, string],
          ),
        }
      : undefined,
    comparison: plan.comparison
      ? {
          left: {
            title: plan.comparison.left.title,
            items: plan.comparison.left.items.map((value) => rewriteCopied(value, isCopied)),
          },
          right: {
            title: plan.comparison.right.title,
            items: plan.comparison.right.items.map((value) => rewriteCopied(value, isCopied)),
          },
        }
      : undefined,
  };
}

function rewritePlans(plans: InfoVisualPlan[], draft: AiBlogDraft): InfoVisualPlan[] {
  const isCopied = createDraftCopyChecker(draft);
  return plans.map((plan) => rewritePlan(plan, isCopied));
}

/* ------------------------------------------------------------------ */
/* 유형별 후보 만들기                                                   */
/* ------------------------------------------------------------------ */

interface Candidate {
  plan: InfoVisualPlan;
  /** 재료가 얼마나 확실한지 — 높은 것부터 채택한다 */
  score: number;
}

function candidatesOf(outline: AiBlogOutline, topic: string): Candidate[] {
  const out: Candidate[] = [];
  const subject = topic.replace(/\s+/g, " ").trim() || "이 주제";
  const base = { id: "", sourceSections: outline.headings.slice(0, 2) };

  if (outline.tableRows.length >= 2) {
    out.push({
      score: 5,
      plan: {
        ...base,
        type: "table",
        title: `${subject} 선택 기준`,
        subtitle: "표로 한번에 정리했습니다",
        purpose: "판단 기준과 확인 내용을 한눈에 대조한다",
        items: [],
        table: {
          headers: ["기준", "확인 내용"],
          rows: outline.tableRows
            .slice(0, 5)
            .map((row) => [toLabel(row[0], 8), toDetail(row[1], 26)] as [string, string]),
        },
      },
    });
  }

  if (outline.checklist.length >= 3) {
    out.push({
      score: 5,
      plan: {
        ...base,
        type: "checklist",
        title: `${subject} 선택 전 CHECK`,
        subtitle: "하나씩 확인해 보세요",
        purpose: "결정 전에 빠뜨리기 쉬운 항목을 짚어준다",
        items: toItems(outline.checklist, 5),
      },
    });
  }

  if (outline.summary.length >= 3) {
    out.push({
      score: 4,
      plan: {
        ...base,
        type: "summary",
        title: `${subject}, 이것부터 확인하세요`,
        subtitle: "핵심만 정리했습니다",
        purpose: "가장 먼저 알아야 할 것을 순서대로 정리한다",
        items: toItems(outline.summary, 4),
      },
    });
  }

  if (outline.headings.length >= 3) {
    const steps = toItems(outline.headings, 4);
    out.push({
      score: 3,
      plan: {
        ...base,
        type: "process",
        title: `${subject} 확인 순서`,
        subtitle: "이 순서대로 살펴보세요",
        purpose: "무엇을 먼저 확인해야 하는지 순서를 잡아준다",
        items: [],
        process: steps,
      },
    });

    out.push({
      score: 2,
      plan: {
        ...base,
        type: "number",
        title: `${subject} 핵심 기준`,
        subtitle: "숫자로 기억하세요",
        purpose: "확인할 기준의 개수를 각인시킨다",
        items: steps,
        highlight: { value: String(steps.length), caption: `${subject} 확인 핵심 기준` },
      },
    });
  }

  if (outline.faqs.length >= 2) {
    out.push({
      score: 2,
      plan: {
        ...base,
        type: "comparison",
        title: "이렇게 비교하세요",
        subtitle: "보이는 것과 확인할 것",
        purpose: "겉으로 드러난 정보와 실제 확인 기준을 나눠 본다",
        items: [],
        comparison: {
          left: {
            title: "흔히 보는 것",
            items: outline.faqs.slice(0, 3).map((faq) => toDetail(faq.question, 24)),
          },
          right: {
            title: "실제 확인할 것",
            items: outline.faqs.slice(0, 3).map((faq) => toDetail(faq.answer, 24)),
          },
        },
      },
    });
  }

  return out;
}

/** 후보가 모자랄 때 채우는 기본 카드 */
function fallbackPlan(outline: AiBlogOutline, topic: string, at: number): InfoVisualPlan {
  const pool = outline.summary.length > 0 ? outline.summary : outline.headings;
  const rotated = [...pool.slice(at), ...pool.slice(0, at)];
  const types: InfoVisualType[] = ["summary", "checklist", "process"];
  const type = types[at % types.length];

  const items = toItems(rotated, 4);
  return {
    id: "",
    type,
    title: `${topic} 핵심 정리 ${at + 1}`,
    subtitle: "본문에서 정리한 내용입니다",
    purpose: "원고의 핵심을 한 장으로 다시 정리한다",
    items: type === "process" ? [] : items,
    process: type === "process" ? items : undefined,
    sourceSections: outline.headings.slice(0, 1),
  };
}

/* ------------------------------------------------------------------ */
/* 기획                                                                 */
/* ------------------------------------------------------------------ */

export function planInfoVisualsWithMock(request: InfoVisualPlanRequest): InfoVisualPlanResult {
  const outline = outlineFromDraft(request.draft);
  // 제목에는 원고 제목 전체가 아니라 짧은 주제어를 쓴다 ("관절영양제가 필요한 이유" → "관절영양제")
  const topic = extractSubject(request.input.topic || outline.title, request.input.keywords);

  const picked = candidatesOf(outline, topic)
    .sort((a, b) => b.score - a.score)
    .map((candidate) => candidate.plan);

  const infos: InfoVisualPlan[] = [];
  for (let i = 0; infos.length < request.infoCount; i += 1) {
    const next = picked[i] ?? fallbackPlan(outline, topic, i - picked.length);
    infos.push(next);
    // 재료가 없는 원고에서 무한히 만들지 않도록 상한을 둔다
    if (i > 12) break;
  }

  const thumbnail: InfoVisualPlan[] = request.withThumbnail
    ? [
        {
          id: "",
          type: "thumbnail",
          title: `${topic}, 무엇부터 볼까?`,
          subtitle: `${request.input.target || "독자"}를 위해 확인해야 할 기준`,
          purpose: "주제를 한 줄로 각인시킨다",
          items: [],
          sourceSections: [],
        },
      ]
    : [];

  const plans = withInfoPlanIds(
    rewritePlans([...thumbnail, ...diversifyInfoPlans(infos)], request.draft).map(sanitizeInfoPlan),
  );

  return {
    plans,
    overlap: checkInfoVisualOverlap(plans, request.draft),
    source: "MOCK",
  };
}

/* ------------------------------------------------------------------ */
/* 개별 수정                                                            */
/* ------------------------------------------------------------------ */

/** 수정 요청 문구에서 유형 변경 의도를 읽는다 */
function requestedType(instruction: string): InfoVisualType | null {
  if (/표|테이블|table/i.test(instruction)) return "table";
  if (/체크|checklist/i.test(instruction)) return "checklist";
  if (/순서|단계|프로세스|process/i.test(instruction)) return "process";
  if (/비교|대조|comparison/i.test(instruction)) return "comparison";
  if (/숫자|number/i.test(instruction)) return "number";
  if (/요약|정리|summary/i.test(instruction)) return "summary";
  return null;
}

/** 항목 수 변경 요청 (예: "4개에서 3개로 줄여줘") */
function requestedCount(instruction: string): number | null {
  const matches = [...instruction.matchAll(/(\d+)\s*개/g)].map((m) => Number(m[1]));
  const last = matches[matches.length - 1];
  return Number.isFinite(last) && last >= 2 && last <= 6 ? last : null;
}

export function reviseInfoVisualWithMock(
  request: InfoVisualReviseRequest,
): InfoVisualReviseResult {
  const instruction = (request.instruction ?? "").trim();
  const outline = outlineFromDraft(request.draft);
  const topic = extractSubject(request.input.topic || outline.title, request.input.keywords);
  const finish = (plan: InfoVisualPlan): InfoVisualReviseResult => ({
    plan: sanitizeInfoPlan(rewritePlans([{ ...plan, id: request.plan.id }], request.draft)[0]),
    source: "MOCK",
  });

  // 수정 요청이 없으면 다른 후보로 갈아 끼운다 ("다시 만들기")
  if (!instruction) {
    const taken = new Set([request.plan.title, ...(request.siblingTitles ?? [])]);
    const others = candidatesOf(outline, topic)
      .map((candidate) => candidate.plan)
      .filter((plan) => !taken.has(plan.title));
    return finish(others[0] ?? fallbackPlan(outline, topic, 1));
  }

  let next: InfoVisualPlan = { ...request.plan };

  const type = requestedType(instruction);
  if (type && request.plan.type !== "thumbnail") {
    const source = candidatesOf(outline, topic).find((c) => c.plan.type === type)?.plan;
    next = source ? { ...source, id: request.plan.id } : { ...next, type };
  }

  const count = requestedCount(instruction);
  if (count) {
    next = {
      ...next,
      items: next.items.slice(0, count),
      process: next.process?.slice(0, count),
      table: next.table ? { ...next.table, rows: next.table.rows.slice(0, count) } : undefined,
    };
  }

  if (/제목.*(짧|간단)/.test(instruction)) {
    next = { ...next, title: toLabel(next.title, 14) };
  }

  return finish(next);
}

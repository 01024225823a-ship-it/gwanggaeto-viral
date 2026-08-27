/**
 * [LEGACY] 실사·일러스트 비주얼 파이프라인.
 *
 * AI 블로그 **기본** 이미지 제작 경로는 정보 이미지로 대체됐다.
 *   최종 원고 → InfoVisualPlan (lib/ai-blog/info-visual.ts)
 *             → SVG/Canvas (render/info-layout.ts) → PNG
 *
 * 이 모듈은 기본 경로에서 호출하지 않는다.
 * 향후 별도 "비주얼 이미지" 기능을 다시 붙일 때를 위해 삭제하지 않고 유지한다.
 */

import { outlineFromDraft } from "@/lib/ai-blog/article";
import { playbookOf } from "@/lib/ai-blog/playbooks";
import { extractSubject, josa, stripParticle } from "@/lib/ai-blog/subject";
import type {
  AiBlogImageType,
  AiBlogOutline,
  ArticleVisualPlan,
  CardNewsPlan,
  InfographicPlan,
  ThumbnailPlan,
  VisualCard,
  VisualPlan,
  VisualPlanItem,
  VisualPlanRequest,
  VisualPlanResult,
  VisualPlanSet,
} from "@/lib/ai-blog/types";
import { checkVisualOverlap, planTexts } from "@/lib/ai-blog/visual-overlap";

/**
 * 이미지 콘텐츠 기획 Mock (AI_BLOG_PROVIDER=mock 용).
 *
 * 실제 기획은 Claude가 원고를 읽고 새로운 관점을 잡지만, Mock 은 그럴 수 없다.
 * 대신 원고에서 뽑은 재료를 **짧은 라벨과 한 줄 설명으로 다시 압축**해
 * 본문 문장을 그대로 옮기지 않도록 만든다.
 *
 * 생성 후 중복 검사를 돌려, 그래도 원고와 겹치는 표현이 남으면 더 줄인다.
 * 품질은 Claude 기획에 못 미치므로 오프라인 개발·장애 대응용으로만 쓴다.
 */

/* ------------------------------------------------------------------ */
/* 문장 압축                                                            */
/* ------------------------------------------------------------------ */

/** 문장을 이미지에 들어갈 한 줄로 줄인다 */
function condense(text: string, max = 24): string {
  let value = text
    .replace(/^[-*\s]*(?:\[[ xX]\]\s*)?/, "")
    .replace(/^\d+\.\s*/, "")
    .trim();

  value = value
    .replace(/(?:했|하셨|해\s*봤|확인했|살펴봤)나요\s*\?$/, "")
    .replace(/[.?!]+$/, "")
    .replace(/(?:해야 합니다|하는 것이 좋습니다|하시기 바랍니다|합니다|하세요|됩니다|입니다)$/, "")
    .trim();

  const head = value.split(/[,·]|\s및\s/)[0].trim();
  const base = head.length >= 6 ? head : value;
  return base.length <= max ? base : cutAtWord(base, max);
}

/** 단어 중간에서 끊기지 않도록 마지막 공백에서 자른다 */
function cutAtWord(text: string, max: number): string {
  const sliced = text.slice(0, max);
  const at = sliced.lastIndexOf(" ");
  return (at >= Math.floor(max * 0.5) ? sliced.slice(0, at) : sliced).trim();
}

/**
 * 표의 라벨처럼 이미 짧은 문구를 그대로 쓰기 위한 정리.
 * 문장을 잘라 조각난 제목을 만들지 않는다 — 순번 라벨을 쓰는 편이 낫다.
 */
function shortLabel(text: string, max = 12): string {
  return condense(text, max);
}

/** 문장에서 의미가 옅은 낱말 */
const FILLER = new Set([
  "직접","함께","다시","반드시","미리","같은","그것","이것","저것","등","경우","때문","우선","가장",
  // 앞말이 잘리면 뜻이 없어지는 연결 어절
  "있는","있다면","없는지","하는","되는","이어갈","해야","하면",
]);

/**
 * 중복으로 걸린 문장을 "키워드 조합"으로 다시 쓴다.
 * 문장을 중간에서 자르면 뜻이 끊기므로, 뒤쪽 핵심 낱말만 남긴다.
 * 예) "포장·상세페이지의 기능성 문구를 직접 확인" → "기능성 문구 확인"
 */
function keywordize(text: string, max = 14): string {
  const tokens = text
    .replace(/[.?!]+$/, "")
    .split(/[\s·,]+/)
    .map(stripParticle)
    .filter((token) => token.length >= 2 && !FILLER.has(token));

  const joined = tokens.slice(-3).join(" ");
  if (!joined) return condense(text, max);
  return joined.length <= max ? joined : cutAtWord(joined, max);
}

/** 중복으로 걸린 표현을 원고와 겹치지 않게 다시 쓴다 */
function shrink(text: string): string {
  return keywordize(text);
}

/** 마무리 문단의 ①②③ 순서를 단계 재료로 뽑는다 (원고 소제목 복사를 피하기 위함) */
function extractOrderedSteps(body: string): string[] {
  const matches = body.match(/[①②③④⑤⑥⑦⑧⑨][^①②③④⑤⑥⑦⑧⑨\n]+/g) ?? [];
  return matches
    .map((chunk) =>
      chunk
        .replace(/^[①②③④⑤⑥⑦⑧⑨]\s*/, "")
        .replace(/\s*순으로.*$/, "")
        .replace(/[.?!]+$/, "")
        .trim(),
    )
    .filter((step) => step.length >= 3);
}

/* ------------------------------------------------------------------ */
/* 기획안 구성                                                          */
/* ------------------------------------------------------------------ */

interface MockContext {
  subject: string;
  target: string;
  field: string;
  outline: AiBlogOutline;
  /** 원고 본문 (마무리의 순서 표기를 뽑는 데 쓴다) */
  body: string;
}

function toItems(sources: Array<[string, string]>, count: number): VisualPlanItem[] {
  return sources
    .slice(0, count)
    .map(([title, description]) => ({ title, description: condense(description, 30) }))
    .filter((item) => item.title.length > 0 && item.description.length > 0);
}

function infographicIdeas(c: MockContext): InfographicPlan[] {
  const { outline, subject, target, field } = c;
  const avoid = ["본문 소제목 문장 그대로 사용 금지", "본문 문단 복사 금지"];

  // 표 라벨은 이미 짧아 그대로 쓰고, 문장형 재료는 순번 라벨을 붙인다
  // (문장을 잘라 만든 조각을 제목으로 쓰지 않기 위함)
  const criteriaSource: Array<[string, string]> = outline.tableRows.map(([a, b]) => [
    shortLabel(a),
    b,
  ]);

  const checkSource: Array<[string, string]> = outline.checklist.map((item, i) => [
    `0${i + 1}`,
    item,
  ]);

  // 원고 소제목을 그대로 옮기지 않도록, 마무리의 ①②③ 순서를 우선 재료로 쓴다
  const ordered = extractOrderedSteps(c.body);
  const stepSource: Array<[string, string]> = (
    ordered.length >= 3 ? ordered : outline.headings.map((h) => keywordize(h, 20))
  ).map((step, i) => [`${i + 1}단계`, step]);

  const fallback: Array<[string, string]> = outline.summary.map((item, i) => [`0${i + 1}`, item]);

  return [
    {
      id: "infographic-criteria",
      type: "infographic",
      concept: `${subject} 선택 기준`,
      goal: "무엇을 보고 판단할지 한 장으로 확인",
      headline: `${subject} 확인할 ${Math.max(3, Math.min(5, criteriaSource.length || 4))}가지`,
      subheadline: `${field} 판단 기준 정리`,
      visualType: "criteria",
      items: toItems(criteriaSource.length > 0 ? criteriaSource : fallback, 5),
      footer: "자세한 내용은 본문에서 확인하세요.",
      avoidOverlap: avoid,
    },
    {
      id: "infographic-check",
      type: "infographic",
      concept: `${target} 점검표`,
      goal: "독자가 자기 상황을 빠르게 점검",
      headline: `${target}, 이 항목부터 확인하세요`,
      subheadline: `${subject} 확인 전 자가 점검`,
      visualType: "numbers",
      items: toItems(checkSource.length > 0 ? checkSource : fallback, 5),
      footer: "본 이미지는 참고용 점검표입니다.",
      avoidOverlap: avoid,
    },
    {
      id: "infographic-steps",
      type: "infographic",
      concept: `${subject} 확인 순서`,
      goal: "무엇부터 해야 하는지 순서로 안내",
      headline: `${josa(subject, "을를")} 확인하는 순서`,
      subheadline: "위에서 아래로 따라가면 됩니다",
      visualType: "steps",
      items: toItems(stepSource.length > 0 ? stepSource : fallback, 5),
      footer: "",
      avoidOverlap: avoid,
    },
  ];
}

interface CardEntry {
  head: string;
  body: string;
}

/** 카드 재료 — 같은 내용이 반복되지 않도록 여러 출처를 모아둔다 */
function cardPool(outline: AiBlogOutline): CardEntry[] {
  return [
    ...outline.tableRows.map(([a, b]) => ({ head: shortLabel(a, 16), body: condense(b, 40) })),
    ...outline.checklist.map((item, i) => ({ head: `체크 ${i + 1}`, body: condense(item, 40) })),
    ...outline.summary.map((item, i) => ({ head: `포인트 ${i + 1}`, body: condense(item, 40) })),
  ].filter((entry) => entry.head.length > 0 && entry.body.length > 0);
}

function buildCards(
  entries: CardEntry[],
  count: number,
  direction: string,
  closing: CardEntry,
): VisualCard[] {
  return Array.from({ length: count }, (_, i) => {
    const isLast = i === count - 1;
    const entry = isLast ? closing : (entries[i] ?? closing);
    return {
      page: i + 1,
      headline: condense(entry.head, 20),
      body: condense(entry.body, 40),
      visualDirection: direction,
    };
  });
}

function cardNewsIdeas(c: MockContext, cardCount: number): CardNewsPlan[] {
  const { outline, subject, target } = c;
  const avoid = ["본문 소제목 문장 그대로 사용 금지", "본문 문단 복사 금지"];
  const pool = cardPool(outline);

  const closing: CardEntry = {
    head: "한눈에 정리",
    body: `${subject} 확인 순서를 저장해두고 하나씩 확인해 보세요.`,
  };

  const questionHeads = [
    `${subject}, 왜 챙길까?`,
    "먼저 볼 것",
    "확인 기준",
    "놓치기 쉬운 부분",
    "함께 챙길 것",
    "다음 단계",
    "마지막 점검",
  ];

  const questionEntries: CardEntry[] = questionHeads.map((head, i) => ({
    head,
    body: pool[i]?.body ?? "",
  }));

  const checkEntries: CardEntry[] = pool.filter((entry) => entry.head.startsWith("체크"));
  const criteriaEntries: CardEntry[] = pool.filter(
    (entry) => !entry.head.startsWith("체크") && !entry.head.startsWith("포인트"),
  );

  return [
    {
      id: "cardnews-question",
      type: "cardnews",
      concept: `${subject} 질문형 스토리`,
      goal: "원고를 읽지 않아도 흐름이 이해되도록 구성",
      cards: buildCards(questionEntries, cardCount, "아이콘 중심의 단순한 일러스트", closing),
      avoidOverlap: avoid,
    },
    {
      id: "cardnews-checklist",
      type: "cardnews",
      concept: `${target} 체크리스트`,
      goal: "저장해두고 하나씩 확인할 수 있게 구성",
      cards: buildCards(
        [...checkEntries, ...pool],
        cardCount,
        "체크박스와 라벨 중심의 카드",
        closing,
      ),
      avoidOverlap: avoid,
    },
    {
      id: "cardnews-criteria",
      type: "cardnews",
      concept: `${subject} 기준 비교`,
      goal: "판단 기준을 항목별로 나눠 보여주기",
      cards: buildCards(
        [...criteriaEntries, ...pool],
        cardCount,
        "좌우 대비가 분명한 2단 레이아웃",
        closing,
      ),
      avoidOverlap: avoid,
    },
  ];
}

/**
 * 본문 비주얼 기획 — 소제목마다 하나씩, 상황·분위기 중심으로.
 * 정보를 나열하지 않으므로 원고 문장과 겹칠 일이 거의 없다.
 */
function articleIdeas(c: MockContext, count: number): ArticleVisualPlan[] {
  const { outline, subject, target, field } = c;
  const headings = outline.headings.length > 0 ? outline.headings : [c.subject];

  const scenes = [
    { purpose: "본문 이해 보조", scene: "일상 속에서 관련 상황을 마주하는 장면", mood: "밝고 현실적인 정보 콘텐츠" },
    { purpose: "개념 이해 보조", scene: "핵심 개념을 단순화해 보여주는 정보 일러스트", mood: "차분하고 정돈된 설명 톤" },
    { purpose: "확인 행동 보조", scene: "표시사항이나 자료를 직접 확인하는 장면", mood: "실용적이고 구체적인 분위기" },
    { purpose: "생활 관리 보조", scene: "평소 생활에서 관리하는 모습", mood: "따뜻하고 편안한 일상 톤" },
    { purpose: "판단 보조", scene: "선택지를 비교해 보는 장면", mood: "명료하고 담백한 분위기" },
  ];

  return Array.from({ length: count }, (_, i) => {
    const preset = scenes[i % scenes.length];
    return {
      id: `article-${i + 1}`,
      type: "article" as const,
      concept: `본문 비주얼 ${i + 1}`,
      goal: `${headings[i % headings.length]} 문단의 이해를 돕는다`,
      avoidOverlap: ["원고 문장을 이미지에 넣지 않음", "정보 나열 금지"],
      afterHeading: headings[i % headings.length],
      purpose: preset.purpose,
      subject: `${target}을 떠올리게 하는 ${field} 상황`,
      scene: preset.scene,
      mood: preset.mood,
      visualDirection: `${subject}와 연결되는 단순한 일러스트, 사람 얼굴 클로즈업과 제품 패키지는 제외`,
      textOverlay: undefined,
    };
  });
}

function thumbnailIdeas(c: MockContext): ThumbnailPlan[] {
  const { subject, target, field } = c;
  const avoid = ["본문 문장 복사 금지", "설명 문장 나열 금지"];

  return [
    {
      id: "thumbnail-question",
      type: "thumbnail",
      concept: "질문형",
      goal: "독자가 자기 상황을 떠올리게 만들기",
      headline: `${subject}, 무엇부터 확인할까?`,
      subheadline: `${josa(target, "을를")} 위한 기준 정리`,
      avoidOverlap: avoid,
    },
    {
      id: "thumbnail-number",
      type: "thumbnail",
      concept: "숫자형",
      goal: "정보량을 숫자로 예고해 클릭 유도",
      headline: `${subject} 확인할 4가지`,
      subheadline: `${field} 선택 기준`,
      avoidOverlap: avoid,
    },
    {
      id: "thumbnail-target",
      type: "thumbnail",
      concept: "대상형",
      goal: "타깃 독자를 직접 호명해 관심 유도",
      headline: `${josa(target, "을를")} 위한 ${subject}`,
      subheadline: "확인 순서와 판단 기준",
      avoidOverlap: avoid,
    },
  ];
}

/* ------------------------------------------------------------------ */
/* 진입점                                                               */
/* ------------------------------------------------------------------ */

/** 중복으로 걸린 표현을 더 줄여 원고와 겹치지 않게 만든다 */
function resolveOverlap(plan: VisualPlan, duplicates: Set<string>): VisualPlan {
  if (plan.type === "infographic") {
    return {
      ...plan,
      headline: duplicates.has(plan.headline) ? shrink(plan.headline) : plan.headline,
      subheadline: duplicates.has(plan.subheadline) ? shrink(plan.subheadline) : plan.subheadline,
      items: plan.items.map((item) => ({
        title: duplicates.has(item.title) ? shrink(item.title) : item.title,
        description: duplicates.has(item.description) ? shrink(item.description) : item.description,
      })),
      footer: duplicates.has(plan.footer) ? shrink(plan.footer) : plan.footer,
    };
  }
  if (plan.type === "article") return plan;
  if (plan.type === "cardnews") {
    return {
      ...plan,
      cards: plan.cards.map((card) => ({
        ...card,
        headline: duplicates.has(card.headline) ? shrink(card.headline) : card.headline,
        body: duplicates.has(card.body) ? shrink(card.body) : card.body,
      })),
    };
  }
  return {
    ...plan,
    headline: duplicates.has(plan.headline) ? shrink(plan.headline) : plan.headline,
    subheadline: duplicates.has(plan.subheadline) ? shrink(plan.subheadline) : plan.subheadline,
  };
}

export function planVisualsWithMock(request: VisualPlanRequest): VisualPlanResult {
  const outline = outlineFromDraft(request.draft);
  const playbook = playbookOf(request.input.category);

  const context: MockContext = {
    subject: extractSubject(request.input.topic, request.input.keywords),
    target: request.input.target.split(/[,·/]/)[0].trim() || "독자",
    field: playbook.field,
    outline,
    body: request.draft.body,
  };

  const byType: Record<AiBlogImageType, VisualPlan[]> = {
    infographic: infographicIdeas(context),
    cardnews: cardNewsIdeas(context, request.cardCount),
    thumbnail: thumbnailIdeas(context),
    article: articleIdeas(context, Math.max(1, request.articleCount)),
  };

  // 이미 본 기획안은 제외한다 ("다른 아이디어 추천")
  const excluded = new Set(request.exclude ?? []);

  const plans: VisualPlanSet = {};
  for (const type of request.types) {
    const ideas = byType[type].filter((plan) => !excluded.has(plan.concept));
    plans[type] = ideas.length > 0 ? ideas : byType[type];
  }

  // 원고와 겹치는 표현이 남았으면 더 줄인다
  const flat = Object.values(plans).flat();
  const first = checkVisualOverlap(flat, request.draft);
  if (!first.ok) {
    const duplicates = new Set(first.duplicates);
    for (const type of Object.keys(plans) as AiBlogImageType[]) {
      plans[type] = plans[type]?.map((plan) => resolveOverlap(plan, duplicates));
    }
  }

  return {
    plans,
    overlap: checkVisualOverlap(Object.values(plans).flat(), request.draft),
    source: "MOCK",
  };
}

/** 기획안이 비어 있지 않은지 (빈 원고 방어) */
export function hasUsablePlan(plan: VisualPlan): boolean {
  return planTexts(plan).some((text) => text.trim().length > 0);
}

import {
  AI_BLOG_IMAGE_TYPES,
  categoryLabel,
  imageRatioOf,
  imageStyleLabel,
  imageTypeLabel,
} from "@/lib/ai-blog/options";
import type {
  AiBlogAspectRatio,
  AiBlogImagePrompt,
  AiBlogImageRequest,
  AiBlogImageStyle,
  AiBlogImageType,
  AiBlogInput,
  CardNewsPlan,
  CardNewsPrompt,
  InfographicPlan,
  InfographicPrompt,
  ThumbnailPlan,
  ThumbnailPrompt,
  VisualPlanRequest,
  VisualType,
} from "@/lib/ai-blog/types";

/**
 * 이미지 콘텐츠 기획 · 이미지 생성 프롬프트.
 *
 * 두 단계로 나뉜다.
 *   1) 기획 프롬프트  : 최종 원고를 AI에게 주고 "이미지로 만들 관점"을 기획시킨다
 *   2) 이미지 프롬프트: 기획 결과(VisualPlan)를 실제 이미지 생성용 문장으로 바꾼다
 *
 * 2단계는 원고를 전혀 참조하지 않는다. 이미지에 들어갈 내용은 전부 기획안에서 나온다.
 * (원고 문장을 그대로 옮겨 이미지가 본문 요약이 되는 문제를 여기서 구조적으로 막는다)
 */

/* ------------------------------------------------------------------ */
/* 1단계 — 이미지 콘텐츠 기획 프롬프트                                  */
/* ------------------------------------------------------------------ */

/** 한 번에 추천할 기획안 개수 */
export const VISUAL_IDEA_COUNT = 3;

const ROLE_SPLIT = [
  "[원고와 이미지의 역할 분리]",
  "원고가 맡는 것 : 상세 설명, 이유와 근거, 문맥, 전문 정보",
  "이미지가 맡는 것 : 핵심 판단 기준, 체크리스트, 비교, 순서·프로세스, 한눈에 보는 요약,",
  "               독자가 저장(캡처)하고 싶어지는 정보",
  "",
  "이미지는 원고의 요약본이 아니라 원고를 보완하는 별도의 콘텐츠입니다.",
  "독자가 본문에서 이미 읽은 문장을 이미지에서 또 보게 만들지 마세요.",
].join("\n");

const FACT_RULE = [
  "[사실 범위]",
  "원고에 없는 사실을 새로 만들지 마세요. 특히 의학·법률·금융 수치나 근거를 임의로 추가하지 않습니다.",
  "다만 원고에서 확인 가능한 내용을 아래처럼 재구성하는 것은 허용합니다.",
  "- 체크리스트로 만들기",
  "- 비교표로 만들기",
  "- 단계·순서로 만들기",
  "- 질문형으로 바꾸기",
  "- 핵심 판단 기준만 뽑아내기",
  "- 독자 행동 가이드로 바꾸기",
].join("\n");

const COPY_RULE = [
  "[문장 재작성 규칙]",
  "원고 문장을 그대로 복사하지 마세요. 원고 소제목을 그대로 쓰지도 마세요.",
  "같은 의미를 더 짧고 시각적인 표현으로 다시 씁니다.",
  "",
  "예)",
  '원고 : "관절 건강기능식품을 선택할 때는 기능성 원료와 1일 섭취량을 함께 확인해야 합니다."',
  '이미지 : title "기능성·섭취량" / description "인정받은 기능성 원료와 1일 섭취량을 함께 확인"',
].join("\n");

const TYPE_GUIDE: Record<AiBlogImageType, string> = {
  infographic: [
    "[인포그래픽 기획 지침]",
    "글 전체를 요약하지 마세요. 주제와 관련된 '하나의 핵심 질문'을 시각적으로 해결하는 한 장을 만듭니다.",
    "headline 은 독자가 자기 상황을 바로 대입할 수 있는 문장으로 씁니다.",
    "items 는 4~5개, title 은 2~8자 라벨, description 은 한 줄(25자 내외)로 씁니다.",
    "visualType 은 내용에 가장 맞는 형태를 고릅니다.",
    "  checklist(확인 항목) / steps(순서) / comparison(비교) / numbers(숫자) / signals(신호 점검) / criteria(판단 기준)",
    "footer 에는 분야에 필요한 안내 문구를 짧게 넣습니다. 필요 없으면 빈 문자열.",
  ].join("\n"),
  cardnews: [
    "[카드뉴스 기획 지침]",
    "원고 소제목을 그대로 카드로 나누지 마세요.",
    "원고를 읽지 않은 사람도 이 카드뉴스만으로 이해되도록 독립적인 스토리를 새로 구성합니다.",
    "1장은 질문이나 상황 제시로 시작해 궁금증을 만들고, 마지막 장은 정리·행동 유도로 닫습니다.",
    "headline 은 두 줄 이내로 짧게, body 는 40자 내외로 씁니다.",
    "visualDirection 에는 그 장에 어울리는 그림 방향을 한 줄로 적습니다(사람 얼굴·로고 제외).",
  ].join("\n"),
  thumbnail: [
    "[대표 이미지 기획 지침]",
    "정보 전달이 아니라 클릭과 주제 인지가 목적입니다. 텍스트를 최소화하세요.",
    "headline 은 두세 어절씩 끊어 읽히는 짧은 문구(20자 내외), subheadline 은 한 줄(20자 내외)로 씁니다.",
    "본문 내용을 길게 넣지 마세요.",
  ].join("\n"),
};

/** 이미지 기획 시스템 프롬프트 */
export function buildVisualPlanSystemPrompt(type: AiBlogImageType): string {
  return [
    "당신은 블로그 콘텐츠를 시각 자료로 재구성하는 한국어 정보 디자이너입니다.",
    "원고를 읽고, 그 원고를 '보완하는' 이미지 콘텐츠를 기획합니다.",
    "",
    ROLE_SPLIT,
    "",
    TYPE_GUIDE[type],
    "",
    COPY_RULE,
    "",
    FACT_RULE,
    "",
    "[기획 판단]",
    "기획 전에 스스로 다음을 정리한 뒤 결과에 반영하세요.",
    "- 원고의 핵심 주제는 무엇인가",
    "- 독자가 가장 궁금해할 부분은 어디인가",
    "- 본문 중 이미지로 보여주면 이해가 빨라지는 내용은 무엇인가",
    "- 본문과 중복을 피하려면 어떤 관점을 새로 잡아야 하는가",
    "- 이 주제에는 숫자·단계·비교·체크리스트·프로세스 중 무엇이 맞는가",
    "- 이미지에서 가장 강조할 한 가지 메시지는 무엇인가",
    "",
    `서로 다른 관점의 기획안 ${VISUAL_IDEA_COUNT}개를 제안하세요. 세 안은 접근 각도가 달라야 합니다.`,
    "concept 은 사용자가 목록에서 고를 수 있도록 12자 내외의 짧은 이름으로 씁니다.",
  ].join("\n");
}

/** 이미지 기획 프롬프트(user 메시지) */
export function buildVisualPlanPrompt(
  type: AiBlogImageType,
  request: VisualPlanRequest,
): string {
  const { draft, input } = request;

  const exclude =
    request.exclude && request.exclude.length > 0
      ? `\n[이미 제안된 기획안 — 다른 각도로 제안할 것]\n${request.exclude.map((c) => `- ${c}`).join("\n")}`
      : "";

  const cardCount =
    type === "cardnews" ? `\n[카드 장수] 정확히 ${request.cardCount}장으로 구성` : "";

  return [
    `[만들 이미지] ${imageTypeLabel(type)}`,
    `[주제] ${input.topic}`,
    `[타깃 독자] ${input.target || "일반 독자"}`,
    `[업종/분야] ${categoryLabel(input.category)}`,
    `[핵심 키워드] ${input.keywords.join(", ") || "지정 없음"}`,
    cardCount,
    exclude,
    "",
    "[최종 원고 — 이 내용을 분석하되, 문장을 그대로 옮기지 말 것]",
    `제목: ${draft.title}`,
    "",
    draft.body,
  ]
    .filter(Boolean)
    .join("\n");
}

/** 중복이 발견됐을 때 다시 기획을 요청하는 문구 */
export function buildOverlapRetryNote(duplicates: string[]): string {
  return [
    "",
    "[재기획 요청] 직전 결과에 원고 문장을 그대로 옮긴 부분이 있었습니다.",
    ...duplicates.slice(0, 6).map((text) => `- ${text}`),
    "위 표현은 쓰지 말고, 같은 의미를 더 짧고 시각적인 표현으로 다시 써 주세요.",
  ].join("\n");
}

/* ------------------------------------------------------------------ */
/* 2단계 — 이미지 생성 프롬프트                                         */
/* ------------------------------------------------------------------ */

export interface PromptContext {
  input: AiBlogInput;
  style: AiBlogImageStyle;
  ratio: AiBlogAspectRatio;
}

const STYLE_DIRECTION: Record<AiBlogImageStyle, string> = {
  business: "네이비·차콜 계열의 차분한 비즈니스 톤, 정돈된 그리드, 절제된 아이콘",
  clean: "화이트 배경에 여백이 넉넉한 정보형 레이아웃, 블루 포인트 컬러",
  warm: "베이지·소프트 오렌지 계열의 따뜻한 라이프스타일 톤, 둥근 모서리",
  minimal: "무채색 위주의 모던 미니멀, 얇은 구분선과 큰 타이포그래피",
  news: "뉴스 리포트 톤, 굵은 헤드라인과 상단 컬러 바",
};

/** 시각화 형태별 레이아웃 지시 */
const VISUAL_TYPE_LAYOUT: Record<VisualType, string> = {
  checklist: "좌측 체크박스 + 우측 라벨과 한 줄 설명을 세로로 정렬",
  steps: "번호가 붙은 단계를 위에서 아래로 배치하고 단계 사이를 화살표로 연결",
  comparison: "좌우 2단 대조 레이아웃, 같은 항목을 같은 높이에 맞춰 비교",
  numbers: "큰 숫자를 먼저 보여주고 그 아래에 설명을 작게 배치",
  signals: "점검할 신호를 아이콘 + 라벨 카드로 나열",
  criteria: "기준 라벨을 굵게, 확인 방법을 그 아래 한 줄로 배치",
};

function commonDirections(ctx: PromptContext): string[] {
  return [
    `- 디자인 스타일: ${imageStyleLabel(ctx.style)} (${STYLE_DIRECTION[ctx.style]})`,
    `- 이미지 비율: ${ctx.ratio}`,
    `- 업종/분야: ${categoryLabel(ctx.input.category)}`,
    "- 모든 텍스트는 한국어로, 맞춤법에 맞게 정확히 렌더링할 것",
    "- 사람 얼굴, 실제 브랜드 로고, 읽을 수 없는 가짜 문자를 넣지 말 것",
    "- 아래에 적힌 문구만 사용하고 임의로 문장을 덧붙이지 말 것",
  ];
}

/** 기획안 → 인포그래픽 생성 프롬프트 */
export function generateInfographicPrompt(
  plan: InfographicPlan,
  ctx: PromptContext,
): InfographicPrompt {
  const text = [
    "한국어 정보성 인포그래픽 1장을 디자인하세요.",
    "",
    `[기획 의도] ${plan.concept} — ${plan.goal}`,
    "",
    `[메인 문구] ${plan.headline}`,
    plan.subheadline ? `[보조 문구] ${plan.subheadline}` : "",
    "",
    "[구성 항목]",
    ...plan.items.map((item, i) => `${i + 1}. ${item.title} — ${item.description}`),
    plan.footer ? `\n[하단 문구] ${plan.footer}` : "",
    "",
    "[레이아웃]",
    `- ${VISUAL_TYPE_LAYOUT[plan.visualType]}`,
    "- 상단 메인 문구 → 구성 항목 → 하단 문구 순의 세로 흐름",
    "",
    "[디자인 조건]",
    ...commonDirections(ctx),
  ]
    .filter(Boolean)
    .join("\n");

  return {
    type: "infographic",
    planId: plan.id,
    concept: plan.concept,
    headline: plan.headline,
    subheadline: plan.subheadline,
    visualType: plan.visualType,
    items: plan.items,
    footer: plan.footer,
    style: ctx.style,
    styleLabel: imageStyleLabel(ctx.style),
    ratio: ctx.ratio,
    text,
  };
}

/** 기획안 → 카드뉴스 생성 프롬프트 */
export function generateCardNewsPrompt(plan: CardNewsPlan, ctx: PromptContext): CardNewsPrompt {
  const text = [
    `한국어 정보 카드뉴스 ${plan.cards.length}장을 같은 디자인 시스템으로 디자인하세요.`,
    "",
    `[기획 의도] ${plan.concept} — ${plan.goal}`,
    "",
    "[카드 구성]",
    ...plan.cards.map((card) =>
      [
        `${card.page}장`,
        `  헤드라인: ${card.headline}`,
        card.body ? `  본문: ${card.body}` : "",
        card.visualDirection ? `  그림 방향: ${card.visualDirection}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    ),
    "",
    "[디자인 조건]",
    ...commonDirections(ctx),
    "- 모든 장에서 서체·컬러·여백을 동일하게 유지하고, 장 번호를 우측 하단에 표기",
  ].join("\n");

  return {
    type: "cardnews",
    planId: plan.id,
    concept: plan.concept,
    cards: plan.cards,
    style: ctx.style,
    styleLabel: imageStyleLabel(ctx.style),
    ratio: ctx.ratio,
    text,
  };
}

/** 문구를 썸네일용 줄바꿈으로 나눈다 (최대 3줄) */
export function splitTitleLines(title: string, maxLines = 3, maxPerLine = 12): string[] {
  const words = title.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  for (const word of words) {
    const last = lines[lines.length - 1];
    if (last !== undefined && `${last} ${word}`.length <= maxPerLine) {
      lines[lines.length - 1] = `${last} ${word}`;
    } else {
      lines.push(word);
    }
  }
  if (lines.length <= maxLines) return lines;
  return [...lines.slice(0, maxLines - 1), lines.slice(maxLines - 1).join(" ")];
}

/** 기획안 → 대표 이미지 생성 프롬프트 */
export function generateThumbnailPrompt(
  plan: ThumbnailPlan,
  ctx: PromptContext,
): ThumbnailPrompt {
  const titleLines = splitTitleLines(plan.headline);

  const text = [
    "블로그 상단에 쓸 한국어 대표 이미지(썸네일) 1장을 디자인하세요.",
    "",
    `[기획 의도] ${plan.concept} — ${plan.goal}`,
    "",
    `[메인 문구]\n${titleLines.join("\n")}`,
    plan.subheadline ? `[보조 문구] ${plan.subheadline}` : "",
    `[분야] ${categoryLabel(ctx.input.category)}`,
    "",
    "[디자인 조건]",
    ...commonDirections(ctx),
    "- 메인 문구가 이미지 면적의 절반 이상을 차지하도록 큼직하게 배치",
    "- 설명 문장을 추가하지 말 것. 텍스트는 위에 적힌 것만 사용",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    type: "thumbnail",
    planId: plan.id,
    concept: plan.concept,
    titleLines,
    subtitle: plan.subheadline,
    category: ctx.input.category,
    categoryLabel: categoryLabel(ctx.input.category),
    style: ctx.style,
    styleLabel: imageStyleLabel(ctx.style),
    ratio: ctx.ratio,
    text,
  };
}

/**
 * 선택된 기획안을 이미지 생성 프롬프트로 바꾼다.
 * 정렬 순서는 화면 노출 순서(AI_BLOG_IMAGE_TYPES)를 따른다.
 */
export function buildImagePrompts(request: AiBlogImageRequest): AiBlogImagePrompt[] {
  const order = AI_BLOG_IMAGE_TYPES.map((t) => t.id);

  return [...request.plans]
    .sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type))
    .map((plan) => {
      const ctx: PromptContext = {
        input: request.input,
        style: request.style,
        ratio: imageRatioOf(plan.type, request.thumbnailRatio),
      };
      if (plan.type === "infographic") return generateInfographicPrompt(plan, ctx);
      if (plan.type === "cardnews") return generateCardNewsPrompt(plan, ctx);
      return generateThumbnailPrompt(plan, ctx);
    });
}

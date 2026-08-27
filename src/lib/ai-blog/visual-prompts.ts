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

import { categoryLabel, imageTypeLabel, imageStyleLabel } from "@/lib/ai-blog/options";
import type {
  AiBlogAspectRatio,
  AiBlogImageStyle,
  AiBlogImageType,
  AiBlogInput,
  VisualDesignPage,
  VisualDesignPlan,
  VisualElement,
  VisualLayout,
  VisualPlan,
  VisualPlanRequest,
  VisualSection,
} from "@/lib/ai-blog/types";
import {
  ALL_LAYOUTS,
  LAYOUT_CATALOG,
  TEXT_LIMITS,
  allowedLayouts,
  artDirectionFor,
  layoutLabel,
} from "@/lib/ai-blog/visual-design";

/**
 * 이미지 파이프라인 프롬프트.
 *
 *   1) 콘텐츠 기획 프롬프트 : 원고 → "무엇을 이미지로 만들지"(VisualPlan)
 *   2) 디자인 기획 프롬프트 : VisualPlan → "어떻게 보여줄지"(VisualDesignPlan)
 *   3) 이미지 생성 프롬프트 : VisualDesignPlan → 실제 이미지 생성 API에 넘길 문자열
 *
 * 2단계는 원고를 참조하지 않고 1단계 결과만 본다.
 * 3단계는 2단계 결과만 본다. 각 단계가 앞 단계의 산출물만 쓰기 때문에
 * 원고 문장이 이미지로 그대로 흘러가는 경로가 구조적으로 없다.
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
  article: [
    "[본문 비주얼 기획 지침]",
    "본문 중간에 넣어 그 문단의 상황·개념·분위기를 보완하는 이미지입니다.",
    "정보를 나열하지 마세요. 이미지 안 텍스트는 없거나 아주 짧아야 합니다.",
    "원고의 어느 소제목 아래에 넣으면 이해가 쉬워지는지 afterHeading 으로 지정하세요.",
    "subject(무엇을), scene(어떤 장면), mood(분위기)를 각각 한국어로 구체적으로 적습니다.",
    "사람 얼굴 클로즈업, 실제 제품 패키지, 브랜드 로고는 만들지 않습니다.",
    "사용자가 제공하지 않은 특정 제품의 포장은 절대 지어내지 마세요.",
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
/* 2단계 — 디자인 기획 프롬프트 (아트 디렉터)                           */
/* ------------------------------------------------------------------ */

function layoutMenu(type: AiBlogImageType): string {
  return allowedLayouts(type)
    .map((layout) => `- ${layout} (${LAYOUT_CATALOG[layout].label}) : ${LAYOUT_CATALOG[layout].whenToUse}`)
    .join("\n");
}

const DENSITY_RULE = [
  "[텍스트 밀도 — 가장 중요한 원칙]",
  "이미지는 읽는 콘텐츠가 아니라 보는 콘텐츠입니다.",
  `- headline : ${TEXT_LIMITS.headline}자 이내`,
  `- subheadline : ${TEXT_LIMITS.subheadline}자 이내`,
  `- 항목 제목(title) : ${TEXT_LIMITS.sectionTitle}자 이내`,
  `- 항목 설명(description) : ${TEXT_LIMITS.sectionDescription}자 이내`,
  "- 문장을 나열하지 말고 '아이콘 + 짧은 문구', '숫자 + 키워드', '체크 + 핵심어' 형태로 바꿉니다.",
  "- 설명으로 다 말하려 하지 말고, 시각 요소가 대신 말하게 합니다.",
].join("\n");

const ELEMENT_RULE = [
  "[시각 요소 — visualElements]",
  "텍스트만 배치하지 말고, 무엇을 그릴지 직접 정하세요. 최소 3개 이상 만듭니다.",
  "type : illustration | medical_illustration | icon | number | arrow | connector | badge | chart | shape",
  "position : center | center-top | center-bottom | top-left | top-right | bottom-left | bottom-right | left | right | background",
  "emphasis : primary(가장 큰 요소 1개) | secondary | accent",
  "subject 에는 무엇을 그릴지 한국어로 구체적으로 적습니다. 예) '단순화한 무릎 관절 구조'",
  "",
  "사람 얼굴, 실제 브랜드 로고는 넣지 않습니다.",
  "chart 는 원고나 참고자료에 근거가 있는 수치가 있을 때만 씁니다.",
  "근거 없는 통계·그래프·수치를 디자인 목적으로 만들어내면 안 됩니다.",
].join("\n");

const DESIGN_TYPE_GUIDE: Record<AiBlogImageType, string> = {
  infographic: [
    "[인포그래픽 디자인 지침]",
    "단순 텍스트 카드가 되면 실패입니다. 아래 요소 중 최소 2가지 이상을 반드시 사용하세요.",
    "대표 일러스트 / 아이콘 / 번호 / 화살표 / 연결선 / 비교 구조 / 단계 구조 / 체크박스 / 강조 숫자 / 배지",
    `sections 는 ${TEXT_LIMITS.maxSections}개 이하로 만들고, 각 항목에 marker(01, 02 …)와 icon 을 붙입니다.`,
    "정보 위계를 분명히 하세요 — 가장 크게 보여줄 것 하나(keyMessage)를 정합니다.",
  ].join("\n"),
  cardnews: [
    "[카드뉴스 디자인 지침]",
    "모든 장이 같은 템플릿이면 실패입니다. 장마다 layout 을 다르게 배정하세요.",
    "권장 흐름 : 1장 hero(표지) → 중간 장 grid/comparison/checklist/process/numbered → 마지막 장 summary",
    "같은 layout 이 연속으로 반복되지 않게 합니다.",
    "각 장은 headline 1개 + sections 2~4개로 짧게 구성합니다.",
    "장마다 visualElements 를 따로 정합니다.",
  ].join("\n"),
  article: [
    "[본문 비주얼 디자인 지침]",
    "layout 은 visual 로 고정하고 sections 는 빈 배열로 둡니다.",
    "그림이 주인공입니다. visualElements 의 primary 에 장면 일러스트를 넣으세요.",
    "headline 은 짧은 캡션 정도로만 쓰거나 비워 둡니다.",
  ].join("\n"),
  thumbnail: [
    "[대표 이미지 디자인 지침]",
    "정보를 넣지 마세요. 목적은 클릭 유도와 주제 인지입니다.",
    "layout 은 hero 로 고정하고, sections 는 빈 배열로 둡니다.",
    "텍스트는 headline 1개, subheadline 최대 1개까지만 씁니다.",
    "체크리스트·FAQ·긴 설명을 넣으면 실패입니다.",
    "대신 주제를 상징하는 대표 일러스트를 primary 요소로 배치하세요.",
  ].join("\n"),
};

/** 디자인 기획 시스템 프롬프트 */
export function buildDesignSystemPrompt(type: AiBlogImageType, style: AiBlogImageStyle): string {
  const art = artDirectionFor(style);

  return [
    "당신은 한국 디지털 콘텐츠 전문 아트디렉터이자 인포그래픽 디자이너입니다.",
    "텍스트를 단순히 카드에 배치하지 말고, 정보의 성격을 분석해 가장 이해하기 쉬운",
    "시각적 구조를 결정해야 합니다.",
    "",
    "[반드시 판단할 것]",
    "- 핵심 메시지는 무엇인가",
    "- 어떤 정보를 가장 크게 보여줄 것인가",
    "- 어떤 정보는 텍스트가 아니라 아이콘으로 표현할 것인가",
    "- 일러스트가 필요한가",
    "- 비교 구조가 필요한가, 순서·프로세스가 나은가",
    "- 숫자를 크게 강조해야 하는가",
    "- 중앙 집중형인가 좌우 비교형인가",
    "- 어떤 정보 위계가 필요한가",
    "",
    "[선택 가능한 레이아웃]",
    layoutMenu(type),
    "",
    DESIGN_TYPE_GUIDE[type],
    "",
    DENSITY_RULE,
    "",
    ELEMENT_RULE,
    "",
    "[적용할 아트 디렉션]",
    `- 스타일: ${imageStyleLabel(style)}`,
    `- 분위기: ${art.mood}`,
    `- 일러스트: ${art.illustrationStyle}`,
    `- 배경: ${art.backgroundStyle}`,
    `- 타이포: ${art.typographyDirection}`,
    `- 정보 밀도: ${art.density}`,
    "같은 내용이라도 이 아트 디렉션에 맞게 구성과 요소를 바꿔야 합니다.",
    "",
    "[유지할 것]",
    "콘텐츠 기획(headline, 항목)의 뜻을 바꾸지 마세요.",
    "표현을 더 짧고 시각적으로 다듬는 것은 좋지만, 원고 본문을 다시 끌어오면 안 됩니다.",
  ].join("\n");
}

function planBrief(plan: VisualPlan): string {
  if (plan.type === "article") {
    return [
      `[콘텐츠 기획] ${plan.concept} — ${plan.goal}`,
      `삽입 위치: "${plan.afterHeading}" 아래`,
      `목적: ${plan.purpose}`,
      `대상: ${plan.subject}`,
      `장면: ${plan.scene}`,
      `분위기: ${plan.mood}`,
      plan.visualDirection ? `그림 방향: ${plan.visualDirection}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (plan.type === "infographic") {
    return [
      `[콘텐츠 기획] ${plan.concept} — ${plan.goal}`,
      `헤드라인: ${plan.headline}`,
      plan.subheadline ? `보조 문구: ${plan.subheadline}` : "",
      `추천 시각화 형태: ${plan.visualType}`,
      "항목:",
      ...plan.items.map((item, i) => `  ${i + 1}. ${item.title} — ${item.description}`),
      plan.footer ? `하단 문구: ${plan.footer}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (plan.type === "cardnews") {
    return [
      `[콘텐츠 기획] ${plan.concept} — ${plan.goal}`,
      `총 ${plan.cards.length}장`,
      ...plan.cards.map(
        (card) =>
          `  ${card.page}장 | ${card.headline} | ${card.body}${card.visualDirection ? ` | 그림: ${card.visualDirection}` : ""}`,
      ),
    ].join("\n");
  }

  return [
    `[콘텐츠 기획] ${plan.concept} — ${plan.goal}`,
    `헤드라인: ${plan.headline}`,
    plan.subheadline ? `보조 문구: ${plan.subheadline}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** 디자인 기획 프롬프트(user 메시지) */
export function buildDesignPrompt(
  plan: VisualPlan,
  input: AiBlogInput,
  ratio: AiBlogAspectRatio,
  excludeLayouts: VisualLayout[] = [],
  instruction?: string,
): string {
  const exclude =
    excludeLayouts.length > 0
      ? `\n[이미 사용한 레이아웃 — 다른 구조로 제안할 것]\n${excludeLayouts
          .map((layout) => `- ${layout} (${layoutLabel(layout)})`)
          .join("\n")}`
      : "";

  return [
    `[만들 이미지] ${imageTypeLabel(plan.type)} · 비율 ${ratio}`,
    `[업종/분야] ${categoryLabel(input.category)}`,
    `[타깃 독자] ${input.target || "일반 독자"}`,
    exclude,
    instruction ? `
[수정 요청 — 이 이미지 하나에만 적용]
${instruction}` : "",
    "",
    planBrief(plan),
    "",
    "위 콘텐츠 기획을 실제로 어떻게 보여줄지 디자인해 주세요.",
  ]
    .filter(Boolean)
    .join("\n");
}

/* ------------------------------------------------------------------ */
/* 3단계 — 실제 이미지 생성 프롬프트                                    */
/* ------------------------------------------------------------------ */

const BASE_AVOID = [
  "excessive text, paragraphs, or full sentences",
  "fake statistics, invented numbers, made-up charts",
  "medical, legal or financial claims",
  "clutter, cramped spacing",
  "repeated identical card layout",
  "human faces, real brand logos",
  "watermarks, signatures",
];

function elementLine(element: VisualElement): string {
  return `- ${element.subject} (${element.type}, ${element.position}, ${element.emphasis})`;
}

function koreanTextBlock(
  headline: string,
  subheadline: string | undefined,
  keyMessage: string | undefined,
  sections: VisualSection[],
  footnote: string | undefined,
): string[] {
  return [
    "Korean text content (render exactly as written, do not add sentences):",
    `HEADLINE: ${headline}`,
    subheadline ? `SUB: ${subheadline}` : "",
    keyMessage ? `KEY: ${keyMessage}` : "",
    ...sections.map(
      (section, i) =>
        `${section.marker ?? String(i + 1).padStart(2, "0")}: ${section.title}${section.description ? ` — ${section.description}` : ""}`,
    ),
    footnote ? `FOOTER: ${footnote}` : "",
  ].filter(Boolean);
}

/**
 * 한글 렌더링 대비 문구.
 *
 * 이미지 생성 모델이 한글을 정확히 그리지 못하는 경우가 많다.
 * 그럴 때 깨진 글자를 그리는 대신 자리를 비워두게 해서,
 * 웹 렌더러(HTML/SVG/Canvas)가 그 자리에 정확한 한글을 얹을 수 있게 한다.
 */
const KOREAN_TEXT_NOTE = [
  "Text rendering note:",
  "If Korean glyphs cannot be rendered accurately, leave clean empty areas at the",
  "text positions instead of drawing placeholder or garbled characters.",
  "The Korean text will be composited on top by a web renderer.",
].join("\n");

interface ImagePromptSource {
  type: AiBlogImageType;
  ratio: AiBlogAspectRatio;
  style: AiBlogImageStyle;
  category: AiBlogInput["category"];
  concept: string;
  designGoal: string;
  layout: VisualLayout;
  headline: string;
  subheadline?: string;
  keyMessage?: string;
  sections: VisualSection[];
  visualElements: VisualElement[];
  footnote?: string;
  /** 카드뉴스에서 "6장 중 2장" 같은 맥락 */
  pageNote?: string;
}

function composePrompt(source: ImagePromptSource): string {
  const art = artDirectionFor(source.style);
  const layoutSpec = LAYOUT_CATALOG[source.layout] ?? LAYOUT_CATALOG.grid;

  const kind =
    source.type === "infographic"
      ? "information infographic"
      : source.type === "cardnews"
        ? "card news slide"
        : "blog thumbnail key visual";

  return [
    `Create a professional Korean ${categoryLabel(source.category)} ${kind}.`,
    "",
    "Topic:",
    `${source.concept} — ${source.headline}`,
    `Design goal: ${source.designGoal}`,
    source.pageNote ? `Slide: ${source.pageNote}` : "",
    "",
    "Composition:",
    `- ${source.ratio} aspect ratio, ${source.layout} layout`,
    `- ${layoutSpec.composition}`,
    `- ${source.sections.length > 0 ? `${source.sections.length} information blocks` : "no information blocks, single dominant message"}`,
    "- clear information hierarchy: one dominant element, the rest subordinate",
    "",
    "Visual elements:",
    ...source.visualElements.map(elementLine),
    "",
    "Style:",
    ...art.englishStyle.map((line) => `- ${line}`),
    `- ${art.palette}`,
    "- premium blog infographic quality, not an advertisement",
    "",
    "Avoid:",
    ...[...BASE_AVOID, ...art.englishAvoid].map((line) => `- ${line}`),
    "",
    ...koreanTextBlock(
      source.headline,
      source.subheadline,
      source.keyMessage,
      source.sections,
      source.footnote,
    ),
    "",
    KOREAN_TEXT_NOTE,
  ]
    .filter((line) => line !== "")
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

/** 디자인 기획 → 이미지 생성 프롬프트 (단일 이미지) */
export function buildImageGenerationPrompt(design: VisualDesignPlan): string {
  return composePrompt({
    type: design.type,
    ratio: design.ratio,
    style: design.style,
    category: design.category,
    concept: design.concept,
    designGoal: design.designGoal,
    layout: design.layout,
    headline: design.hierarchy.headline,
    subheadline: design.hierarchy.subheadline,
    keyMessage: design.hierarchy.keyMessage,
    sections: design.sections,
    visualElements: design.visualElements,
    footnote: design.footnote,
  });
}

/** 디자인 기획 → 카드뉴스 한 장의 이미지 생성 프롬프트 */
export function buildCardPagePrompt(
  design: VisualDesignPlan,
  page: VisualDesignPage,
): string {
  const total = design.pages?.length ?? 1;
  return composePrompt({
    type: "cardnews",
    ratio: design.ratio,
    style: design.style,
    category: design.category,
    concept: design.concept,
    designGoal: design.designGoal,
    layout: page.layout,
    headline: page.headline,
    keyMessage: page.keyMessage,
    sections: page.sections,
    visualElements: page.visualElements,
    footnote: page.page === total ? design.footnote : undefined,
    pageNote: `${page.page} of ${total} — keep one shared design system across all slides, but this slide uses the ${page.layout} structure`,
  });
}

/** 문구를 표지·썸네일용 줄바꿈으로 나눈다 (최대 3줄) */
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

/** 레이아웃 후보 목록 (디자인 기획 검증용) */
export function isAllowedLayout(type: AiBlogImageType, layout: VisualLayout): boolean {
  return allowedLayouts(type).includes(layout) || ALL_LAYOUTS.includes(layout);
}

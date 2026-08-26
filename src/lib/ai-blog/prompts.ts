import { BLOCK } from "@/lib/ai-blog/article";
import type { AiBlogConstraints } from "@/lib/ai-blog/constraints";
import {
  AI_BLOG_IMAGE_TYPES,
  articleTypeLabel,
  categoryLabel,
  imageRatioOf,
  imageStyleLabel,
  purposeLabel,
} from "@/lib/ai-blog/options";
import type { ResolvedReference } from "@/lib/ai-blog/references";
import type {
  AiBlogAspectRatio,
  AiBlogCardPlan,
  AiBlogDraft,
  AiBlogImagePrompt,
  AiBlogImageRequest,
  AiBlogImageStyle,
  AiBlogInput,
  AiBlogOutline,
  AiBlogReviseInstruction,
  CardNewsPrompt,
  InfographicPrompt,
  ThumbnailPrompt,
} from "@/lib/ai-blog/types";

/**
 * AI 프롬프트 생성 — UI와 완전히 분리된 순수 함수 모음.
 *
 * 화면(컴포넌트)은 이 파일의 함수를 호출하기만 하고 프롬프트 문자열을 직접 만들지 않는다.
 * 실제 AI API를 붙일 때 여기서 만든 text를 그대로 요청 본문에 넣으면 된다.
 */

/* ------------------------------------------------------------------ */
/* 원고 프롬프트                                                        */
/* ------------------------------------------------------------------ */

export interface ArticlePromptOptions {
  /** 참고자료 수집 결과 — 읽지 못한 URL은 그렇게 명시한다 */
  resolved?: ResolvedReference[];
  /** 추가 요청사항을 해석한 제약조건 */
  constraints?: AiBlogConstraints;
  /** 업종 플레이북이 정한 소제목 구성 */
  outline?: string[];
}

function referenceBlock(resolved: ResolvedReference[]): string {
  const usable = resolved.filter((r) => r.status !== "NOT_FETCHED");
  const unread = resolved.filter((r) => r.status === "NOT_FETCHED");

  const blocks: string[] = [];

  if (usable.length > 0) {
    const points = usable
      .map((r) => (r.points.length > 0 ? r.points.map((pt) => `- ${pt}`).join("\n") : `- ${r.source}`))
      .join("\n");
    blocks.push(`[3. 참고자료 — 아래 내용을 근거로 사용]\n${points}`);
  }

  if (unread.length > 0) {
    const links = unread.map((r) => `- ${r.source}`).join("\n");
    blocks.push(
      `[3-1. 참고 링크 — 내용 미확인]\n${links}\n※ 위 링크의 본문은 수집하지 못했습니다. 주소만 전달된 것이니, 링크에 적혀 있을 법한 내용을 추측해서 쓰지 마세요. 이 링크를 읽은 것처럼 서술하지 마세요.`,
    );
  }

  return blocks.join("\n\n");
}

function constraintBlock(constraints?: AiBlogConstraints): string {
  if (!constraints || !constraints.raw) return "";

  const rules = [
    constraints.noAds
      ? "- 제품 홍보가 아니라 정보 전달이 목적이다. 광고성 수식어와 단정적인 효능 표현을 쓰지 않는다."
      : "",
    constraints.professional
      ? "- 각 문단은 근거 → 설명 → 독자가 확인할 사항 순서로 구성한다."
      : "",
    constraints.simple ? "- 전문 용어는 풀어 쓰고 문장을 짧게 유지한다." : "",
    constraints.brands.length > 0 && constraints.brandLevel === "light"
      ? `- ${constraints.brands.join(", ")}는 본문 후반부에서 1~2회만 예시 수준으로 언급하고, 본문 대부분은 일반적인 정보로 채운다.`
      : "",
    constraints.brands.length > 0 && constraints.brandLevel === "none"
      ? `- ${constraints.brands.join(", ")}는 언급하지 않는다.`
      : "",
    constraints.includeTable ? "- 정리 표를 반드시 포함한다." : "",
    constraints.includeChecklist ? "- 체크리스트를 반드시 포함한다." : "",
    constraints.includeFaq ? "- FAQ를 반드시 포함한다." : "",
  ].filter(Boolean);

  return [
    `[1. 추가 요청사항 — 가장 우선해서 지킬 것]\n${constraints.raw}`,
    ...rules,
  ].join("\n");
}

/**
 * 원고 생성 시스템 프롬프트 — 역할과 지켜야 할 원칙.
 *
 * 입력값(주제·요청사항 등)은 여기 넣지 않는다. 시스템 프롬프트는 요청마다
 * 바뀌지 않아야 프롬프트 캐시가 살아 있고, 사용자 입력은 user 메시지로 분리해야
 * 지시와 데이터의 경계가 분명해진다.
 */
export function buildSystemPrompt(): string {
  return [
    "당신은 네이버 블로그에 발행할 정보성 콘텐츠를 쓰는 전문 한국어 콘텐츠 에디터입니다.",
    "독자가 실제로 판단에 쓸 수 있는 글을 씁니다.",
    "",
    "[반드시 지킬 원칙]",
    "1. 사용자가 준 주제에서 벗어나지 않는다. 주제와 무관한 일반론으로 지면을 채우지 않는다.",
    "2. 입력되지 않은 사실을 지어내지 않는다. 통계·수치·법령 조문·의학적 효능은 확신해서 쓰지 않는다.",
    "   근거가 필요하지만 확인되지 않은 부분은 '확인이 필요하다'는 취지로 쓰고 구체적 수치를 만들지 않는다.",
    "3. 광고성 표현(최고, 무조건, 확실히, 완벽한 등)을 쓰지 않는다. 정보 전달 톤을 유지한다.",
    "4. 특정 제품을 약하게 언급하라는 요청을 받으면, 본문 대부분은 일반 정보로 채우고",
    "   제품명은 후반부에서 예시 수준으로 1~2회만 쓴다. 글 전체를 제품 홍보글로 바꾸지 않는다.",
    "5. 핵심 키워드는 문맥에 맞게 자연스럽게 쓰고, 억지로 반복 삽입하지 않는다.",
    "6. 같은 표현과 문장을 반복하지 않는다. 문단마다 새로운 정보를 담는다.",
    "7. 내용이 없는 추상적인 문장으로 글자수를 채우지 않는다.",
    "   '상황에 따라 다릅니다', '확인하는 것이 좋습니다' 같은 문장만으로 문단을 끝내지 않는다.",
    "8. 각 문단은 '왜 그런지 → 무엇을 확인해야 하는지 → 어떻게 판단할지' 순서로 구체적으로 쓴다.",
    "9. 문단은 3~4줄로 끊어 모바일에서 읽기 좋게 쓴다.",
    "",
    "[기본 구성]",
    "제목 / 도입 / 핵심 요약 / 본문 소제목 3~6개 / 표 또는 체크리스트 / FAQ / 마무리",
    "단, 주제에 맞지 않는 항목은 억지로 넣지 않는다. 표가 어색한 주제라면 표 대신 체크리스트만 써도 된다.",
    "",
    "[분야 안내 문구]",
    "건강·의료·법률·금융처럼 개인 상황에 따라 결론이 달라지는 분야는",
    "마무리에 전문가 확인을 권하는 안내 문구를 disclaimer 로 덧붙인다.",
  ].join("\n");
}

/**
 * STEP 1 입력 → 원고 생성 프롬프트(user 메시지).
 *
 * 블록 순서 = 반영 우선순위.
 *   ① 추가 요청사항 ② 주제 ③ 확보된 참고자료 ④ 핵심 키워드
 *   ⑤ 업종 ⑥ 타깃 ⑦ 목적 ⑧ 원고 유형 ⑨ 목표 분량
 * 앞에 놓인 블록이 뒤의 블록과 충돌하면 앞의 블록을 따른다는 점을 명시한다.
 */
export function buildArticlePrompt(input: AiBlogInput, options?: ArticlePromptOptions): string {
  const constraints = constraintBlock(options?.constraints);
  const references = referenceBlock(options?.resolved ?? []);

  const structure =
    options?.outline && options.outline.length > 0
      ? `참고 구성안: ${options.outline.join(" / ")}`
      : "";

  return [
    "아래 조건으로 블로그 원고를 작성해 주세요.",
    "블록은 반영 우선순위 순서로 적었습니다. 서로 충돌하면 위쪽 블록을 우선합니다.",
    "",
    constraints || "[1. 추가 요청사항] 없음",
    "",
    `[2. 포스팅 주제]\n${input.topic}`,
    "이 글은 위 주제를 설명하는 글입니다.",
    "",
    references || "[3. 참고자료] 제공된 내용 없음",
    "",
    `[4. 핵심 키워드] ${input.keywords.join(", ") || "지정 없음"}`,
    `[5. 업종/분야] ${categoryLabel(input.category)}`,
    `[6. 타깃 독자] ${input.target || "일반 독자"}`,
    `[7. 원고 목적] ${purposeLabel(input.purpose)}`,
    `[8. 원고 유형] ${articleTypeLabel(input.articleType)}`,
    `[9. 목표 분량] 공백 제외 약 ${input.articleLength}자 (±15% 이내)`,
    structure,
  ]
    .filter(Boolean)
    .join("\n");
}

/* ------------------------------------------------------------------ */
/* 원고 수정 프롬프트                                                   */
/* ------------------------------------------------------------------ */

/** 편집기가 쓰는 마크다운 규칙 — 수정 결과도 이 형식을 유지해야 파서가 동작한다 */
export function markdownFormatSpec(): string {
  return [
    "[본문 마크다운 형식 — 반드시 지킬 것]",
    `- 큰 블록 제목은 "## ${BLOCK.summary}", "## ${BLOCK.table}", "## ${BLOCK.checklist}", "## ${BLOCK.faq}", "## ${BLOCK.outro}" 를 사용한다.`,
    '- 본문 소제목은 "### 1. 소제목" 처럼 ### 와 번호를 쓴다.',
    '- 목록은 "- 내용", 체크리스트는 "- [ ] 내용" 으로 쓴다.',
    '- 표는 "| 항목 | 내용 |" 형식의 마크다운 표로 쓰고, 두 번째 줄에 "| --- | --- |" 를 넣는다.',
    '- FAQ 는 "**Q. 질문**" 다음 줄에 "A. 답변" 으로 쓴다.',
    "- 제목(H1)은 본문에 넣지 않는다. 제목은 title 필드로만 돌려준다.",
  ].join("\n");
}

/** 원고 수정 시스템 프롬프트 */
export function buildReviseSystemPrompt(): string {
  return [
    "당신은 한국어 블로그 원고를 다듬는 전문 에디터입니다.",
    "",
    "[가장 중요한 원칙]",
    "사용자가 직접 고쳐 놓은 문장이 있을 수 있습니다.",
    "요청받은 부분만 바꾸고, 그 외의 문장·문단·순서는 원문 그대로 유지하세요.",
    "요청과 무관한 문장을 임의로 다시 쓰거나 삭제하지 않습니다.",
    "",
    "[그 밖의 원칙]",
    "- 주제와 사실관계를 바꾸지 않는다. 새로운 수치나 근거를 지어내지 않는다.",
    "- 광고성 표현을 늘리지 않는다.",
    "- 전체 구조(블록 순서)를 유지한다. 요청이 구조 변경일 때만 바꾼다.",
    "",
    markdownFormatSpec(),
  ].join("\n");
}

/** 원고 수정 프롬프트(user 메시지) */
export function buildRevisePrompt(
  draft: AiBlogDraft,
  instruction: AiBlogReviseInstruction,
  input: AiBlogInput,
): string {
  const request = instruction.action === "custom" ? (instruction.note ?? "") : instruction.label;

  return [
    `[수정 요청] ${request}`,
    "",
    "[유지해야 할 맥락]",
    `- 주제: ${input.topic}`,
    `- 핵심 키워드: ${input.keywords.join(", ") || "지정 없음"}`,
    `- 타깃 독자: ${input.target || "일반 독자"}`,
    `- 업종/분야: ${categoryLabel(input.category)}`,
    input.requestNotes ? `- 최초 요청사항: ${input.requestNotes}` : "",
    "",
    `[현재 제목]\n${draft.title}`,
    "",
    `[현재 본문]\n${draft.body}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/* ------------------------------------------------------------------ */
/* 이미지 프롬프트                                                      */
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

function commonDirections(ctx: PromptContext): string[] {
  return [
    `- 디자인 스타일: ${imageStyleLabel(ctx.style)} (${STYLE_DIRECTION[ctx.style]})`,
    `- 이미지 비율: ${ctx.ratio}`,
    `- 업종/분야: ${categoryLabel(ctx.input.category)}`,
    "- 모든 텍스트는 한국어로, 맞춤법에 맞게 정확히 렌더링할 것",
    "- 사람 얼굴, 실제 브랜드 로고, 읽을 수 없는 가짜 문자를 넣지 말 것",
  ];
}

/** 핵심 요약 인포그래픽 프롬프트 */
export function generateInfographicPrompt(
  outline: AiBlogOutline,
  ctx: PromptContext,
): InfographicPrompt {
  const points = (outline.summary.length > 0 ? outline.summary : outline.headings).slice(0, 5);
  const checklist = outline.checklist.slice(0, 4);
  const footnote = "본 이미지는 참고용 요약입니다.";

  const text = [
    "한국어 정보성 인포그래픽 1장을 디자인하세요.",
    "",
    `[제목] ${outline.title}`,
    `[타깃] ${ctx.input.target || "일반 독자"}`,
    "",
    "[핵심 포인트]",
    ...points.map((p, i) => `${i + 1}. ${p}`),
    checklist.length > 0 ? `\n[체크리스트]\n${checklist.map((c) => `· ${c}`).join("\n")}` : "",
    `\n[하단 문구] ${footnote}`,
    "",
    "[디자인 조건]",
    ...commonDirections(ctx),
    "- 상단 제목 → 핵심 포인트 → 체크리스트 → 하단 문구 순의 세로 흐름",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    type: "infographic",
    topic: ctx.input.topic,
    points,
    checklist,
    target: ctx.input.target,
    footnote,
    style: ctx.style,
    styleLabel: imageStyleLabel(ctx.style),
    ratio: ctx.ratio,
    text,
  };
}

/** 최종 원고에서 카드뉴스 장별 구성을 만든다 */
export function planCardNews(outline: AiBlogOutline, cardCount: number): AiBlogCardPlan[] {
  const head: Omit<AiBlogCardPlan, "index">[] = [
    {
      role: "cover",
      title: outline.title,
      lines: [outline.summary[0] ?? outline.headings[0] ?? ""].filter(Boolean),
    },
    {
      role: "intro",
      title: "이런 상황이라면",
      // 표지 카드와 문구가 겹치지 않도록 두 번째 요약부터 사용한다
      lines: (outline.summary.length > 2 ? outline.summary.slice(1) : outline.headings).slice(0, 2),
    },
  ];

  const tail: Omit<AiBlogCardPlan, "index">[] = [];
  if (outline.checklist.length > 0) {
    tail.push({ role: "checklist", title: "확인 체크리스트", lines: outline.checklist.slice(0, 4) });
  }
  if (outline.faqs.length > 0) {
    tail.push({
      role: "faq",
      title: "자주 묻는 질문",
      lines: outline.faqs.slice(0, 2).map((f) => `Q. ${f.question}`),
    });
  }
  tail.push({ role: "outro", title: "정리하면", lines: outline.summary.slice(-2) });

  // 표지·도입과 마무리 카드를 뺀 나머지 자리를 핵심 정보 카드로 채운다
  const overflow = head.length + tail.length - cardCount;
  const usedTail = overflow > 0 ? tail.slice(Math.min(overflow, tail.length - 1)) : tail;
  const room = Math.max(0, cardCount - head.length - usedTail.length);

  const sources = outline.headings.length > 0 ? outline.headings : outline.summary;
  const points: Omit<AiBlogCardPlan, "index">[] = [];
  for (let i = 0; i < room; i += 1) {
    const heading = sources.length > 0 ? sources[i % sources.length] : outline.title;
    const detail =
      outline.summary.length > 0 ? outline.summary[(i + 2) % outline.summary.length] : "";
    points.push({ role: "point", title: heading, lines: [detail].filter(Boolean) });
  }

  return [...head, ...points, ...usedTail]
    .slice(0, cardCount)
    .map((card, i) => ({ ...card, index: i + 1 }));
}

/** 정보 카드뉴스 프롬프트 */
export function generateCardNewsPrompt(
  outline: AiBlogOutline,
  ctx: PromptContext,
  cardCount: number,
): CardNewsPrompt {
  const cards = planCardNews(outline, cardCount);

  const text = [
    `한국어 정보 카드뉴스 ${cards.length}장을 같은 디자인 시스템으로 디자인하세요.`,
    "",
    `[주제] ${outline.title}`,
    "",
    "[카드 구성]",
    ...cards.map((c) => `${c.index}장 (${c.title})\n${c.lines.map((l) => `  · ${l}`).join("\n")}`),
    "",
    "[디자인 조건]",
    ...commonDirections(ctx),
    "- 모든 장에서 서체·컬러·여백을 동일하게 유지하고, 장 번호를 우측 하단에 표기",
  ].join("\n");

  return {
    type: "cardnews",
    topic: ctx.input.topic,
    cards,
    style: ctx.style,
    styleLabel: imageStyleLabel(ctx.style),
    ratio: ctx.ratio,
    text,
  };
}

/** 제목을 썸네일용 줄바꿈으로 나눈다 (최대 3줄) */
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
  // 줄이 넘치면 마지막 줄에 나머지를 합친다
  return [...lines.slice(0, maxLines - 1), lines.slice(maxLines - 1).join(" ")];
}

/** 블로그 대표 이미지 프롬프트 */
export function generateThumbnailPrompt(
  outline: AiBlogOutline,
  ctx: PromptContext,
): ThumbnailPrompt {
  const titleLines = splitTitleLines(outline.title);
  const subtitle = outline.summary[0] ?? ctx.input.keywords.join(" · ");

  const text = [
    "블로그 상단에 쓸 한국어 대표 이미지(썸네일) 1장을 디자인하세요.",
    "",
    `[제목]\n${titleLines.join("\n")}`,
    `[보조 문구] ${subtitle}`,
    `[분야] ${categoryLabel(ctx.input.category)}`,
    "",
    "[디자인 조건]",
    ...commonDirections(ctx),
    "- 제목이 이미지 면적의 절반 이상을 차지하도록 큼직하게 배치",
    "- 작은 글씨를 많이 넣지 말고 제목 가독성을 최우선으로",
  ].join("\n");

  return {
    type: "thumbnail",
    titleLines,
    subtitle,
    category: ctx.input.category,
    categoryLabel: categoryLabel(ctx.input.category),
    style: ctx.style,
    styleLabel: imageStyleLabel(ctx.style),
    ratio: ctx.ratio,
    text,
  };
}

/**
 * 선택한 이미지 유형에 맞는 프롬프트를 모두 만든다.
 * 정렬 순서는 화면 노출 순서(AI_BLOG_IMAGE_TYPES)를 따른다.
 */
export function buildImagePrompts(request: AiBlogImageRequest): AiBlogImagePrompt[] {
  return AI_BLOG_IMAGE_TYPES.map((t) => t.id)
    .filter((type) => request.types.includes(type))
    .map((type) => {
      const ctx: PromptContext = {
        input: request.input,
        style: request.style,
        ratio: imageRatioOf(type, request.thumbnailRatio),
      };
      if (type === "infographic") return generateInfographicPrompt(request.outline, ctx);
      if (type === "cardnews") return generateCardNewsPrompt(request.outline, ctx, request.cardCount);
      return generateThumbnailPrompt(request.outline, ctx);
    });
}

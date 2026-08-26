import {
  AI_BLOG_IMAGE_TYPES,
  articleTypeLabel,
  categoryLabel,
  imageRatioOf,
  imageStyleLabel,
  purposeLabel,
} from "@/lib/ai-blog/options";
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

/** STEP 1 입력 → 원고 생성 프롬프트 */
export function buildArticlePrompt(input: AiBlogInput): string {
  const references = input.references
    .map((r) => `- ${r.kind === "url" ? "참고 URL" : "참고 내용"}: ${r.value}`)
    .join("\n");

  return [
    "당신은 네이버 블로그 상위 노출 경험이 많은 한국어 콘텐츠 에디터입니다.",
    "아래 조건에 맞춰 그대로 발행할 수 있는 정보성 블로그 원고를 작성하세요.",
    "",
    `- 주제: ${input.topic}`,
    `- 핵심 키워드: ${input.keywords.join(", ")}`,
    `- 업종/분야: ${categoryLabel(input.category)}`,
    `- 원고 목적: ${purposeLabel(input.purpose)}`,
    `- 타깃 독자: ${input.target || "일반 독자"}`,
    `- 원고 유형: ${articleTypeLabel(input.articleType)}`,
    `- 목표 분량: 공백 제외 약 ${input.articleLength}자`,
    references ? `\n[참고자료]\n${references}` : "",
    input.requestNotes ? `\n[추가 요청사항]\n${input.requestNotes}` : "",
    "",
    "[구성]",
    "제목 / 도입부 / 핵심 요약 3~5개 / 소제목 3개 이상의 본문 / 정리 표 / 체크리스트 / FAQ 3개 / 마무리",
    "",
    "[작성 규칙]",
    "1. 핵심 키워드를 제목과 본문에 자연스럽게 배치한다.",
    "2. 과장된 광고 표현과 단정적인 효능 표현을 쓰지 않는다.",
    "3. 확인되지 않은 수치나 법령 조문을 지어내지 않는다.",
    "4. 문단은 3~4줄로 끊어 모바일에서 읽기 좋게 작성한다.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** 원고 수정 프롬프트 */
export function buildRevisePrompt(
  draft: AiBlogDraft,
  instruction: AiBlogReviseInstruction,
  input: AiBlogInput,
): string {
  const request = instruction.action === "custom" ? (instruction.note ?? "") : instruction.label;
  return [
    "아래 블로그 원고를 요청에 맞게 수정하세요. 전체 구조와 사실관계는 유지합니다.",
    "",
    `[요청] ${request}`,
    `[핵심 키워드] ${input.keywords.join(", ")}`,
    `[타깃 독자] ${input.target || "일반 독자"}`,
    "",
    `[제목]\n${draft.title}`,
    "",
    `[본문]\n${draft.body}`,
  ].join("\n");
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
    const detail = outline.summary.length > 0 ? outline.summary[(i + 2) % outline.summary.length] : "";
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

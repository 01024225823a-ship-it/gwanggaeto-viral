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

import type {
  AiBlogCategory,
  AiBlogImageStyle,
  AiBlogAspectRatio,
  VisualDesignPage,
  VisualDesignPlan,
  VisualDesignRequest,
  VisualDesignResult,
  VisualElement,
  VisualLayout,
  VisualPlan,
  VisualSection,
} from "@/lib/ai-blog/types";
import {
  LAYOUT_BY_VISUAL_TYPE,
  TEXT_LIMITS,
  allowedLayouts,
  artDirectionFor,
  cardLayoutSequence,
  clampText,
  defaultRatio,
  sectionCountFor,
} from "@/lib/ai-blog/visual-design";
import { buildImageGenerationPrompt } from "@/lib/ai-blog/visual-prompts";

/**
 * 디자인 기획 Mock (AI_BLOG_PROVIDER=mock 용).
 *
 * 실제로는 Claude가 정보의 성격을 보고 레이아웃과 시각 요소를 정한다.
 * Mock 은 그럴 수 없으므로, VisualPlan 의 시각화 형태(visualType)와
 * 레이아웃 카탈로그를 규칙으로 이어 붙여 "같은 템플릿 반복"만은 피한다.
 */

/* ------------------------------------------------------------------ */
/* 업종별 대표 일러스트                                                 */
/* ------------------------------------------------------------------ */

const CATEGORY_ILLUSTRATION: Record<AiBlogCategory, string> = {
  health: "단순화한 인체 관절 구조 일러스트",
  realestate: "아파트 외관과 계약 서류를 단순화한 일러스트",
  legal: "저울과 서류철을 단순화한 일러스트",
  beauty: "화장품 용기와 전성분표를 단순화한 일러스트",
  food: "식품 포장 뒷면 표시사항을 단순화한 일러스트",
  education: "교재와 학습 진도표를 단순화한 일러스트",
  finance: "금융 상품 설명서와 계산기를 단순화한 일러스트",
  auto: "자동차 측면과 점검 기록부를 단순화한 일러스트",
  etc: "주제를 상징하는 단순한 도형 일러스트",
};

/** 레이아웃이 요구하는 시각 요소 */
function elementsFor(
  layout: VisualLayout,
  category: AiBlogCategory,
  sectionCount: number,
): VisualElement[] {
  const hero: VisualElement = {
    type: category === "health" ? "medical_illustration" : "illustration",
    subject: CATEGORY_ILLUSTRATION[category],
    position: "center",
    emphasis: "primary",
  };

  const byLayout: Record<VisualLayout, VisualElement[]> = {
    radial: [
      hero,
      { type: "connector", subject: "중앙에서 각 항목으로 뻗는 얇은 연결선", position: "center", emphasis: "secondary" },
      { type: "badge", subject: `01~0${sectionCount} 번호 배지`, position: "right", emphasis: "accent" },
    ],
    checklist: [
      { type: "icon", subject: "확인 완료를 뜻하는 체크 마크", position: "left", emphasis: "primary" },
      { type: "shape", subject: "항목마다 놓인 사각 체크박스", position: "left", emphasis: "secondary" },
      { ...hero, position: "bottom-right", emphasis: "accent" },
    ],
    process: [
      { type: "arrow", subject: "단계와 단계를 잇는 화살표", position: "center", emphasis: "primary" },
      { type: "number", subject: "각 단계 앞의 원형 번호", position: "left", emphasis: "secondary" },
      { ...hero, position: "background", emphasis: "accent" },
    ],
    comparison: [
      { type: "shape", subject: "화면을 좌우로 가르는 중앙 분할선", position: "center", emphasis: "primary" },
      { type: "icon", subject: "왼쪽 항목을 뜻하는 확인 아이콘", position: "left", emphasis: "secondary" },
      { type: "icon", subject: "오른쪽 항목을 뜻하는 주의 아이콘", position: "right", emphasis: "secondary" },
    ],
    numbered: [
      { type: "number", subject: "화면을 채우는 대형 숫자", position: "left", emphasis: "primary" },
      { type: "icon", subject: "숫자 옆의 키워드 아이콘", position: "right", emphasis: "secondary" },
      { ...hero, position: "bottom-right", emphasis: "accent" },
    ],
    grid: [
      { type: "icon", subject: "칸마다 놓인 라인 아이콘 4종", position: "center", emphasis: "primary" },
      { type: "shape", subject: "균등 분할 카드 배경", position: "background", emphasis: "secondary" },
      { ...hero, position: "top-right", emphasis: "accent" },
    ],
    timeline: [
      { type: "connector", subject: "위에서 아래로 이어지는 타임라인 선", position: "center", emphasis: "primary" },
      { type: "shape", subject: "시점마다 놓인 원형 마커", position: "left", emphasis: "secondary" },
      { ...hero, position: "bottom-right", emphasis: "accent" },
    ],
    diagram: [
      { type: "shape", subject: "라벨이 붙은 도형 노드", position: "center", emphasis: "primary" },
      { type: "connector", subject: "노드를 잇는 선", position: "center", emphasis: "secondary" },
      { ...hero, position: "background", emphasis: "accent" },
    ],
    hero: [
      hero,
      { type: "shape", subject: "제목 뒤에 깔리는 큰 컬러 블록", position: "background", emphasis: "secondary" },
    ],
    summary: [
      { type: "shape", subject: "하단 행동 안내 강조 밴드", position: "bottom-left", emphasis: "primary" },
      { type: "icon", subject: "핵심 3줄 앞의 작은 마커 아이콘", position: "left", emphasis: "secondary" },
      { ...hero, position: "top-right", emphasis: "accent" },
    ],
    visual: [
      { ...hero, position: "center", emphasis: "primary" },
      { type: "shape", subject: "여백을 채우는 부드러운 배경 도형", position: "background", emphasis: "secondary" },
    ],
    mixed: [
      hero,
      { type: "icon", subject: "보조 블록의 라인 아이콘", position: "right", emphasis: "secondary" },
    ],
  };

  return byLayout[layout] ?? byLayout.grid;
}

/* ------------------------------------------------------------------ */
/* 구획 만들기                                                          */
/* ------------------------------------------------------------------ */

function markerFor(layout: VisualLayout, index: number): string {
  if (layout === "process" || layout === "timeline") return `STEP ${index + 1}`;
  if (layout === "checklist") return "✓";
  return String(index + 1).padStart(2, "0");
}

function toSections(
  items: Array<{ title: string; description?: string }>,
  layout: VisualLayout,
  limit: number,
): VisualSection[] {
  return items.slice(0, limit).map((item, i) => ({
    marker: markerFor(layout, i),
    title: clampText(item.title, TEXT_LIMITS.sectionTitle),
    description: item.description
      ? clampText(item.description, TEXT_LIMITS.sectionDescription)
      : undefined,
    icon: `${item.title}을(를) 뜻하는 라인 아이콘`,
  }));
}

/* ------------------------------------------------------------------ */
/* 디자인 기획                                                          */
/* ------------------------------------------------------------------ */

interface DesignContext {
  style: AiBlogImageStyle;
  category: AiBlogCategory;
  ratio: AiBlogAspectRatio;
  exclude: VisualLayout[];
}

function pickInfographicLayout(plan: VisualPlan, exclude: VisualLayout[]): VisualLayout {
  if (plan.type !== "infographic") return "grid";
  const preferred = LAYOUT_BY_VISUAL_TYPE[plan.visualType] ?? "grid";
  if (!exclude.includes(preferred)) return preferred;

  // 이미 쓴 레이아웃이면 같은 유형에서 다른 구조를 고른다
  const candidates = allowedLayouts("infographic").filter((l) => !exclude.includes(l));
  return candidates[0] ?? preferred;
}

function designInfographic(plan: VisualPlan, ctx: DesignContext): VisualDesignPlan {
  if (plan.type !== "infographic") throw new Error("infographic plan expected");

  const art = artDirectionFor(ctx.style);
  const layout = pickInfographicLayout(plan, ctx.exclude);
  const limit = Math.min(TEXT_LIMITS.maxSections, sectionCountFor(art.density));
  const sections = toSections(plan.items, layout, limit);

  const base: VisualDesignPlan = {
    id: `${plan.id}-design`,
    planId: plan.id,
    type: "infographic",
    concept: plan.concept,
    designGoal: plan.goal,
    layout,
    hierarchy: {
      headline: clampText(plan.headline, TEXT_LIMITS.headline),
      subheadline: plan.subheadline
        ? clampText(plan.subheadline, TEXT_LIMITS.subheadline)
        : undefined,
      keyMessage: sections[0]
        ? clampText(`${sections[0].title} 먼저 확인`, TEXT_LIMITS.keyMessage)
        : undefined,
    },
    visualElements: elementsFor(layout, ctx.category, sections.length),
    sections,
    artDirection: art,
    style: ctx.style,
    ratio: ctx.ratio,
    category: ctx.category,
    footnote: plan.footer ? clampText(plan.footer, TEXT_LIMITS.footnote) : undefined,
    imagePrompt: "",
    source: "MOCK",
  };

  return { ...base, imagePrompt: buildImageGenerationPrompt(base) };
}

function designThumbnail(plan: VisualPlan, ctx: DesignContext): VisualDesignPlan {
  if (plan.type !== "thumbnail") throw new Error("thumbnail plan expected");

  const art = artDirectionFor(ctx.style);

  const base: VisualDesignPlan = {
    id: `${plan.id}-design`,
    planId: plan.id,
    type: "thumbnail",
    concept: plan.concept,
    designGoal: plan.goal,
    layout: "hero",
    hierarchy: {
      headline: clampText(plan.headline, TEXT_LIMITS.headline),
      subheadline: plan.subheadline
        ? clampText(plan.subheadline, TEXT_LIMITS.subheadline)
        : undefined,
    },
    // 대표 이미지는 정보를 나열하지 않는다
    visualElements: elementsFor("hero", ctx.category, 0),
    sections: [],
    artDirection: art,
    style: ctx.style,
    ratio: ctx.ratio,
    category: ctx.category,
    imagePrompt: "",
    source: "MOCK",
  };

  return { ...base, imagePrompt: buildImageGenerationPrompt(base) };
}

function designArticleVisual(plan: VisualPlan, ctx: DesignContext): VisualDesignPlan {
  if (plan.type !== "article") throw new Error("article plan expected");

  const art = artDirectionFor(ctx.style);

  const base: VisualDesignPlan = {
    id: `${plan.id}-design`,
    planId: plan.id,
    type: "article",
    concept: plan.concept,
    designGoal: plan.purpose,
    layout: "visual",
    hierarchy: {
      headline: plan.textOverlay ? clampText(plan.textOverlay, TEXT_LIMITS.headline) : "",
      subheadline: clampText(plan.scene, TEXT_LIMITS.subheadline),
    },
    // 본문 비주얼은 정보 구획을 두지 않는다 — 그림이 주인공
    sections: [],
    visualElements: [
      {
        type: ctx.category === "health" ? "medical_illustration" : "illustration",
        subject: `${plan.subject} · ${plan.scene}`,
        position: "center",
        emphasis: "primary",
      },
      {
        type: "shape",
        subject: `${plan.mood} 분위기의 배경`,
        position: "background",
        emphasis: "secondary",
      },
    ],
    artDirection: art,
    style: ctx.style,
    ratio: ctx.ratio,
    category: ctx.category,
    afterHeading: plan.afterHeading,
    scene: plan.scene,
    imagePrompt: "",
    source: "MOCK",
  };

  return { ...base, imagePrompt: buildImageGenerationPrompt(base) };
}

function designCardNews(plan: VisualPlan, ctx: DesignContext): VisualDesignPlan {
  if (plan.type !== "cardnews") throw new Error("cardnews plan expected");

  const art = artDirectionFor(ctx.style);
  const layouts = cardLayoutSequence(plan.cards.length);

  const pages: VisualDesignPage[] = plan.cards.map((card, i) => {
    const layout = layouts[i] ?? "grid";
    const headline = clampText(card.headline, TEXT_LIMITS.headline);
    const body = clampText(card.body, TEXT_LIMITS.sectionDescription);

    // 표지와 마무리는 문장을 나열하지 않는다
    const sections: VisualSection[] =
      layout === "hero"
        ? []
        : layout === "summary"
          ? toSections([{ title: "핵심", description: body }], layout, 1)
          : toSections(
              [
                { title: clampText(card.headline, TEXT_LIMITS.sectionTitle), description: body },
              ],
              layout,
              2,
            );

    return {
      page: card.page,
      layout,
      headline,
      keyMessage: layout === "hero" ? undefined : body,
      sections,
      visualElements: elementsFor(layout, ctx.category, sections.length),
    };
  });

  const base: VisualDesignPlan = {
    id: `${plan.id}-design`,
    planId: plan.id,
    type: "cardnews",
    concept: plan.concept,
    designGoal: plan.goal,
    layout: "mixed",
    hierarchy: { headline: pages[0]?.headline ?? plan.concept },
    visualElements: pages[0]?.visualElements ?? [],
    sections: [],
    pages,
    artDirection: art,
    style: ctx.style,
    ratio: ctx.ratio,
    category: ctx.category,
    imagePrompt: "",
    source: "MOCK",
  };

  return { ...base, imagePrompt: buildImageGenerationPrompt(base) };
}

/**
 * 수정 요청을 규칙으로 반영한다 (Mock).
 * 실제로는 Claude 가 문장을 읽고 디자인을 다시 잡는다.
 */
function applyInstruction(design: VisualDesignPlan, instruction: string): VisualDesignPlan {
  let next = design;

  if (/텍스트|글자|문구/.test(instruction) && /줄|적게|최소|빼/.test(instruction)) {
    const half = Math.max(1, Math.ceil(next.sections.length / 2));
    next = { ...next, sections: next.sections.slice(0, half) };
  }

  if (/인물|사람/.test(instruction) && /빼|제외|없/.test(instruction)) {
    next = {
      ...next,
      visualElements: next.visualElements.map((element) =>
        element.emphasis === "primary"
          ? { ...element, subject: `인물 없이 ${element.subject}` }
          : element,
      ),
    };
  }

  if (/밝게|밝은/.test(instruction)) {
    next = {
      ...next,
      artDirection: {
        ...next.artDirection,
        backgroundStyle: `${next.artDirection.backgroundStyle} (더 밝게)`,
      },
    };
  }

  return { ...next, imagePrompt: buildImageGenerationPrompt(next) };
}

export function designVisualsWithMock(request: VisualDesignRequest): VisualDesignResult {
  const exclude = [...(request.excludeLayouts ?? [])];

  const designs = request.plans.map((plan) => {
    const ctx: DesignContext = {
      style: request.style,
      category: request.input.category,
      ratio: request.ratios[plan.type] ?? defaultRatio(plan.type),
      exclude,
    };

    const design =
      plan.type === "infographic"
        ? designInfographic(plan, ctx)
        : plan.type === "cardnews"
          ? designCardNews(plan, ctx)
          : plan.type === "article"
            ? designArticleVisual(plan, ctx)
            : designThumbnail(plan, ctx);

    // 같은 레이아웃이 연달아 나오지 않도록 기록한다
    exclude.push(design.layout);
    return request.instruction ? applyInstruction(design, request.instruction) : design;
  });

  return { designs, source: "MOCK" };
}

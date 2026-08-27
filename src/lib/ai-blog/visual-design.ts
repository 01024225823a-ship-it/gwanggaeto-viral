import type {
  AiBlogAspectRatio,
  AiBlogImageComposition,
  AiBlogOutline,
  AiBlogImageStyle,
  AiBlogImageType,
  ArtDirection,
  VisualLayout,
  VisualType,
} from "@/lib/ai-blog/types";

/**
 * 아트 디렉션 · 레이아웃 카탈로그.
 *
 * "무엇을 보여줄지"(VisualPlan) 다음에 오는 "어떻게 보여줄지"의 기준표다.
 * AI 디자인 기획과 Mock 디자인 기획, 그리고 이미지 생성 프롬프트가 모두 이 표를 공유해
 * 같은 스타일을 골랐을 때 결과가 일관되게 나온다.
 */

/* ------------------------------------------------------------------ */
/* 텍스트 밀도 — "이미지는 읽는 콘텐츠가 아니라 보는 콘텐츠"            */
/* ------------------------------------------------------------------ */

export const TEXT_LIMITS = {
  /** 헤드라인 */
  headline: 25,
  /** 보조 문구 */
  subheadline: 22,
  /** 가장 강조할 한 줄 */
  keyMessage: 24,
  /** 항목 제목 */
  sectionTitle: 10,
  /** 항목 설명 */
  sectionDescription: 30,
  /** 하단 안내 */
  footnote: 34,
  /** 인포그래픽 한 장의 정보 구획 수 */
  maxSections: 5,
  /** 대표 이미지는 정보를 나열하지 않는다 */
  thumbnailSections: 0,
} as const;

/** 글자 수 제한을 넘으면 단어 경계에서 자른다 */
export function clampText(text: string, max: number): string {
  const value = text.replace(/\s+/g, " ").trim();
  if (value.length <= max) return value;
  const sliced = value.slice(0, max);
  const at = sliced.lastIndexOf(" ");
  return (at >= Math.floor(max * 0.6) ? sliced.slice(0, at) : sliced).trim();
}

/* ------------------------------------------------------------------ */
/* 레이아웃 카탈로그                                                    */
/* ------------------------------------------------------------------ */

export interface LayoutSpec {
  id: VisualLayout;
  label: string;
  /** 어떤 정보에 어울리는지 (기획 프롬프트에 들어간다) */
  whenToUse: string;
  /** 이미지 생성 프롬프트에 넣을 영문 구도 지시 */
  composition: string;
  /** 이 레이아웃이 요구하는 최소 시각 요소 */
  requiredElements: string[];
}

export const LAYOUT_CATALOG: Record<VisualLayout, LayoutSpec> = {
  radial: {
    id: "radial",
    label: "중앙 비주얼 + 주변 포인트",
    whenToUse: "하나의 대상을 두고 확인할 항목이 3~5개일 때",
    composition:
      "central illustration anchored in the middle, information blocks radiating around it, thin connector lines from the center to each block",
    requiredElements: ["중앙 일러스트", "연결선", "번호 배지"],
  },
  timeline: {
    id: "timeline",
    label: "시간 흐름",
    whenToUse: "시점에 따라 달라지는 내용, 시기별 관리",
    composition:
      "vertical timeline with a continuous spine line, milestone dots on the spine, alternating text blocks on each side",
    requiredElements: ["타임라인 선", "시점 표시"],
  },
  comparison: {
    id: "comparison",
    label: "좌우 비교",
    whenToUse: "두 가지를 대조할 때, 맞는 것과 틀린 것을 가를 때",
    composition:
      "two vertical columns split by a center divider, matching rows aligned at the same height on both sides, contrasting accent colors per column",
    requiredElements: ["중앙 분할선", "좌우 대비 컬러"],
  },
  checklist: {
    id: "checklist",
    label: "체크리스트",
    whenToUse: "독자가 하나씩 확인해야 하는 항목",
    composition:
      "left aligned checkbox column, each row with a check mark, short bold label and a one line description",
    requiredElements: ["체크박스", "아이콘"],
  },
  process: {
    id: "process",
    label: "화살표 프로세스",
    whenToUse: "순서대로 진행해야 하는 절차",
    composition:
      "horizontal or vertical step flow, arrows connecting each step, step number badges, equal sized step blocks",
    requiredElements: ["화살표", "단계 번호"],
  },
  grid: {
    id: "grid",
    label: "균등 분할",
    whenToUse: "같은 층위의 항목을 나란히 보여줄 때",
    composition:
      "evenly divided card grid (2x2 or 3x1), each cell holding one icon, one short label and a one line description",
    requiredElements: ["아이콘", "구분 카드"],
  },
  diagram: {
    id: "diagram",
    label: "관계 도식",
    whenToUse: "구성 요소 사이의 관계를 설명할 때",
    composition:
      "simple node and link diagram, labelled shapes connected by lines, clear hierarchy from top to bottom",
    requiredElements: ["도형 노드", "연결선"],
  },
  numbered: {
    id: "numbered",
    label: "큰 번호",
    whenToUse: "개수를 강조할 때, 순위나 핵심 수치가 있을 때",
    composition:
      "oversized numerals as the dominant visual, short keyword beside each numeral, strong size contrast between numeral and text",
    requiredElements: ["대형 숫자", "키워드"],
  },
  hero: {
    id: "hero",
    label: "표지형",
    whenToUse: "표지, 대표 이미지처럼 주제를 각인시킬 때",
    composition:
      "one dominant headline occupying more than half of the canvas, a single supporting illustration, almost no body text",
    requiredElements: ["대형 타이포", "대표 일러스트"],
  },
  summary: {
    id: "summary",
    label: "정리·행동 유도",
    whenToUse: "마지막 장에서 핵심을 정리하고 행동을 안내할 때",
    composition:
      "three short summary lines stacked vertically, a highlighted action band at the bottom, minimal decoration",
    requiredElements: ["강조 밴드", "핵심 3줄"],
  },
  visual: {
    id: "visual",
    label: "이미지 중심",
    whenToUse: "본문 중간에 넣어 상황·분위기를 보여줄 때",
    composition:
      "a single full-bleed illustration filling the canvas, no information blocks, at most one short caption",
    requiredElements: ["대표 일러스트"],
  },
  mixed: {
    id: "mixed",
    label: "혼합",
    whenToUse: "위 구조 두 가지 이상을 함께 써야 할 때",
    composition:
      "combine two structures in one canvas, keep a clear primary structure and a smaller secondary block",
    requiredElements: ["주 구조", "보조 블록"],
  },
};

export const ALL_LAYOUTS = Object.keys(LAYOUT_CATALOG) as VisualLayout[];

export function layoutLabel(layout: VisualLayout): string {
  return LAYOUT_CATALOG[layout]?.label ?? layout;
}

/** 이미지 유형별로 허용할 레이아웃 */
export function allowedLayouts(type: AiBlogImageType): VisualLayout[] {
  if (type === "thumbnail") return ["hero"];
  if (type === "article") return ["visual"];
  if (type === "infographic") {
    return ["radial", "checklist", "process", "comparison", "numbered", "grid", "timeline", "diagram"];
  }
  return ALL_LAYOUTS;
}

/** VisualPlan 의 시각화 형태 → 기본 레이아웃 (Mock 과 프롬프트 힌트에 쓴다) */
export const LAYOUT_BY_VISUAL_TYPE: Record<VisualType, VisualLayout> = {
  checklist: "checklist",
  steps: "process",
  comparison: "comparison",
  numbers: "numbered",
  signals: "grid",
  criteria: "radial",
};

/**
 * 카드뉴스 장별 기본 레이아웃 순서.
 * 모든 장이 같은 템플릿이 되지 않도록, 장마다 다른 구조를 배정한다.
 */
export const CARD_LAYOUT_SEQUENCE: VisualLayout[] = [
  "hero",
  "grid",
  "comparison",
  "checklist",
  "process",
  "summary",
  "numbered",
  "timeline",
];

/** 장수에 맞춘 레이아웃 배열 — 첫 장은 표지, 마지막 장은 정리로 고정한다 */
export function cardLayoutSequence(count: number): VisualLayout[] {
  const middle = CARD_LAYOUT_SEQUENCE.filter((l) => l !== "hero" && l !== "summary");
  const body = Array.from({ length: Math.max(0, count - 2) }, (_, i) => middle[i % middle.length]);
  return count <= 1 ? ["hero"] : ["hero", ...body, "summary"];
}

/** 같은 레이아웃이 연속으로 반복되지 않게 고른다 */
export function pickLayout(
  candidates: VisualLayout[],
  exclude: VisualLayout[] = [],
  fallback: VisualLayout = "grid",
): VisualLayout {
  const fresh = candidates.filter((layout) => !exclude.includes(layout));
  return fresh[0] ?? candidates[0] ?? fallback;
}

/* ------------------------------------------------------------------ */
/* 아트 디렉션 프리셋                                                   */
/* ------------------------------------------------------------------ */

export interface ArtDirectionPreset extends ArtDirection {
  /** 이미지 생성 프롬프트에 넣을 영문 스타일 지시 */
  englishStyle: string[];
  /** 이 스타일에서 특히 피해야 할 것 */
  englishAvoid: string[];
}

/**
 * 스타일 선택이 색만 바꾸는 게 아니라 구성·요소·타이포까지 바꾸도록,
 * 스타일마다 아트 디렉션 전체를 정의한다.
 */
export const ART_DIRECTION_PRESETS: Record<AiBlogImageStyle, ArtDirectionPreset> = {
  business: {
    mood: "차분하고 신뢰감 있는 전문 정보형",
    illustrationStyle: "얇은 라인 아이콘과 절제된 벡터 일러스트",
    backgroundStyle: "화이트 배경에 네이비 포인트",
    typographyDirection: "굵기 대비가 분명한 고딕, 높은 가독성",
    density: "medium",
    palette: "화이트 · 네이비 · 라이트 그레이",
    englishStyle: [
      "professional Korean business editorial infographic",
      "clean white background with deep navy accents",
      "thin line icons, restrained vector illustration",
      "clear typographic hierarchy, high legibility",
      "generous spacing",
    ],
    englishAvoid: ["playful cartoon style", "heavy gradients", "decorative clutter"],
  },
  clean: {
    mood: "정보를 또렷하게 전달하는 데이터형",
    illustrationStyle: "다이어그램·도형 중심, 숫자 강조",
    backgroundStyle: "밝은 화이트 배경에 블루 포인트",
    typographyDirection: "숫자와 라벨의 크기 대비를 크게",
    density: "medium",
    palette: "화이트 · 블루 · 스카이",
    englishStyle: [
      "data driven infographic design",
      "diagram and grid based composition",
      "strong number emphasis with large numerals",
      "clean white background, blue accent color",
      "flat vector icons",
    ],
    englishAvoid: ["photographic textures", "hand drawn look", "dense paragraphs"],
  },
  warm: {
    mood: "부드럽고 친근한 라이프스타일",
    illustrationStyle: "둥근 형태의 소프트 일러스트와 라운드 아이콘",
    backgroundStyle: "베이지·크림 톤의 밝은 배경",
    typographyDirection: "둥근 고딕, 넉넉한 자간",
    density: "low",
    palette: "크림 · 소프트 오렌지 · 브라운",
    englishStyle: [
      "soft friendly Korean lifestyle illustration",
      "warm beige and cream background",
      "rounded icons and gently rounded cards",
      "approachable and calm tone",
      "soft shadows",
    ],
    englishAvoid: ["harsh contrast", "corporate stiffness", "technical diagrams"],
  },
  minimal: {
    mood: "여백이 넓은 모던 미니멀",
    illustrationStyle: "선과 면만 남긴 절제된 그래픽",
    backgroundStyle: "무채색 배경, 큰 여백",
    typographyDirection: "큰 타이포와 얇은 구분선, 장식 배제",
    density: "low",
    palette: "오프화이트 · 차콜 · 실버",
    englishStyle: [
      "editorial magazine minimalism",
      "very generous whitespace",
      "restrained monochrome graphics, hairline dividers",
      "refined large typography",
      "premium print feel",
    ],
    englishAvoid: ["many colors", "busy icon sets", "filled backgrounds"],
  },
  news: {
    mood: "시선을 잡는 강한 헤드라인 중심",
    illustrationStyle: "굵은 도형과 강한 대비의 그래픽",
    backgroundStyle: "상단 컬러 바와 강한 대비 배경",
    typographyDirection: "볼드 타이포, 위계 차이를 크게",
    density: "high",
    palette: "화이트 · 딥레드 · 블랙",
    englishStyle: [
      "bold typographic Korean news report design",
      "strong visual hierarchy, oversized headline",
      "high contrast color blocking with an accent bar",
      "confident editorial layout",
    ],
    englishAvoid: ["pastel softness", "thin decorative type", "low contrast"],
  },
};

export function artDirectionFor(style: AiBlogImageStyle): ArtDirectionPreset {
  return ART_DIRECTION_PRESETS[style] ?? ART_DIRECTION_PRESETS.business;
}

/** 밀도에 따라 한 장에 넣을 정보 구획 수 */
export function sectionCountFor(density: ArtDirection["density"]): number {
  if (density === "low") return 3;
  if (density === "high") return 5;
  return 4;
}

/* ------------------------------------------------------------------ */
/* 이미지 구성 · 해상도                                                 */
/* ------------------------------------------------------------------ */

/** 유형별 장수 제한 */
export const COMPOSITION_LIMITS = {
  thumbnailCount: { min: 0, max: 2 },
  articleVisualCount: { min: 0, max: 10 },
  infographicCount: { min: 0, max: 5 },
  cardNewsCount: { min: 0, max: 10 },
} as const;

/** 전체 최대 장수 */
export const COMPOSITION_TOTAL_MAX = 20;

/** 실사용 기준 초기값 — 처음부터 너무 많이 만들지 않는다 */
export const DEFAULT_COMPOSITION: AiBlogImageComposition = {
  mode: "auto",
  thumbnailCount: 1,
  articleVisualCount: 3,
  infographicCount: 1,
  cardNewsCount: 4,
};

export function compositionTotal(composition: AiBlogImageComposition): number {
  return (
    composition.thumbnailCount +
    composition.articleVisualCount +
    composition.infographicCount +
    composition.cardNewsCount
  );
}

export function clampComposition(composition: AiBlogImageComposition): AiBlogImageComposition {
  const clamp = (value: number, key: keyof typeof COMPOSITION_LIMITS) =>
    Math.min(COMPOSITION_LIMITS[key].max, Math.max(COMPOSITION_LIMITS[key].min, Math.round(value)));

  return {
    ...composition,
    thumbnailCount: clamp(composition.thumbnailCount, "thumbnailCount"),
    articleVisualCount: clamp(composition.articleVisualCount, "articleVisualCount"),
    infographicCount: clamp(composition.infographicCount, "infographicCount"),
    cardNewsCount: clamp(composition.cardNewsCount, "cardNewsCount"),
  };
}

/** 유형별 선택 가능한 비율 (첫 번째가 기본값) */
export const RATIO_OPTIONS: Record<AiBlogImageType, AiBlogAspectRatio[]> = {
  thumbnail: ["1:1", "4:3"],
  article: ["4:3", "16:9"],
  infographic: ["9:16", "4:5"],
  cardnews: ["1:1"],
};

/** 비율별 출력 해상도 (다운로드 파일 크기) */
export const RATIO_SIZE: Record<AiBlogAspectRatio, { width: number; height: number }> = {
  "1:1": { width: 1080, height: 1080 },
  "4:3": { width: 1200, height: 900 },
  "16:9": { width: 1280, height: 720 },
  "3:4": { width: 1080, height: 1440 },
  "4:5": { width: 1080, height: 1350 },
  // 세로 인포그래픽 — 정보 이미지 전용
  "27:40": { width: 1080, height: 1600 },
  "9:16": { width: 1080, height: 1920 },
};

export function sizeOf(ratio: AiBlogAspectRatio): { width: number; height: number } {
  return RATIO_SIZE[ratio] ?? RATIO_SIZE["1:1"];
}

export function defaultRatio(type: AiBlogImageType): AiBlogAspectRatio {
  return RATIO_OPTIONS[type]?.[0] ?? "1:1";
}

/**
 * 이미지 구성 자동 추천.
 *
 * 글자수만 보지 않고 원고 구조(소제목 수, 표·체크리스트·FAQ 유무)를 함께 본다.
 * 규칙 기반이라 추가 API 호출이 없다. AI 판단으로 바꾸려면 이 함수만 교체하면 된다.
 */
export function recommendComposition(
  outline: AiBlogOutline,
  articleLength: number,
): AiBlogImageComposition {
  const chars = outline.charCount || articleLength;
  const headings = outline.headings.length;
  const hasChecklist = outline.checklist.length > 0;
  const hasTable = outline.tableRows.length > 0;
  const faqs = outline.faqs.length;

  const long = chars >= 2_800;
  const medium = chars >= 1_800;

  let articleVisualCount = long ? 5 : medium ? 3 : 2;
  let infographicCount = long ? 3 : medium ? 2 : 1;
  let cardNewsCount = long ? 6 : medium ? 5 : 4;

  // 본문 이미지는 소제목 수를 넘지 않게 (넣을 자리가 없으면 의미가 없다)
  if (headings > 0) articleVisualCount = Math.min(articleVisualCount, headings);

  // 정리할 재료가 많으면 인포그래픽을 늘리고, 적으면 줄인다
  if (hasChecklist && hasTable) infographicCount += 1;
  if (!hasChecklist && !hasTable) infographicCount = Math.max(1, infographicCount - 1);
  // 분량 대비 과하게 늘지 않도록 상한을 둔다
  infographicCount = Math.min(infographicCount, long ? 3 : medium ? 2 : 1);

  // FAQ 가 많으면 카드뉴스로 풀어낼 거리가 많다
  if (faqs >= 4) cardNewsCount += 1;

  return clampComposition({
    mode: "auto",
    thumbnailCount: 1,
    articleVisualCount,
    infographicCount,
    cardNewsCount,
  });
}

/** 구성에서 실제로 만들 이미지 유형 목록 */
export function typesOf(composition: AiBlogImageComposition): AiBlogImageType[] {
  const types: AiBlogImageType[] = [];
  if (composition.thumbnailCount > 0) types.push("thumbnail");
  if (composition.articleVisualCount > 0) types.push("article");
  if (composition.infographicCount > 0) types.push("infographic");
  if (composition.cardNewsCount > 0) types.push("cardnews");
  return types;
}

/** 유형별로 골라야 하는 기획안 개수 (카드뉴스는 한 벌, 본문은 자동) */
export function requiredPlanCounts(
  composition: AiBlogImageComposition,
): Partial<Record<AiBlogImageType, number>> {
  return {
    thumbnail: composition.thumbnailCount,
    infographic: composition.infographicCount,
    cardnews: composition.cardNewsCount > 0 ? 1 : 0,
  };
}

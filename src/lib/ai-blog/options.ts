import { defaultRatio } from "@/lib/ai-blog/visual-design";
import type {
  AiBlogArticleType,
  AiBlogAspectRatio,
  AiBlogCategory,
  AiBlogImageStyle,
  AiBlogImageType,
  AiBlogPurpose,
  AiBlogReviseAction,
  VisualType,
} from "@/lib/ai-blog/types";

/**
 * AI 블로그 콘텐츠 제작 화면에서 쓰는 선택지 정의.
 *
 * 값(id)은 저장 구조(AiBlogProject)에 그대로 들어가므로 바꾸지 말 것.
 * 라벨/설명만 자유롭게 수정한다.
 */

interface Option<T extends string> {
  id: T;
  label: string;
  description?: string;
}

/* ------------------------------------------------------------------ */
/* 업종 · 목적 · 유형 · 분량                                            */
/* ------------------------------------------------------------------ */

export const AI_BLOG_CATEGORIES: Option<AiBlogCategory>[] = [
  { id: "realestate", label: "부동산" },
  { id: "legal", label: "법률" },
  { id: "health", label: "건강" },
  { id: "beauty", label: "뷰티" },
  { id: "food", label: "식품" },
  { id: "education", label: "교육" },
  { id: "finance", label: "금융" },
  { id: "auto", label: "자동차" },
  { id: "etc", label: "기타" },
];

/**
 * 사실 확인이 특히 중요한 분야.
 * 이 분야를 고르면 원고 확정 전 사실 확인 안내를 강조해서 보여준다.
 */
export const FACT_CHECK_CATEGORIES: AiBlogCategory[] = ["legal", "health", "finance"];

export const AI_BLOG_PURPOSES: Option<AiBlogPurpose>[] = [
  { id: "info", label: "정보 제공", description: "궁금증을 풀어주는 정보성 글" },
  { id: "seo", label: "SEO 노출", description: "검색 유입을 노리는 키워드 중심 글" },
  { id: "product", label: "제품·서비스 소개", description: "무엇을 어떻게 쓰는지 알려주는 글" },
  { id: "brand", label: "브랜드 인지도", description: "브랜드 관점과 전문성을 보여주는 글" },
  { id: "compare", label: "비교·분석", description: "선택지를 비교해 판단을 돕는 글" },
];

export const AI_BLOG_ARTICLE_TYPES: Option<AiBlogArticleType>[] = [
  { id: "expert", label: "전문 정보형", description: "기준과 근거를 정리해 설명합니다." },
  { id: "review", label: "후기형", description: "직접 겪은 것처럼 경험을 풀어냅니다." },
  {
    id: "monologue",
    label: "1인칭 독백형",
    description: "내가 알아보고 판단한 과정을 자연스럽게 풀어가는 글",
  },
  { id: "compare", label: "비교형", description: "선택지를 항목별로 비교합니다." },
  { id: "qna", label: "Q&A형", description: "질문과 답변으로 구성합니다." },
];

/**
 * 1인칭 독백형 예시 — STEP 1 "예시 보기"에서 그대로 보여준다.
 *
 * 이 유형이 후기형과 어떻게 다른지(사용 후기가 아니라 탐색·판단 과정)를
 * 설명 문구보다 예시로 보여주는 편이 빠르다.
 */
export const MONOLOGUE_EXAMPLE = `관절 영양제를 알아보다 보면 생각보다 선택하기가 어렵다.

종류도 많고 제품마다 설명도 비슷하다 보니 결국 하나씩 비교하게 된다.

그러다 알게 된 제품이 ○○였다.

처음에는 왜 이런 구성이 들어갔을까 싶었는데, 하나씩 살펴보니 나름의 이유가 있었다.

생각해보면 50~60대부터는 관절 하나만 챙기는 경우가 별로 없다.

그래서 오히려 이런 구성이 괜찮아 보였다.

내가 이 제품을 관심 있게 본 이유도 결국 이 부분이었다.`;

/** 자주 쓰는 분량 프리셋 (직접 입력도 가능) */
export const AI_BLOG_LENGTH_PRESETS = [1_500, 2_000, 3_000];

export const AI_BLOG_MIN_LENGTH = 500;
export const AI_BLOG_MAX_LENGTH = 6_000;

/* ------------------------------------------------------------------ */
/* 원고 수정 (AI 빠른 수정)                                             */
/* ------------------------------------------------------------------ */

export interface ReviseOption {
  action: AiBlogReviseAction;
  label: string;
  description: string;
}

export const AI_BLOG_REVISE_OPTIONS: ReviseOption[] = [
  { action: "professional", label: "더 전문적으로", description: "근거와 기준을 덧붙여 설명합니다." },
  { action: "simple", label: "쉽게 설명", description: "어려운 표현을 풀어 씁니다." },
  { action: "longer", label: "분량 늘리기", description: "각 문단에 설명을 추가합니다." },
  { action: "shorter", label: "분량 줄이기", description: "중복 문장을 정리합니다." },
  { action: "less-ad", label: "광고성 줄이기", description: "홍보 표현을 정보 표현으로 바꿉니다." },
  { action: "seo", label: "SEO 키워드 추가", description: "핵심 키워드를 자연스럽게 넣습니다." },
  { action: "retitle", label: "제목 다시 추천", description: "클릭을 부르는 제목으로 바꿉니다." },
  { action: "add-faq", label: "FAQ 추가", description: "자주 묻는 질문을 덧붙입니다." },
  { action: "add-table", label: "표·체크리스트 추가", description: "정리 표와 체크리스트를 넣습니다." },
];

/* ------------------------------------------------------------------ */
/* 이미지                                                               */
/* ------------------------------------------------------------------ */

export interface ImageTypeOption {
  id: AiBlogImageType;
  label: string;
  description: string;
  /** 고정 비율 (썸네일만 사용자가 고른다) */
  ratio?: AiBlogAspectRatio;
  ratioLabel: string;
  composition: string[];
}

export const AI_BLOG_IMAGE_TYPES: ImageTypeOption[] = [
  {
    id: "thumbnail",
    label: "블로그 대표 이미지",
    description: "블로그 상단에 쓰는 제목 중심 썸네일입니다.",
    ratioLabel: "1:1 또는 4:3",
    composition: ["제목", "보조 문구", "대표 비주얼"],
  },
  {
    id: "article",
    label: "본문 비주얼 이미지",
    description: "본문 중간에 넣어 상황과 분위기를 보여줍니다.",
    ratioLabel: "4:3 또는 16:9",
    composition: ["상황 일러스트", "텍스트 최소", "삽입 위치 추천"],
  },
  {
    id: "infographic",
    label: "핵심 요약 인포그래픽",
    description: "판단 기준을 한 장으로 정리합니다.",
    ratioLabel: "세로형",
    composition: ["핵심 질문", "판단 기준 4~5개", "시각 구조"],
  },
  {
    id: "cardnews",
    label: "정보 카드뉴스",
    description: "장마다 다른 구성으로 이야기를 풀어냅니다.",
    ratio: "1:1",
    ratioLabel: "정사각형",
    composition: ["표지", "핵심 정보", "체크리스트", "정리"],
  },
];

export const AI_BLOG_IMAGE_STYLES: Option<AiBlogImageStyle>[] = [
  { id: "business", label: "전문적인 비즈니스", description: "차분한 네이비·그레이 톤" },
  { id: "clean", label: "깔끔한 정보형", description: "여백이 넉넉한 화이트 톤" },
  { id: "warm", label: "따뜻한 라이프스타일", description: "부드러운 베이지·오렌지 톤" },
  { id: "minimal", label: "모던 미니멀", description: "선과 텍스트 위주의 절제된 톤" },
  { id: "news", label: "뉴스·리포트", description: "헤드라인이 강조된 보도 톤" },
];

/** 블로그 대표 이미지에서 고를 수 있는 비율 */
export const AI_BLOG_THUMBNAIL_RATIOS: AiBlogAspectRatio[] = ["1:1", "4:3"];

/** 카드뉴스 장수 */
export const AI_BLOG_CARD_COUNTS = [4, 6, 8];

/* ------------------------------------------------------------------ */
/* 라벨 조회                                                            */
/* ------------------------------------------------------------------ */

function labelOf<T extends string>(options: Option<T>[], id: T | undefined): string {
  return options.find((o) => o.id === id)?.label ?? "";
}

export function categoryLabel(id?: AiBlogCategory): string {
  return labelOf(AI_BLOG_CATEGORIES, id);
}

export function purposeLabel(id?: AiBlogPurpose): string {
  return labelOf(AI_BLOG_PURPOSES, id);
}

export function articleTypeLabel(id?: AiBlogArticleType): string {
  return labelOf(AI_BLOG_ARTICLE_TYPES, id);
}

export function imageStyleLabel(id?: AiBlogImageStyle): string {
  return labelOf(AI_BLOG_IMAGE_STYLES, id);
}

export function imageTypeLabel(id?: AiBlogImageType): string {
  return AI_BLOG_IMAGE_TYPES.find((t) => t.id === id)?.label ?? "";
}

/** 시각화 형태 표시명 */
export const VISUAL_TYPE_LABEL: Record<VisualType, string> = {
  checklist: "체크리스트",
  steps: "단계",
  comparison: "비교",
  numbers: "숫자",
  signals: "신호 점검",
  criteria: "판단 기준",
};

export function visualTypeLabel(id: VisualType): string {
  return VISUAL_TYPE_LABEL[id] ?? "";
}

/** 이미지 타입별 비율 — 사용자가 고른 값이 있으면 그 값을 쓴다 */
export function imageRatioOf(
  type: AiBlogImageType,
  ratios?: Partial<Record<AiBlogImageType, AiBlogAspectRatio>>,
): AiBlogAspectRatio {
  return ratios?.[type] ?? defaultRatio(type);
}

/** 이 분야는 발행 전 사실 확인 안내를 강조한다 */
export function needsFactCheck(category?: AiBlogCategory): boolean {
  return !!category && FACT_CHECK_CATEGORIES.includes(category);
}

/**
 * 도구형 서비스 — 주문(Order)이 아니라 사용자가 직접 쓰는 기능형 서비스.
 *
 * 일반 상품(Product)은 주문 → 배정 → 검수 흐름을 타지만,
 * 도구형 서비스는 전용 화면으로 바로 진입한다.
 * 카테고리 그리드·추천 목록·전체 서비스 목록에서는 상품 카드와 나란히 노출된다.
 *
 * 노출 위치는 categorySlug로 결정하므로, 새 도구를 추가할 때는
 * 카테고리(seed) 한 건과 이 목록 한 건만 맞춰주면 된다.
 */
export interface ServiceTool {
  id: string;
  /** 어떤 카테고리 자리에 노출할지 (Category.slug) */
  categorySlug: string;
  name: string;
  /** 카드 한 줄 설명 */
  description: string;
  /** 버튼 문구 */
  cta: string;
  href: string;
  /** 카드 우측 상단 뱃지 */
  badge?: string;
  /** 카드 하단 요약 태그 */
  highlights: string[];
  /** 추천 서비스 목록에도 노출할지 */
  recommended: boolean;
  /** 검색 매칭용 보조 키워드 */
  keywords: string[];
}

export const AI_BLOG_TOOL: ServiceTool = {
  id: "tool-ai-blog",
  categorySlug: "ai-blog",
  name: "AI 블로그 콘텐츠 제작",
  description: "전문적인 블로그 원고부터 인포그래픽·카드뉴스까지 AI로 한 번에 제작",
  cta: "콘텐츠 만들기",
  href: "/ai-blog",
  badge: "NEW",
  highlights: ["원고 자동 생성", "원고 수정", "이미지 제작"],
  recommended: true,
  keywords: ["AI", "블로그", "원고", "콘텐츠", "인포그래픽", "카드뉴스", "썸네일", "글쓰기"],
};

export const SERVICE_TOOLS: ServiceTool[] = [AI_BLOG_TOOL];

/** 해당 카테고리 자리에 놓인 도구형 서비스 */
export function findServiceTool(categorySlug?: string): ServiceTool | undefined {
  return categorySlug ? SERVICE_TOOLS.find((t) => t.categorySlug === categorySlug) : undefined;
}

/**
 * 카테고리 아이콘이 이동할 주소.
 * 도구형 서비스는 상품 목록이 아니라 전용 화면으로 바로 보낸다.
 */
export function categoryHref(categorySlug: string): string {
  return findServiceTool(categorySlug)?.href ?? `/services?category=${categorySlug}`;
}

function matchesKeyword(tool: ServiceTool, q: string): boolean {
  const haystack = [tool.name, tool.description, ...tool.keywords].join(" ").toLowerCase();
  return haystack.includes(q);
}

/**
 * 서비스 목록에 함께 보여줄 도구형 서비스.
 * 상품 목록과 같은 필터(카테고리·검색어·추천)를 적용한다.
 */
export function filterServiceTools(options: {
  categorySlug?: string;
  query?: string;
  recommendedOnly?: boolean;
  /** 활성 카테고리 슬러그 — 관리자가 카테고리를 끄면 도구도 함께 숨긴다 */
  activeCategorySlugs?: string[];
}): ServiceTool[] {
  const q = options.query?.trim().toLowerCase() ?? "";
  return SERVICE_TOOLS.filter((tool) => {
    if (options.activeCategorySlugs && !options.activeCategorySlugs.includes(tool.categorySlug)) {
      return false;
    }
    if (options.recommendedOnly && !tool.recommended) return false;
    if (options.categorySlug && tool.categorySlug !== options.categorySlug) return false;
    if (!q) return true;
    return matchesKeyword(tool, q);
  });
}

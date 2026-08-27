import { httpAiBlogService } from "@/lib/ai-blog/http-service";
import type {
  AiBlogArticle,
  AiBlogDraft,
  AiBlogImageRequest,
  AiBlogImageResult,
  AiBlogInput,
  AiBlogReviseInstruction,
  AiBlogSource,
  InfoVisualPlanRequest,
  InfoVisualPlanResult,
  InfoVisualReviseRequest,
  InfoVisualReviseResult,
  VisualDesignRequest,
  VisualDesignResult,
  VisualPlanRequest,
  VisualPlanResult,
} from "@/lib/ai-blog/types";

/**
 * AI 연동 지점.
 *
 * 화면(컴포넌트)은 반드시 getAiBlogService()로만 AI를 호출한다.
 *
 * 브라우저에서는 httpAiBlogService(서버 라우트 호출)가 기본으로 연결된다.
 *   브라우저 → POST /api/ai-blog/generate | revise → Anthropic API
 *
 * 실제 구현체는 서버가 고른다 (환경변수 AI_BLOG_PROVIDER).
 *   claude → lib/ai-blog/server/claude-service.ts (ClaudeAiBlogService)
 *   mock   → lib/ai-blog/mock-service.ts          (MockAiBlogService)
 *
 * API Key는 클라이언트에 절대 두지 않는다. 서버 라우트에서만 읽는다.
 * setAiBlogService()는 테스트나 특수한 환경에서 구현을 바꿔 끼울 때 쓴다.
 */
export interface AiBlogService {
  /** 현재 구현이 실제 AI인지 Mock인지 — 화면에 데모 배지를 띄우는 데 쓴다 */
  readonly mode: AiBlogSource;

  /** STEP 2 — 입력값으로 블로그 원고를 생성한다 */
  generateBlogArticle(input: AiBlogInput): Promise<AiBlogArticle>;

  /** STEP 3 — 현재 원고를 요청에 맞게 수정한다 */
  reviseBlogArticle(
    draft: AiBlogDraft,
    instruction: AiBlogReviseInstruction,
    input: AiBlogInput,
  ): Promise<AiBlogDraft>;

  /**
   * STEP 4 — 최종 원고를 분석해 정보 이미지 기획을 만든다. (현재 기본 경로)
   *
   * 이미지에 들어갈 내용은 전부 이 단계에서 정해지고,
   * 실제 그림은 SVG/Canvas 렌더러가 그린다 (이미지 생성 API 를 쓰지 않는다).
   */
  planInfoVisuals(request: InfoVisualPlanRequest): Promise<InfoVisualPlanResult>;

  /** STEP 5 — 이미지 한 장의 기획만 다시 만든다 (다른 이미지에는 영향이 없다) */
  reviseInfoVisual(request: InfoVisualReviseRequest): Promise<InfoVisualReviseResult>;

  /**
   * [LEGACY] 최종 원고를 분석해 "이미지로 만들 관점"을 기획한다.
   *
   * 실사·일러스트 기반 비주얼 파이프라인의 첫 단계다.
   * AI 블로그 기본 이미지 제작 경로에서는 더 이상 호출하지 않고,
   * 향후 별도 비주얼 이미지 기능을 붙일 때를 위해 유지한다.
   */
  planVisualContent(request: VisualPlanRequest): Promise<VisualPlanResult>;

  /**
   * [LEGACY] 콘텐츠 기획을 "어떻게 보여줄지" 디자인한다.
   * 위 planVisualContent 와 같은 이유로 유지만 한다.
   */
  designVisualContent(request: VisualDesignRequest): Promise<VisualDesignResult>;

  /** [LEGACY] 확정된 디자인 기획으로 이미지를 만든다 */
  generateImages(request: AiBlogImageRequest): Promise<AiBlogImageResult>;
}

let current: AiBlogService = httpAiBlogService;

/** 구현 교체 (테스트·특수 환경에서 1회 호출) */
export function setAiBlogService(service: AiBlogService): void {
  current = service;
}

export function getAiBlogService(): AiBlogService {
  return current;
}

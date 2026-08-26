import { httpAiBlogService } from "@/lib/ai-blog/http-service";
import type {
  AiBlogArticle,
  AiBlogDraft,
  AiBlogImageRequest,
  AiBlogImageResult,
  AiBlogInput,
  AiBlogReviseInstruction,
  AiBlogSource,
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

  /** STEP 4 — 최종 원고 기준으로 이미지 프롬프트와 결과 이미지를 만든다 */
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

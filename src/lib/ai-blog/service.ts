import { mockAiBlogService } from "@/lib/ai-blog/mock-service";
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
 * 지금은 Mock 구현이 연결되어 있고, 실제 API(OpenAI/Claude/Gemini 등)를 붙일 때는
 *
 *   1) AiBlogService를 구현한 새 모듈(예: lib/ai-blog/claude-service.ts)을 만들고
 *   2) 서버 라우트(app/api/ai-blog/...)를 통해 호출하도록 감싼 뒤
 *   3) 앱 초기화 시점에 setAiBlogService(newService)를 호출한다
 *
 * 화면 코드는 한 줄도 바꾸지 않아도 된다.
 * API Key는 클라이언트에 두지 말고 서버 라우트에서만 사용할 것.
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

let current: AiBlogService = mockAiBlogService;

/** 실제 AI 서비스로 교체 (앱 초기화 시 1회 호출) */
export function setAiBlogService(service: AiBlogService): void {
  current = service;
}

export function getAiBlogService(): AiBlogService {
  return current;
}

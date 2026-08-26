import { generateMockImages } from "@/lib/ai-blog/mock-images";
import type { AiBlogService } from "@/lib/ai-blog/service";
import type { AiBlogArticle, AiBlogDraft } from "@/lib/ai-blog/types";
import { currentAccountId } from "@/lib/store/session";

/**
 * 브라우저에서 쓰는 AI 블로그 서비스 구현.
 *
 * Anthropic 을 직접 호출하지 않고 우리 서버 라우트를 부른다.
 * API Key 는 서버에만 있으므로 이 파일에는 어떤 비밀값도 없다.
 *
 * 실제로 Claude 를 쓸지 Mock 을 쓸지는 서버(AI_BLOG_PROVIDER)가 정한다.
 * 응답의 mode 와 article.source 로 어느 쪽이 만들었는지 알 수 있다.
 */

interface ErrorBody {
  error?: { code?: string; message?: string };
}

/** 서버가 내려준 한국어 메시지를 그대로 사용자에게 보여준다 */
async function readError(response: Response): Promise<Error> {
  let message = "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
  try {
    const body = (await response.json()) as ErrorBody;
    if (body.error?.message) message = body.error.message;
  } catch {
    /* 본문이 JSON 이 아닌 경우(게이트웨이 오류 등) 기본 메시지를 쓴다 */
  }
  return new Error(message);
}

async function post<T>(path: string, payload: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // 네트워크 자체가 끊긴 경우
    throw new Error("네트워크 연결을 확인해 주세요.");
  }

  if (!response.ok) throw await readError(response);
  return (await response.json()) as T;
}

/** 로그인 상태에서만 호출한다 (화면에서도 비로그인은 로그인 모달로 막는다) */
function requireAccountId(): string {
  const accountId = currentAccountId();
  if (!accountId) throw new Error("로그인 후 이용할 수 있습니다.");
  return accountId;
}

export const httpAiBlogService: AiBlogService = {
  // 서버 설정에 따라 Mock 이 응답할 수도 있으므로, 실제 출처는 article.source 로 확인한다
  mode: "AI",

  async generateBlogArticle(input) {
    const { article } = await post<{ article: AiBlogArticle }>("/api/ai-blog/generate", {
      accountId: requireAccountId(),
      input,
    });
    return article;
  },

  async reviseBlogArticle(draft, instruction, input) {
    const { draft: next } = await post<{ draft: AiBlogDraft }>("/api/ai-blog/revise", {
      accountId: requireAccountId(),
      input,
      draft,
      instruction,
    });
    return next;
  },

  // 이미지 생성은 아직 API 를 붙이지 않았다 — 브라우저에서 Mock 으로 만든다
  generateImages(request) {
    return generateMockImages(request);
  },
};

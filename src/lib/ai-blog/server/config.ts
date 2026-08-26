/**
 * AI 블로그 서버 설정.
 *
 * ⚠ 이 파일과 같은 폴더(lib/ai-blog/server/)의 모듈은 **서버에서만** import 한다.
 *    클라이언트 컴포넌트에서 import 하면 API Key 가 브라우저 번들에 들어갈 수 있다.
 *    실제로 이 폴더를 import 하는 곳은 app/api/ai-blog/** 라우트 핸들러뿐이다.
 *
 * 모델명·제공자는 여기서만 읽는다. 다른 파일에 하드코딩하지 말 것.
 */

export type AiBlogProvider = "claude" | "mock";

/** 기본 모델 — 환경변수로 덮어쓸 수 있다 */
const DEFAULT_MODEL = "claude-sonnet-5";

/** 라우트 응답을 못 받고 끝나지 않도록 두는 상한 (초) */
export const ROUTE_MAX_DURATION = 60;

export interface AiBlogServerConfig {
  provider: AiBlogProvider;
  model: string;
  /** low | medium | high | xhigh | max — 미설정이면 API 기본값(high)을 쓴다 */
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
  apiKey?: string;
  /** 계정당 1분 허용 호출 수 */
  rateLimitPerMinute: number;
}

function readProvider(): AiBlogProvider {
  const raw = (process.env.AI_BLOG_PROVIDER ?? "claude").trim().toLowerCase();
  return raw === "mock" ? "mock" : "claude";
}

function readEffort(): AiBlogServerConfig["effort"] {
  const raw = (process.env.AI_BLOG_EFFORT ?? "").trim().toLowerCase();
  if (raw === "low" || raw === "medium" || raw === "high" || raw === "xhigh" || raw === "max") {
    return raw;
  }
  return undefined;
}

export function readAiBlogConfig(): AiBlogServerConfig {
  const rate = Number(process.env.AI_BLOG_RATE_LIMIT_PER_MINUTE);
  return {
    provider: readProvider(),
    model: (process.env.ANTHROPIC_MODEL ?? "").trim() || DEFAULT_MODEL,
    effort: readEffort(),
    apiKey: (process.env.ANTHROPIC_API_KEY ?? "").trim() || undefined,
    rateLimitPerMinute: Number.isFinite(rate) && rate > 0 ? rate : 10,
  };
}

/**
 * 설정이 실제로 쓸 수 있는 상태인지 확인한다.
 *
 * provider=claude 인데 API Key 가 없으면 **조용히 mock 으로 넘어가지 않는다.**
 * 개발자가 상태를 바로 알 수 있도록 설정 오류를 그대로 드러낸다.
 * mock 으로 돌리고 싶으면 AI_BLOG_PROVIDER=mock 을 명시해야 한다.
 */
export function assertUsableConfig(config: AiBlogServerConfig): void {
  if (config.provider === "claude" && !config.apiKey) {
    throw new AiBlogConfigError(
      "ANTHROPIC_API_KEY 가 설정되지 않았습니다. .env.local 에 키를 넣거나, AI_BLOG_PROVIDER=mock 으로 명시해 데모 모드로 실행하세요.",
    );
  }
}

export class AiBlogConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiBlogConfigError";
  }
}

import { mockImageProvider, setImageProvider } from "@/lib/ai-blog/image-provider";
import { mockAiBlogService } from "@/lib/ai-blog/mock-service";
import type { AiBlogService } from "@/lib/ai-blog/service";
import { createClaudeAiBlogService } from "@/lib/ai-blog/server/claude-service";
import { createRealImageProvider } from "@/lib/ai-blog/server/real-image-provider";
import { assertImageProvider, assertUsableConfig, readAiBlogConfig } from "@/lib/ai-blog/server/config";
import type { AiBlogServerConfig } from "@/lib/ai-blog/server/config";

/**
 * 요청 시점의 설정으로 실제 사용할 서비스를 고른다.
 *
 * AI_BLOG_PROVIDER=claude → Claude API
 * AI_BLOG_PROVIDER=mock   → 템플릿 기반 Mock (오프라인 개발·장애 대응용)
 *
 * claude 인데 키가 없으면 mock 으로 조용히 넘어가지 않고 설정 오류를 던진다.
 * (assertUsableConfig 참고 — 개발자가 상태를 헷갈리지 않게 하기 위한 의도적 동작)
 */
export function resolveAiBlogService(): {
  service: AiBlogService;
  config: AiBlogServerConfig;
} {
  const config = readAiBlogConfig();
  assertUsableConfig(config);
  assertImageProvider(config);

  // 이미지 생성 Provider 도 설정에 맞춰 갈아 끼운다
  setImageProvider(
    config.imageProvider === "real" ? createRealImageProvider(config) : mockImageProvider,
  );

  const service =
    config.provider === "mock" ? mockAiBlogService : createClaudeAiBlogService(config);

  return { service, config };
}

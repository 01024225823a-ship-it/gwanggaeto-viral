import { NextResponse } from "next/server";
import { generateImagesFromDesigns, getImageProvider } from "@/lib/ai-blog/image-provider";
import { mapError } from "@/lib/ai-blog/server/errors";
import { checkRateLimit, recordUsage, requireCustomer } from "@/lib/ai-blog/server/guard";
import { resolveAiBlogService } from "@/lib/ai-blog/server/resolve-service";
import { GenerateImagesBodySchema } from "@/lib/ai-blog/server/schema";

/**
 * POST /api/ai-blog/generate-images — 확정된 디자인으로 비주얼을 만든다.
 *
 * AI_IMAGE_PROVIDER=mock  → 그래픽 없이 텍스트 레이어만 (렌더러가 벡터 아트로 그림)
 * AI_IMAGE_PROVIDER=real  → 이미지 생성 API 로 "글자 없는 그래픽"만 받아온다
 *
 * 어느 쪽이든 한글 텍스트는 브라우저 렌더러가 합성한다.
 * 어떤 Provider 를 쓸지는 서버가 정하므로 클라이언트는 알 필요가 없다.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    // 설정 확인 + 이미지 Provider 주입
    const { config } = resolveAiBlogService();

    const body = GenerateImagesBodySchema.parse(await request.json());

    const account = requireCustomer(body.accountId);
    checkRateLimit(account.id, config.rateLimitPerMinute);
    recordUsage(account, "generate-images");

    const result = await generateImagesFromDesigns({ designs: body.designs });

    return NextResponse.json({ result, mode: getImageProvider().mode });
  } catch (error) {
    const { status, body } = mapError(error);
    return NextResponse.json(body, { status });
  }
}

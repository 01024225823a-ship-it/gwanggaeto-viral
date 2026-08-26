import { NextResponse } from "next/server";
import { mapError } from "@/lib/ai-blog/server/errors";
import { checkRateLimit, recordUsage, requireCustomer } from "@/lib/ai-blog/server/guard";
import { resolveAiBlogService } from "@/lib/ai-blog/server/resolve-service";
import { ReviseBodySchema } from "@/lib/ai-blog/server/schema";

/**
 * POST /api/ai-blog/revise — 원고 수정.
 *
 * AI 빠른 수정 버튼과 직접 입력 요청이 모두 이 라우트를 쓴다.
 * 사용자가 직접 고친 본문을 그대로 보내고, 요청한 부분만 바뀐 결과를 돌려받는다.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { service, config } = resolveAiBlogService();

    const body = ReviseBodySchema.parse(await request.json());

    const account = requireCustomer(body.accountId);
    checkRateLimit(account.id, config.rateLimitPerMinute);
    recordUsage(account, "revise");

    const draft = await service.reviseBlogArticle(body.draft, body.instruction, body.input);

    return NextResponse.json({ draft, mode: service.mode });
  } catch (error) {
    const { status, body } = mapError(error);
    return NextResponse.json(body, { status });
  }
}

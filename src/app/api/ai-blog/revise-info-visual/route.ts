import { NextResponse } from "next/server";
import { mapError } from "@/lib/ai-blog/server/errors";
import { checkRateLimit, recordUsage, requireCustomer } from "@/lib/ai-blog/server/guard";
import { resolveAiBlogService } from "@/lib/ai-blog/server/resolve-service";
import { ReviseInfoVisualBodySchema } from "@/lib/ai-blog/server/schema";

/**
 * POST /api/ai-blog/revise-info-visual — 정보 이미지 한 장만 수정.
 *
 * 결과 화면의 "수정 요청"·"다시 만들기"가 이 라우트를 쓴다.
 * 요청받은 이미지의 InfoVisualPlan 만 새로 만들어 돌려주므로
 * 다른 이미지에는 영향이 없다. (요구사항 15)
 */

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { service, config } = resolveAiBlogService();

    const body = ReviseInfoVisualBodySchema.parse(await request.json());

    const account = requireCustomer(body.accountId);
    checkRateLimit(account.id, config.rateLimitPerMinute);
    recordUsage(account, "revise-info-visual");

    const result = await service.reviseInfoVisual({
      draft: body.draft,
      input: body.input,
      plan: body.plan,
      instruction: body.instruction,
      siblingTitles: body.siblingTitles,
    });

    return NextResponse.json({ result, mode: service.mode });
  } catch (error) {
    const { status, body } = mapError(error);
    return NextResponse.json(body, { status });
  }
}

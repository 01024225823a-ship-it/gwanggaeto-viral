import { NextResponse } from "next/server";
import { mapError } from "@/lib/ai-blog/server/errors";
import { checkRateLimit, recordUsage, requireCustomer } from "@/lib/ai-blog/server/guard";
import { resolveAiBlogService } from "@/lib/ai-blog/server/resolve-service";
import { PlanVisualsBodySchema } from "@/lib/ai-blog/server/schema";

/**
 * POST /api/ai-blog/plan-visuals — 이미지 콘텐츠 기획.
 *
 * 최종 원고를 분석해 "이미지로 만들 관점"을 유형별로 3개씩 제안한다.
 * 이미지 제작은 여기서 나온 기획안만 사용하므로, 원고 문장이 이미지로
 * 그대로 옮겨가는 일이 구조적으로 생기지 않는다.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { service, config } = resolveAiBlogService();

    const body = PlanVisualsBodySchema.parse(await request.json());

    const account = requireCustomer(body.accountId);
    checkRateLimit(account.id, config.rateLimitPerMinute);
    recordUsage(account, "plan-visuals");

    const result = await service.planVisualContent({
      draft: body.draft,
      input: body.input,
      types: body.types,
      cardCount: body.cardCount,
      exclude: body.exclude,
    });

    return NextResponse.json({ result, mode: service.mode });
  } catch (error) {
    const { status, body } = mapError(error);
    return NextResponse.json(body, { status });
  }
}

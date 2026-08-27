import { NextResponse } from "next/server";
import { mapError } from "@/lib/ai-blog/server/errors";
import { checkRateLimit, recordUsage, requireCustomer } from "@/lib/ai-blog/server/guard";
import { resolveAiBlogService } from "@/lib/ai-blog/server/resolve-service";
import { PlanInfoVisualsBodySchema } from "@/lib/ai-blog/server/schema";

/**
 * POST /api/ai-blog/plan-info-visuals — 정보 이미지 기획.
 *
 * 최종 원고를 분석해 "이미지로 만들 가치가 있는 정보"만 뽑아 재구성한다.
 * 이미지 생성 API 는 호출하지 않는다 — 실제 그림은 브라우저의 SVG/Canvas 렌더러가 그린다.
 *
 * 원고 문장을 그대로 옮긴 곳이 있으면 서버에서 한 번 더 재기획을 요청하므로,
 * 원고와 이미지가 같은 문장을 반복하는 일이 구조적으로 줄어든다.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { service, config } = resolveAiBlogService();

    const body = PlanInfoVisualsBodySchema.parse(await request.json());

    const account = requireCustomer(body.accountId);
    checkRateLimit(account.id, config.rateLimitPerMinute);
    recordUsage(account, "plan-info-visuals");

    const result = await service.planInfoVisuals({
      draft: body.draft,
      input: body.input,
      infoCount: body.infoCount,
      withThumbnail: body.withThumbnail,
      exclude: body.exclude,
    });

    return NextResponse.json({ result, mode: service.mode });
  } catch (error) {
    const { status, body } = mapError(error);
    return NextResponse.json(body, { status });
  }
}

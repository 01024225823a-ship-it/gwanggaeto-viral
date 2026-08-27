import { NextResponse } from "next/server";
import { mapError } from "@/lib/ai-blog/server/errors";
import { checkRateLimit, recordUsage, requireCustomer } from "@/lib/ai-blog/server/guard";
import { resolveAiBlogService } from "@/lib/ai-blog/server/resolve-service";
import { DesignVisualsBodySchema } from "@/lib/ai-blog/server/schema";

/**
 * POST /api/ai-blog/design-visuals — 이미지 디자인 기획.
 *
 * 콘텐츠 기획(VisualPlan)을 받아 "어떻게 보여줄지"(VisualDesignPlan)를 만든다.
 * 레이아웃·시각 요소·정보 위계가 여기서 정해지고, 이미지 생성은 이 결과만 사용한다.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { service, config } = resolveAiBlogService();

    const body = DesignVisualsBodySchema.parse(await request.json());

    const account = requireCustomer(body.accountId);
    checkRateLimit(account.id, config.rateLimitPerMinute);
    recordUsage(account, "design-visuals");

    const result = await service.designVisualContent({
      plans: body.plans,
      input: body.input,
      style: body.style,
      ratios: body.ratios ?? {},
      excludeLayouts: body.excludeLayouts,
      instruction: body.instruction,
    });

    return NextResponse.json({ result, mode: service.mode });
  } catch (error) {
    const { status, body } = mapError(error);
    return NextResponse.json(body, { status });
  }
}

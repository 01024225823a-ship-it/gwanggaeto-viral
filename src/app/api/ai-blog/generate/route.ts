import { NextResponse } from "next/server";
import { mapError } from "@/lib/ai-blog/server/errors";
import { checkRateLimit, recordUsage, requireCustomer } from "@/lib/ai-blog/server/guard";
import { resolveAiBlogService } from "@/lib/ai-blog/server/resolve-service";
import { GenerateBodySchema } from "@/lib/ai-blog/server/schema";

/**
 * POST /api/ai-blog/generate — 원고 생성.
 *
 * 브라우저 → 이 라우트 → Anthropic API 순서로만 호출된다.
 * ANTHROPIC_API_KEY 는 이 서버 경계 안에서만 읽힌다.
 */

export const runtime = "nodejs";
/** 원고 생성은 수십 초가 걸릴 수 있다 (Vercel 기본 제한보다 길게 잡는다) */
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    // 1) 설정 확인 — 키가 없으면 AI 호출 전에 끝낸다
    const { service, config } = resolveAiBlogService();

    // 2) 입력 검증
    const body = GenerateBodySchema.parse(await request.json());

    // 3) 자격 확인 + 사용량 제한 (요금이 발생하기 전에)
    const account = requireCustomer(body.accountId);
    checkRateLimit(account.id, config.rateLimitPerMinute);
    recordUsage(account, "generate");

    // 4) 생성
    const article = await service.generateBlogArticle(body.input);

    return NextResponse.json({ article, mode: service.mode });
  } catch (error) {
    const { status, body } = mapError(error);
    return NextResponse.json(body, { status });
  }
}

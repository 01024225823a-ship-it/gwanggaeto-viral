import * as z from "zod";

/**
 * 라우트 요청 본문 검증.
 *
 * 브라우저가 보낸 값을 그대로 믿고 Anthropic 에 넘기지 않는다.
 * 여기서 걸러지는 값은 요금이 발생하기 전에 400 으로 끝난다.
 */

const ReferenceSchema = z.object({
  id: z.string(),
  kind: z.enum(["url", "text"]),
  value: z.string().max(4_000),
});

export const AiBlogInputSchema = z.object({
  topic: z.string().min(1).max(200),
  keywords: z.array(z.string().max(60)).max(10),
  category: z.enum([
    "realestate",
    "legal",
    "health",
    "beauty",
    "food",
    "education",
    "finance",
    "auto",
    "etc",
  ]),
  purpose: z.enum(["info", "seo", "product", "brand", "compare"]),
  target: z.string().max(100),
  articleType: z.enum(["expert", "review", "compare", "qna"]),
  articleLength: z.number().int().min(500).max(6_000),
  references: z.array(ReferenceSchema).max(10),
  requestNotes: z.string().max(2_000),
});

const DraftSchema = z.object({
  title: z.string().max(300),
  /** 편집기 본문 — 지나치게 큰 요청을 막는다 */
  body: z.string().min(1).max(40_000),
});

const InstructionSchema = z.object({
  action: z.enum([
    "professional",
    "simple",
    "longer",
    "shorter",
    "less-ad",
    "seo",
    "retitle",
    "add-faq",
    "add-table",
    "custom",
  ]),
  label: z.string().max(100),
  note: z.string().max(500).optional(),
});

export const GenerateBodySchema = z.object({
  /** 데모 세션의 계정 ID — server/guard.ts 에서 검증한다 */
  accountId: z.string().min(1).max(100),
  input: AiBlogInputSchema,
});

export const PlanVisualsBodySchema = z.object({
  accountId: z.string().min(1).max(100),
  input: AiBlogInputSchema,
  draft: DraftSchema,
  types: z.array(z.enum(["infographic", "cardnews", "thumbnail"])).min(1).max(3),
  cardCount: z.number().int().min(3).max(10),
  /** 이미 본 기획안 concept — "다른 아이디어 추천" */
  exclude: z.array(z.string().max(100)).max(30).optional(),
});

export const ReviseBodySchema = z.object({
  accountId: z.string().min(1).max(100),
  input: AiBlogInputSchema,
  draft: DraftSchema,
  instruction: InstructionSchema,
});

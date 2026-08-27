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
  articleType: z.enum(["expert", "review", "monologue", "compare", "qna"]),
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

/* ------------------------------------------------------------------ */
/* 정보 이미지 (기본 경로)                                              */
/* ------------------------------------------------------------------ */

const InfoVisualItemSchema = z.object({
  label: z.string().max(60),
  detail: z.string().max(200).optional(),
});

const InfoVisualPlanSchema = z.object({
  id: z.string().max(80),
  type: z.enum(["thumbnail", "summary", "checklist", "process", "comparison", "table", "number"]),
  title: z.string().min(1).max(120),
  subtitle: z.string().max(160).optional(),
  purpose: z.string().max(300),
  items: z.array(InfoVisualItemSchema).max(8),
  table: z
    .object({
      headers: z.tuple([z.string().max(60), z.string().max(60)]),
      rows: z.array(z.tuple([z.string().max(120), z.string().max(200)])).max(8),
    })
    .optional(),
  comparison: z
    .object({
      left: z.object({ title: z.string().max(80), items: z.array(z.string().max(160)).max(8) }),
      right: z.object({ title: z.string().max(80), items: z.array(z.string().max(160)).max(8) }),
    })
    .optional(),
  process: z.array(InfoVisualItemSchema).max(8).optional(),
  highlight: z.object({ value: z.string().max(12), caption: z.string().max(160) }).optional(),
  sourceSections: z.array(z.string().max(200)).max(5),
});

export const PlanInfoVisualsBodySchema = z.object({
  accountId: z.string().min(1).max(100),
  input: AiBlogInputSchema,
  draft: DraftSchema,
  /** 정보 이미지 장수 (대표 이미지 제외) */
  infoCount: z.number().int().min(1).max(6),
  withThumbnail: z.boolean(),
  /** 이미 본 이미지 제목 — "다시 추천" */
  exclude: z.array(z.string().max(160)).max(30).optional(),
});

export const ReviseInfoVisualBodySchema = z.object({
  accountId: z.string().min(1).max(100),
  input: AiBlogInputSchema,
  draft: DraftSchema,
  plan: InfoVisualPlanSchema,
  /** 비우면 "다른 각도로 다시 만들기" */
  instruction: z.string().max(300).optional(),
  siblingTitles: z.array(z.string().max(160)).max(10).optional(),
});

/* ------------------------------------------------------------------ */
/* [LEGACY] 비주얼 기획                                                 */
/* ------------------------------------------------------------------ */

export const PlanVisualsBodySchema = z.object({
  accountId: z.string().min(1).max(100),
  input: AiBlogInputSchema,
  draft: DraftSchema,
  types: z.array(z.enum(["thumbnail", "article", "infographic", "cardnews"])).min(1).max(4),
  cardCount: z.number().int().min(0).max(10),
  articleCount: z.number().int().min(0).max(10),
  /** 이미 본 기획안 concept — "다른 아이디어 추천" */
  exclude: z.array(z.string().max(100)).max(30).optional(),
});

export const ReviseBodySchema = z.object({
  accountId: z.string().min(1).max(100),
  input: AiBlogInputSchema,
  draft: DraftSchema,
  instruction: InstructionSchema,
});

/* ------------------------------------------------------------------ */
/* 디자인 기획                                                          */
/* ------------------------------------------------------------------ */

const VisualPlanItemSchema = z.object({
  title: z.string().max(60),
  description: z.string().max(200),
});

const VisualCardSchema = z.object({
  page: z.number().int().min(1).max(20),
  headline: z.string().max(120),
  body: z.string().max(300),
  visualDirection: z.string().max(200),
});

const VisualPlanBaseFields = {
  id: z.string().max(80),
  concept: z.string().max(100),
  goal: z.string().max(200),
  avoidOverlap: z.array(z.string().max(120)).max(5),
};

const VisualPlanSchema = z.discriminatedUnion("type", [
  z.object({
    ...VisualPlanBaseFields,
    type: z.literal("infographic"),
    headline: z.string().max(120),
    subheadline: z.string().max(120),
    visualType: z.enum(["checklist", "steps", "comparison", "numbers", "signals", "criteria"]),
    items: z.array(VisualPlanItemSchema).max(8),
    footer: z.string().max(200),
  }),
  z.object({
    ...VisualPlanBaseFields,
    type: z.literal("cardnews"),
    cards: z.array(VisualCardSchema).max(12),
  }),
  z.object({
    ...VisualPlanBaseFields,
    type: z.literal("thumbnail"),
    headline: z.string().max(120),
    subheadline: z.string().max(120),
  }),
  z.object({
    ...VisualPlanBaseFields,
    type: z.literal("article"),
    afterHeading: z.string().max(200),
    purpose: z.string().max(200),
    subject: z.string().max(200),
    scene: z.string().max(300),
    mood: z.string().max(200),
    visualDirection: z.string().max(300),
    textOverlay: z.string().max(120).optional(),
  }),
]);

const LayoutSchema = z.enum([
  "radial",
  "timeline",
  "comparison",
  "checklist",
  "process",
  "grid",
  "diagram",
  "numbered",
  "hero",
  "summary",
  "mixed",
]);

export const DesignVisualsBodySchema = z.object({
  accountId: z.string().min(1).max(100),
  input: AiBlogInputSchema,
  plans: z.array(VisualPlanSchema).min(1).max(20),
  style: z.enum(["business", "clean", "warm", "minimal", "news"]),
  ratios: z
    .partialRecord(
      z.enum(["thumbnail", "article", "infographic", "cardnews"]),
      z.enum(["1:1", "4:3", "16:9", "3:4", "4:5", "9:16"]),
    )
    .optional(),
  instruction: z.string().max(300).optional(),
  /** "다른 디자인 추천" — 이미 사용한 레이아웃 */
  excludeLayouts: z.array(LayoutSchema).max(20).optional(),
});

/* ------------------------------------------------------------------ */
/* 이미지 생성                                                          */
/* ------------------------------------------------------------------ */

const ElementSchema = z.object({
  type: z.enum([
    "illustration",
    "medical_illustration",
    "icon",
    "number",
    "arrow",
    "connector",
    "badge",
    "chart",
    "shape",
  ]),
  subject: z.string().max(300),
  position: z.enum([
    "center",
    "center-top",
    "center-bottom",
    "top-left",
    "top-right",
    "bottom-left",
    "bottom-right",
    "left",
    "right",
    "background",
  ]),
  emphasis: z.enum(["primary", "secondary", "accent"]),
});

const SectionSchema = z.object({
  marker: z.string().max(20).optional(),
  title: z.string().max(60),
  description: z.string().max(200).optional(),
  icon: z.string().max(200).optional(),
});

const RatioSchema = z.enum(["1:1", "4:3", "16:9", "3:4", "4:5", "9:16"]);

const VisualDesignPlanSchema = z.object({
  id: z.string().max(120),
  planId: z.string().max(120),
  type: z.enum(["thumbnail", "article", "infographic", "cardnews"]),
  concept: z.string().max(120),
  designGoal: z.string().max(300),
  layout: LayoutSchema,
  hierarchy: z.object({
    headline: z.string().max(200),
    subheadline: z.string().max(200).optional(),
    keyMessage: z.string().max(200).optional(),
  }),
  visualElements: z.array(ElementSchema).max(12),
  sections: z.array(SectionSchema).max(8),
  pages: z
    .array(
      z.object({
        page: z.number().int().min(1).max(20),
        layout: LayoutSchema,
        headline: z.string().max(200),
        keyMessage: z.string().max(200).optional(),
        sections: z.array(SectionSchema).max(8),
        visualElements: z.array(ElementSchema).max(12),
      }),
    )
    .max(20)
    .optional(),
  artDirection: z.object({
    mood: z.string().max(200),
    illustrationStyle: z.string().max(200),
    backgroundStyle: z.string().max(200),
    typographyDirection: z.string().max(200),
    density: z.enum(["low", "medium", "high"]),
    palette: z.string().max(200),
  }),
  style: z.enum(["business", "clean", "warm", "minimal", "news"]),
  ratio: RatioSchema,
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
  footnote: z.string().max(200).optional(),
  afterHeading: z.string().max(200).optional(),
  scene: z.string().max(300).optional(),
  imagePrompt: z.string().max(8_000),
  source: z.enum(["MOCK", "AI"]),
});

export const GenerateImagesBodySchema = z.object({
  accountId: z.string().min(1).max(100),
  designs: z.array(VisualDesignPlanSchema).min(1).max(20),
});

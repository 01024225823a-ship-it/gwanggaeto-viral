import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import * as z from "zod";
import type { AiBlogServerConfig } from "@/lib/ai-blog/server/config";
import { AiBlogGenerationError } from "@/lib/ai-blog/server/errors";
import type {
  AiBlogImageType,
  CardNewsPlan,
  InfographicPlan,
  ThumbnailPlan,
  VisualPlan,
  VisualPlanRequest,
  VisualPlanResult,
  VisualPlanSet,
} from "@/lib/ai-blog/types";
import { checkVisualOverlap } from "@/lib/ai-blog/visual-overlap";
import {
  VISUAL_IDEA_COUNT,
  buildOverlapRetryNote,
  buildVisualPlanPrompt,
  buildVisualPlanSystemPrompt,
} from "@/lib/ai-blog/visual-prompts";

/**
 * 이미지 콘텐츠 기획 — Claude 호출.
 *
 * 원고 → (여기) 기획 → 이미지 프롬프트 → 이미지
 *
 * 유형별로 따로 호출한다. 유형마다 기획 지침이 완전히 다르고,
 * 한 번에 묶어 물으면 세 유형이 서로 닮은 결과를 내놓기 때문이다.
 * 세 유형을 함께 요청한 경우에는 병렬로 호출한다.
 */

/* ------------------------------------------------------------------ */
/* 응답 스키마                                                          */
/* ------------------------------------------------------------------ */

const BaseFields = {
  concept: z.string().describe("기획안 이름. 12자 내외의 짧은 명사구."),
  goal: z.string().describe("이 이미지가 독자에게 해주는 일. 한 줄."),
  avoidOverlap: z
    .array(z.string())
    .describe("본문과 겹치지 않기 위해 지킨 규칙 1~3개."),
};

const InfographicIdeaSchema = z.object({
  ...BaseFields,
  headline: z.string().describe("메인 문구. 25자 내외."),
  subheadline: z.string().describe("보조 문구. 20자 내외. 없으면 빈 문자열."),
  visualType: z
    .enum(["checklist", "steps", "comparison", "numbers", "signals", "criteria"])
    .describe("내용에 가장 맞는 시각화 형태."),
  items: z
    .array(
      z.object({
        title: z.string().describe("2~8자 라벨."),
        description: z.string().describe("한 줄 설명. 25자 내외."),
      }),
    )
    .describe("구성 항목 4~5개."),
  footer: z.string().describe("하단 안내 문구. 필요 없으면 빈 문자열."),
});

const CardNewsIdeaSchema = z.object({
  ...BaseFields,
  cards: z
    .array(
      z.object({
        page: z.number().int().describe("장 번호. 1부터 시작."),
        headline: z.string().describe("그 장의 헤드라인. 두 줄 이내."),
        body: z.string().describe("본문. 40자 내외."),
        visualDirection: z.string().describe("그 장의 그림 방향 한 줄."),
      }),
    )
    .describe("요청받은 장수만큼."),
});

const ThumbnailIdeaSchema = z.object({
  ...BaseFields,
  headline: z.string().describe("클릭을 부르는 짧은 문구. 20자 내외."),
  subheadline: z.string().describe("보조 문구 한 줄. 20자 내외."),
});

const IdeaSchemaByType = {
  infographic: z.object({ ideas: z.array(InfographicIdeaSchema) }),
  cardnews: z.object({ ideas: z.array(CardNewsIdeaSchema) }),
  thumbnail: z.object({ ideas: z.array(ThumbnailIdeaSchema) }),
} as const;

/* ------------------------------------------------------------------ */
/* 변환                                                                 */
/* ------------------------------------------------------------------ */

type IdeaOf<T extends AiBlogImageType> = z.infer<(typeof IdeaSchemaByType)[T]>["ideas"][number];

function toPlan<T extends AiBlogImageType>(
  type: T,
  idea: IdeaOf<T>,
  index: number,
  cardCount: number,
): VisualPlan {
  const base = {
    id: `${type}-${index + 1}`,
    concept: idea.concept.trim(),
    goal: idea.goal.trim(),
    avoidOverlap: idea.avoidOverlap,
  };

  if (type === "infographic") {
    const it = idea as z.infer<typeof InfographicIdeaSchema>;
    const plan: InfographicPlan = {
      ...base,
      type: "infographic",
      headline: it.headline.trim(),
      subheadline: it.subheadline.trim(),
      visualType: it.visualType,
      items: it.items
        .map((item) => ({ title: item.title.trim(), description: item.description.trim() }))
        .filter((item) => item.title.length > 0)
        .slice(0, 5),
      footer: it.footer.trim(),
    };
    return plan;
  }

  if (type === "cardnews") {
    const it = idea as z.infer<typeof CardNewsIdeaSchema>;
    const plan: CardNewsPlan = {
      ...base,
      type: "cardnews",
      cards: it.cards
        .slice(0, cardCount)
        .map((card, i) => ({
          page: i + 1,
          headline: card.headline.trim(),
          body: card.body.trim(),
          visualDirection: card.visualDirection.trim(),
        })),
    };
    return plan;
  }

  const it = idea as z.infer<typeof ThumbnailIdeaSchema>;
  const plan: ThumbnailPlan = {
    ...base,
    type: "thumbnail",
    headline: it.headline.trim(),
    subheadline: it.subheadline.trim(),
  };
  return plan;
}

/* ------------------------------------------------------------------ */
/* 호출                                                                 */
/* ------------------------------------------------------------------ */

export async function planVisualsWithClaude(
  client: Anthropic,
  config: AiBlogServerConfig,
  request: VisualPlanRequest,
): Promise<VisualPlanResult> {
  const effort = config.effort ? { effort: config.effort } : {};

  async function planOne(type: AiBlogImageType, extraNote: string): Promise<VisualPlan[]> {
    const stream = client.messages.stream({
      model: config.model,
      max_tokens: 16_000,
      thinking: { type: "adaptive" },
      system: buildVisualPlanSystemPrompt(type),
      output_config: { format: zodOutputFormat(IdeaSchemaByType[type]), ...effort },
      messages: [
        { role: "user", content: `${buildVisualPlanPrompt(type, request)}${extraNote}` },
      ],
    });

    const message = await stream.finalMessage();
    if (message.stop_reason === "refusal") {
      throw new AiBlogGenerationError(
        "이 원고로는 이미지 기획을 만들 수 없습니다. 원고를 조정해 다시 시도해 주세요.",
      );
    }

    const parsed = message.parsed_output;
    if (!parsed || parsed.ideas.length === 0) return [];

    return parsed.ideas
      .slice(0, VISUAL_IDEA_COUNT)
      .map((idea, i) => toPlan(type, idea as IdeaOf<typeof type>, i, request.cardCount));
  }

  async function planAll(extraNote: string): Promise<VisualPlanSet> {
    const entries = await Promise.all(
      request.types.map(async (type) => [type, await planOne(type, extraNote)] as const),
    );
    const set: VisualPlanSet = {};
    for (const [type, plans] of entries) set[type] = plans;
    return set;
  }

  let plans = await planAll("");
  let overlap = checkVisualOverlap(Object.values(plans).flat(), request.draft);

  // 원고 문장을 그대로 옮긴 곳이 있으면 그 문구를 알려주고 한 번만 다시 기획한다
  if (!overlap.ok) {
    const retry = await planAll(buildOverlapRetryNote(overlap.duplicates));
    const retryOverlap = checkVisualOverlap(Object.values(retry).flat(), request.draft);
    if (retryOverlap.duplicates.length < overlap.duplicates.length) {
      plans = retry;
      overlap = retryOverlap;
    }
  }

  if (Object.values(plans).flat().length === 0) {
    throw new AiBlogGenerationError(
      "이미지 기획안을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.",
    );
  }

  return { plans, overlap, source: "AI" };
}

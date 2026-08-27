import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import * as z from "zod";
import {
  buildInfoOverlapRetryNote,
  buildInfoVisualPlanPrompt,
  buildInfoVisualRevisePrompt,
  buildInfoVisualReviseSystemPrompt,
  buildInfoVisualSystemPrompt,
} from "@/lib/ai-blog/info-visual-prompts";
import {
  diversifyInfoPlans,
  sanitizeInfoPlan,
  withInfoPlanIds,
} from "@/lib/ai-blog/info-visual";
import type { AiBlogServerConfig } from "@/lib/ai-blog/server/config";
import { AiBlogGenerationError } from "@/lib/ai-blog/server/errors";
import type {
  InfoVisualPlan,
  InfoVisualPlanRequest,
  InfoVisualPlanResult,
  InfoVisualReviseRequest,
  InfoVisualReviseResult,
} from "@/lib/ai-blog/types";
import { checkInfoVisualOverlap } from "@/lib/ai-blog/visual-overlap";

/**
 * 정보 이미지 기획 — Claude 호출.
 *
 *   최종 원고 → (여기) 정보 추출·재구성 → InfoVisualPlan → SVG/Canvas
 *
 * 이미지 생성 API 를 호출하지 않는다. Claude 는 "무엇을 시각화할지"와
 * "이미지에 들어갈 짧은 문구"만 정하고, 그리는 일은 렌더러가 한다.
 *
 * 한 번의 호출로 세트 전체를 기획한다.
 * 유형이 겹치지 않게 배분하려면 모델이 전체를 함께 봐야 하기 때문이다.
 */

/* ------------------------------------------------------------------ */
/* 응답 스키마                                                          */
/* ------------------------------------------------------------------ */

/**
 * 구조화 출력은 optional 을 쓰지 않고 모든 필드를 채우게 한다.
 * 쓰지 않는 필드는 빈 배열·빈 문자열로 받고, 아래 toPlan 에서 정리한다.
 */
const ItemSchema = z.object({
  label: z.string().describe("2~10자 명사구 라벨."),
  detail: z.string().describe("30자 이내 한 줄 설명. 없으면 빈 문자열."),
});

const InfoVisualSchema = z.object({
  type: z
    .enum(["thumbnail", "summary", "checklist", "process", "comparison", "table", "number"])
    .describe("정보 구조에 가장 맞는 유형."),
  title: z.string().describe("이미지 제목. 원고 소제목을 그대로 쓰지 않는다. 25자 이내."),
  subtitle: z.string().describe("제목 아래 한 줄. 필요 없으면 빈 문자열."),
  purpose: z.string().describe("이 이미지가 독자에게 해주는 일. 한 줄."),
  items: z.array(ItemSchema).describe("summary·checklist·number 용 항목. 그 외에는 빈 배열."),
  table: z
    .object({
      headers: z.array(z.string()).describe("열 제목 2개."),
      rows: z.array(z.array(z.string())).describe("행 배열. 각 행은 정확히 2칸."),
    })
    .describe("table 용. 그 외에는 headers·rows 를 빈 배열로."),
  comparison: z
    .object({
      leftTitle: z.string(),
      leftItems: z.array(z.string()),
      rightTitle: z.string(),
      rightItems: z.array(z.string()),
    })
    .describe("comparison 용. 그 외에는 빈 문자열·빈 배열로."),
  process: z.array(ItemSchema).describe("process 용 단계. 그 외에는 빈 배열."),
  highlight: z
    .object({
      value: z.string().describe("크게 보여줄 짧은 값. 보통 한두 글자 숫자."),
      caption: z.string().describe("값 아래 짧은 설명."),
    })
    .describe("number 용. 그 외에는 빈 문자열로."),
  sourceSections: z.array(z.string()).describe("이 정보를 뽑아낸 원고 소제목 1~2개."),
});

const PlanSetSchema = z.object({
  visuals: z.array(InfoVisualSchema).describe("요청받은 장수만큼."),
});

type ParsedVisual = z.infer<typeof InfoVisualSchema>;

/* ------------------------------------------------------------------ */
/* 변환                                                                 */
/* ------------------------------------------------------------------ */

function toItems(rows: Array<{ label: string; detail: string }>) {
  return rows.map((row) => ({ label: row.label, detail: row.detail }));
}

function toPlan(raw: ParsedVisual, index: number): InfoVisualPlan {
  const rows = raw.table.rows
    .map((row) => [row[0] ?? "", row[1] ?? ""] as [string, string])
    .filter((row) => row[0].trim().length > 0);

  const plan: InfoVisualPlan = {
    id: `info-${index}`,
    type: raw.type,
    title: raw.title,
    subtitle: raw.subtitle || undefined,
    purpose: raw.purpose,
    items: toItems(raw.items),
    table:
      rows.length > 0
        ? {
            headers: [raw.table.headers[0] ?? "", raw.table.headers[1] ?? ""] as [string, string],
            rows,
          }
        : undefined,
    comparison:
      raw.comparison.leftItems.length > 0 && raw.comparison.rightItems.length > 0
        ? {
            left: { title: raw.comparison.leftTitle, items: raw.comparison.leftItems },
            right: { title: raw.comparison.rightTitle, items: raw.comparison.rightItems },
          }
        : undefined,
    process: raw.process.length > 0 ? toItems(raw.process) : undefined,
    highlight: raw.highlight.value ? raw.highlight : undefined,
    sourceSections: raw.sourceSections,
  };

  return sanitizeInfoPlan(plan);
}

/**
 * 대표 이미지는 항상 맨 앞 한 장만 남긴다.
 * (모델이 대표 이미지를 여러 장 만들거나 순서를 바꿔 보내는 경우가 있다)
 */
function orderPlans(plans: InfoVisualPlan[], request: InfoVisualPlanRequest): InfoVisualPlan[] {
  const thumbnails = plans.filter((plan) => plan.type === "thumbnail");
  const infos = plans.filter((plan) => plan.type !== "thumbnail");

  const ordered = diversifyInfoPlans(infos).slice(0, request.infoCount);
  const head = request.withThumbnail ? thumbnails.slice(0, 1) : [];

  return withInfoPlanIds([...head, ...ordered]);
}

/* ------------------------------------------------------------------ */
/* 호출                                                                 */
/* ------------------------------------------------------------------ */

export async function planInfoVisualsWithClaude(
  client: Anthropic,
  config: AiBlogServerConfig,
  request: InfoVisualPlanRequest,
): Promise<InfoVisualPlanResult> {
  const effort = config.effort ? { effort: config.effort } : {};

  async function ask(extraNote: string): Promise<InfoVisualPlan[]> {
    const stream = client.messages.stream({
      model: config.model,
      max_tokens: 16_000,
      thinking: { type: "adaptive" },
      system: buildInfoVisualSystemPrompt(request.input.articleType),
      output_config: { format: zodOutputFormat(PlanSetSchema), ...effort },
      messages: [
        { role: "user", content: `${buildInfoVisualPlanPrompt(request)}${extraNote}` },
      ],
    });

    const message = await stream.finalMessage();
    if (message.stop_reason === "refusal") {
      throw new AiBlogGenerationError(
        "이 원고로는 이미지 기획을 만들 수 없습니다. 원고를 조정해 다시 시도해 주세요.",
      );
    }

    const parsed = message.parsed_output;
    if (!parsed || parsed.visuals.length === 0) return [];

    return orderPlans(
      parsed.visuals.map((raw, i) => toPlan(raw, i)),
      request,
    );
  }

  let plans = await ask("");
  let overlap = checkInfoVisualOverlap(plans, request.draft);

  // 원고 문장을 그대로 옮긴 곳이 있으면 그 문구를 알려주고 한 번만 다시 기획한다
  if (!overlap.ok) {
    const retry = await ask(buildInfoOverlapRetryNote(overlap.duplicates));
    const retryOverlap = checkInfoVisualOverlap(retry, request.draft);
    if (retry.length > 0 && retryOverlap.duplicates.length < overlap.duplicates.length) {
      plans = retry;
      overlap = retryOverlap;
    }
  }

  if (plans.length === 0) {
    throw new AiBlogGenerationError(
      "이미지 기획을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.",
    );
  }

  return { plans, overlap, source: "AI" };
}

/** 이미지 한 장만 다시 기획한다 (다른 이미지에는 영향이 없다) */
export async function reviseInfoVisualWithClaude(
  client: Anthropic,
  config: AiBlogServerConfig,
  request: InfoVisualReviseRequest,
): Promise<InfoVisualReviseResult> {
  const effort = config.effort ? { effort: config.effort } : {};

  const stream = client.messages.stream({
    model: config.model,
    max_tokens: 8_000,
    thinking: { type: "adaptive" },
    system: buildInfoVisualReviseSystemPrompt(request.input.articleType),
    output_config: { format: zodOutputFormat(InfoVisualSchema), ...effort },
    messages: [{ role: "user", content: buildInfoVisualRevisePrompt(request) }],
  });

  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") {
    throw new AiBlogGenerationError(
      "이 요청은 반영할 수 없습니다. 다른 표현으로 요청해 주세요.",
    );
  }

  const parsed = message.parsed_output;
  if (!parsed || !parsed.title.trim()) {
    throw new AiBlogGenerationError("이미지 수정 결과를 받지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }

  // 대표 이미지는 유형이 바뀌면 결과 화면 구성이 무너지므로 원래 유형을 지킨다
  const next = toPlan(
    request.plan.type === "thumbnail" ? { ...parsed, type: "thumbnail" } : parsed,
    0,
  );

  return { plan: { ...next, id: request.plan.id }, source: "AI" };
}

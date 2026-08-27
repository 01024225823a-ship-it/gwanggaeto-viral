/**
 * [LEGACY] 실사·일러스트 비주얼 파이프라인.
 *
 * AI 블로그 **기본** 이미지 제작 경로는 정보 이미지로 대체됐다.
 *   최종 원고 → InfoVisualPlan (lib/ai-blog/info-visual.ts)
 *             → SVG/Canvas (render/info-layout.ts) → PNG
 *
 * 이 모듈은 기본 경로에서 호출하지 않는다.
 * 향후 별도 "비주얼 이미지" 기능을 다시 붙일 때를 위해 삭제하지 않고 유지한다.
 */

import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import * as z from "zod";
import type { AiBlogServerConfig } from "@/lib/ai-blog/server/config";
import { AiBlogGenerationError } from "@/lib/ai-blog/server/errors";
import type {
  AiBlogAspectRatio,
  VisualDesignPage,
  VisualDesignPlan,
  VisualDesignRequest,
  VisualDesignResult,
  VisualElement,
  VisualLayout,
  VisualPlan,
  VisualSection,
} from "@/lib/ai-blog/types";
import {
  ALL_LAYOUTS,
  TEXT_LIMITS,
  allowedLayouts,
  artDirectionFor,
  cardLayoutSequence,
  clampText,
  defaultRatio,
  sectionCountFor,
} from "@/lib/ai-blog/visual-design";
import { buildDesignPrompt, buildDesignSystemPrompt, buildImageGenerationPrompt } from "@/lib/ai-blog/visual-prompts";

/**
 * 디자인 기획 — Claude 호출 (아트 디렉터 역할).
 *
 *   VisualPlan(무엇을 보여줄지) → 이 파일 → VisualDesignPlan(어떻게 보여줄지)
 *
 * 원고는 여기까지 오지 않는다. 콘텐츠 기획 결과만 보고 레이아웃·시각 요소를 정한다.
 * 이미지 유형마다 지침이 완전히 다르므로 유형별로 따로 호출하고, 여러 개면 병렬로 실행한다.
 */

/* ------------------------------------------------------------------ */
/* 응답 스키마                                                          */
/* ------------------------------------------------------------------ */

const LAYOUT_VALUES = ALL_LAYOUTS as [VisualLayout, ...VisualLayout[]];

const ElementSchema = z.object({
  type: z
    .enum([
      "illustration",
      "medical_illustration",
      "icon",
      "number",
      "arrow",
      "connector",
      "badge",
      "chart",
      "shape",
    ])
    .describe("시각 요소 종류. chart 는 근거 있는 수치가 있을 때만."),
  subject: z.string().describe("무엇을 그릴지 한국어로 구체적으로."),
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
  emphasis: z.enum(["primary", "secondary", "accent"]).describe("primary 는 한 장에 하나만."),
});

const SectionSchema = z.object({
  marker: z.string().describe("01, 02 또는 STEP 1 처럼 앞에 붙는 표시."),
  title: z.string().describe(`항목 제목. ${TEXT_LIMITS.sectionTitle}자 이내.`),
  description: z.string().describe(`한 줄 설명. ${TEXT_LIMITS.sectionDescription}자 이내.`),
  icon: z.string().describe("이 항목을 대표하는 아이콘 서술."),
});

const InfographicDesignSchema = z.object({
  concept: z.string().describe("디자인 콘셉트 이름. 12자 내외."),
  designGoal: z.string().describe("이 디자인이 노리는 효과. 한 줄."),
  layout: z.enum(LAYOUT_VALUES).describe("정보 성격에 가장 맞는 레이아웃."),
  headline: z.string().describe(`${TEXT_LIMITS.headline}자 이내.`),
  subheadline: z.string().describe(`${TEXT_LIMITS.subheadline}자 이내. 없으면 빈 문자열.`),
  keyMessage: z.string().describe("가장 크게 보여줄 한 줄. 없으면 빈 문자열."),
  sections: z.array(SectionSchema).describe(`${TEXT_LIMITS.maxSections}개 이하.`),
  visualElements: z.array(ElementSchema).describe("3개 이상."),
  footnote: z.string().describe("하단 안내 문구. 없으면 빈 문자열."),
});

const ThumbnailDesignSchema = z.object({
  concept: z.string().describe("디자인 콘셉트 이름. 12자 내외."),
  designGoal: z.string().describe("이 디자인이 노리는 효과. 한 줄."),
  headline: z.string().describe(`${TEXT_LIMITS.headline}자 이내. 클릭을 부르는 짧은 문구.`),
  subheadline: z.string().describe(`${TEXT_LIMITS.subheadline}자 이내. 없으면 빈 문자열.`),
  visualElements: z.array(ElementSchema).describe("대표 일러스트를 primary 로 포함. 2개 이상."),
});

const CardNewsDesignSchema = z.object({
  concept: z.string().describe("디자인 콘셉트 이름. 12자 내외."),
  designGoal: z.string().describe("이 카드뉴스가 노리는 효과. 한 줄."),
  pages: z
    .array(
      z.object({
        page: z.number().int().describe("장 번호. 1부터."),
        layout: z.enum(LAYOUT_VALUES).describe("장마다 다른 레이아웃을 쓴다."),
        headline: z.string().describe(`${TEXT_LIMITS.headline}자 이내.`),
        keyMessage: z.string().describe("이 장에서 가장 강조할 한 줄. 없으면 빈 문자열."),
        sections: z.array(SectionSchema).describe("2~4개. 표지·마무리는 0~1개."),
        visualElements: z.array(ElementSchema).describe("2개 이상."),
      }),
    )
    .describe("요청받은 장수만큼."),
});

/* ------------------------------------------------------------------ */
/* 정리                                                                 */
/* ------------------------------------------------------------------ */

function toSections(raw: z.infer<typeof SectionSchema>[], limit: number): VisualSection[] {
  return raw
    .slice(0, limit)
    .map((section, i) => ({
      marker: section.marker.trim() || String(i + 1).padStart(2, "0"),
      title: clampText(section.title, TEXT_LIMITS.sectionTitle),
      description: section.description
        ? clampText(section.description, TEXT_LIMITS.sectionDescription)
        : undefined,
      icon: section.icon.trim() || undefined,
    }))
    .filter((section) => section.title.length > 0);
}

function toElements(raw: z.infer<typeof ElementSchema>[]): VisualElement[] {
  const elements = raw
    .filter((element) => element.subject.trim().length > 0)
    .map((element) => ({ ...element, subject: element.subject.trim() }));

  // primary 는 한 장에 하나만 남긴다
  let primarySeen = false;
  return elements.map((element) => {
    if (element.emphasis !== "primary") return element;
    if (primarySeen) return { ...element, emphasis: "secondary" as const };
    primarySeen = true;
    return element;
  });
}

/** 허용되지 않은 레이아웃이면 대체한다 */
function safeLayout(
  type: VisualDesignPlan["type"],
  layout: VisualLayout,
  fallback: VisualLayout,
): VisualLayout {
  return allowedLayouts(type).includes(layout) ? layout : fallback;
}

/** 같은 레이아웃이 연달아 오지 않게 고친다 */
function dedupeSequential(layouts: VisualLayout[]): VisualLayout[] {
  const sequence = cardLayoutSequence(layouts.length);
  return layouts.map((layout, i) => {
    if (i === 0 || layout !== layouts[i - 1]) return layout;
    return sequence[i] === layout ? (sequence[(i + 1) % sequence.length] ?? "grid") : sequence[i];
  });
}

/* ------------------------------------------------------------------ */
/* 호출                                                                 */
/* ------------------------------------------------------------------ */

export async function designVisualsWithClaude(
  client: Anthropic,
  config: AiBlogServerConfig,
  request: VisualDesignRequest,
): Promise<VisualDesignResult> {
  const effort = config.effort ? { effort: config.effort } : {};
  const art = artDirectionFor(request.style);
  const category = request.input.category;

  function ratioFor(plan: VisualPlan): AiBlogAspectRatio {
    return request.ratios[plan.type] ?? defaultRatio(plan.type);
  }

  async function designOne(plan: VisualPlan): Promise<VisualDesignPlan> {
    const ratio = ratioFor(plan);
    const schema =
      plan.type === "infographic"
        ? InfographicDesignSchema
        : plan.type === "cardnews"
          ? CardNewsDesignSchema
          : ThumbnailDesignSchema;

    const stream = client.messages.stream({
      model: config.model,
      max_tokens: 16_000,
      thinking: { type: "adaptive" },
      system: buildDesignSystemPrompt(plan.type, request.style),
      output_config: { format: zodOutputFormat(schema), ...effort },
      messages: [
        {
          role: "user",
          content: buildDesignPrompt(plan, request.input, ratio, request.excludeLayouts ?? [], request.instruction),
        },
      ],
    });

    const message = await stream.finalMessage();
    if (message.stop_reason === "refusal") {
      throw new AiBlogGenerationError(
        "이 기획안으로는 디자인을 만들 수 없습니다. 다른 기획안을 골라 주세요.",
      );
    }

    const parsed = message.parsed_output;
    if (!parsed) {
      throw new AiBlogGenerationError("디자인 기획을 받지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }

    const common = {
      id: `${plan.id}-design`,
      planId: plan.id,
      concept: parsed.concept.trim() || plan.concept,
      designGoal: parsed.designGoal.trim() || plan.goal,
      artDirection: art,
      style: request.style,
      ratio,
      category,
      source: "AI" as const,
    };

    if (plan.type === "article") {
      const it = parsed as z.infer<typeof ThumbnailDesignSchema>;
      const base: VisualDesignPlan = {
        ...common,
        type: "article",
        layout: "visual",
        hierarchy: {
          headline: plan.textOverlay ? clampText(plan.textOverlay, TEXT_LIMITS.headline) : "",
          subheadline: clampText(plan.scene, TEXT_LIMITS.subheadline),
        },
        // 본문 비주얼은 정보를 나열하지 않는다
        sections: [],
        visualElements: toElements(it.visualElements),
        afterHeading: plan.afterHeading,
        scene: plan.scene,
        imagePrompt: "",
      };
      return { ...base, imagePrompt: buildImageGenerationPrompt(base) };
    }

    if (plan.type === "thumbnail") {
      const it = parsed as z.infer<typeof ThumbnailDesignSchema>;
      const base: VisualDesignPlan = {
        ...common,
        type: "thumbnail",
        layout: "hero",
        hierarchy: {
          headline: clampText(it.headline, TEXT_LIMITS.headline),
          subheadline: it.subheadline ? clampText(it.subheadline, TEXT_LIMITS.subheadline) : undefined,
        },
        // 대표 이미지는 정보를 나열하지 않는다 — 구획은 강제로 비운다
        sections: [],
        visualElements: toElements(it.visualElements),
        imagePrompt: "",
      };
      return { ...base, imagePrompt: buildImageGenerationPrompt(base) };
    }

    if (plan.type === "cardnews") {
      const it = parsed as z.infer<typeof CardNewsDesignSchema>;
      const raw = it.pages.slice(0, plan.cards.length);
      const layouts = dedupeSequential(
        raw.map((page, i) => safeLayout("cardnews", page.layout, cardLayoutSequence(raw.length)[i] ?? "grid")),
      );

      const pages: VisualDesignPage[] = raw.map((page, i) => {
        const layout = layouts[i] ?? "grid";
        return {
          page: i + 1,
          layout,
          headline: clampText(page.headline, TEXT_LIMITS.headline),
          keyMessage: page.keyMessage ? clampText(page.keyMessage, TEXT_LIMITS.keyMessage) : undefined,
          sections: toSections(page.sections, layout === "hero" ? 0 : 4),
          visualElements: toElements(page.visualElements),
        };
      });

      const base: VisualDesignPlan = {
        ...common,
        type: "cardnews",
        layout: "mixed",
        hierarchy: { headline: pages[0]?.headline ?? common.concept },
        sections: [],
        visualElements: pages[0]?.visualElements ?? [],
        pages,
        imagePrompt: "",
      };
      return { ...base, imagePrompt: buildImageGenerationPrompt(base) };
    }

    const it = parsed as z.infer<typeof InfographicDesignSchema>;
    const layout = safeLayout("infographic", it.layout, "grid");
    const base: VisualDesignPlan = {
      ...common,
      type: "infographic",
      layout,
      hierarchy: {
        headline: clampText(it.headline, TEXT_LIMITS.headline),
        subheadline: it.subheadline ? clampText(it.subheadline, TEXT_LIMITS.subheadline) : undefined,
        keyMessage: it.keyMessage ? clampText(it.keyMessage, TEXT_LIMITS.keyMessage) : undefined,
      },
      sections: toSections(
        it.sections,
        Math.min(TEXT_LIMITS.maxSections, sectionCountFor(art.density)),
      ),
      visualElements: toElements(it.visualElements),
      footnote: it.footnote ? clampText(it.footnote, TEXT_LIMITS.footnote) : undefined,
      imagePrompt: "",
    };
    return { ...base, imagePrompt: buildImageGenerationPrompt(base) };
  }

  const designs = await Promise.all(request.plans.map(designOne));
  return { designs, source: "AI" };
}

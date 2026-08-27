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

import type { ImageProvider } from "@/lib/ai-blog/image-provider";
import type { AiBlogServerConfig } from "@/lib/ai-blog/server/config";
import type { GeneratedImage, VisualDesignPage, VisualDesignPlan } from "@/lib/ai-blog/types";
import { sizeOf } from "@/lib/ai-blog/visual-design";
import { buildCardPagePrompt } from "@/lib/ai-blog/visual-prompts";

/**
 * 실제 이미지 생성 Provider (AI_IMAGE_PROVIDER=real).
 *
 * 그래픽만 생성하고 한글 텍스트는 그리지 않는다.
 * 정확한 한글은 웹 렌더러(render/layout.ts)가 그래픽 위에 얹는다 —
 * 이미지 모델이 한글을 못 그려도 결과물이 깨지지 않게 하기 위한 구조다.
 *
 * 호출 규약 (직접 만든 게이트웨이든 상용 API든 이 형태로 맞추면 된다)
 *   POST {AI_IMAGE_API_URL}
 *   { prompt, width, height, format: "png" }
 *   → 200 { url: "https://..." }
 *
 * 실패해도 예외를 밖으로 던지지 않는다. 해당 이미지 한 장만
 * status="FAILED" 로 돌려주고, 화면이 "다시 만들기"를 안내한다.
 */

interface GenerateResponse {
  url?: string;
  image_url?: string;
}

async function requestGraphic(
  config: AiBlogServerConfig,
  prompt: string,
  width: number,
  height: number,
): Promise<{ url?: string; error?: string }> {
  const endpoint = config.imageApiUrl;
  if (!endpoint) return { error: "이미지 생성 API 주소가 설정되지 않았습니다." };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.imageApiKey ? { Authorization: `Bearer ${config.imageApiKey}` } : {}),
      },
      body: JSON.stringify({ prompt, width, height, format: "png" }),
      // 라우트 제한시간 안에서 끝나도록
      signal: AbortSignal.timeout(40_000),
    });

    if (!response.ok) {
      return { error: `이미지 생성 서버가 ${response.status} 로 응답했습니다.` };
    }

    const body = (await response.json()) as GenerateResponse;
    const url = body.url ?? body.image_url;
    if (!url) return { error: "이미지 주소를 받지 못했습니다." };
    return { url };
  } catch (error) {
    console.error("[ai-blog] image generation failed:", error);
    return { error: "이미지 생성 요청이 실패했습니다." };
  }
}

/**
 * 이미지 모델에는 "글자 없는 그래픽"만 요청한다.
 * 한글 렌더링은 웹에서 처리하므로 텍스트 지시를 걷어낸다.
 */
function graphicOnlyPrompt(prompt: string): string {
  const cut = prompt.indexOf("Korean text content");
  const base = cut > 0 ? prompt.slice(0, cut).trimEnd() : prompt;
  return [
    base,
    "",
    "IMPORTANT: Render background, illustration, icons, shapes and color only.",
    "Do NOT draw any text, letters, numbers or captions anywhere in the image.",
    "Leave clean empty space where text blocks are described — text is composited separately.",
  ].join("\n");
}

export function createRealImageProvider(config: AiBlogServerConfig): ImageProvider {
  function base(design: VisualDesignPlan, id: string, prompt: string) {
    const { width, height } = sizeOf(design.ratio);
    return {
      id,
      type: design.type,
      prompt,
      width,
      height,
      mimeType: "image/png",
      ratio: design.ratio,
      style: design.style,
      visualElements: design.visualElements,
      artDirection: design.artDirection,
    };
  }

  function textLayer(design: VisualDesignPlan) {
    return {
      layout: design.layout,
      headline: design.hierarchy.headline,
      subheadline: design.hierarchy.subheadline,
      keyMessage: design.hierarchy.keyMessage,
      sections: design.sections,
      footnote: design.footnote,
      page: 0,
    };
  }

  async function single(design: VisualDesignPlan, suffix: string): Promise<GeneratedImage> {
    const { width, height } = sizeOf(design.ratio);
    const result = await requestGraphic(config, graphicOnlyPrompt(design.imagePrompt), width, height);

    return {
      ...base(design, `${design.id}-${suffix}`, design.imagePrompt),
      page: 0,
      textLayer: textLayer(design),
      url: result.url,
      status: result.url ? "READY" : "FAILED",
      error: result.error,
    };
  }

  return {
    mode: "REAL",

    generateInfographic: (design) => single(design, "infographic"),
    generateThumbnail: (design) => single(design, "thumbnail"),
    generateArticleVisual: (design) => single(design, "article"),

    async generateCardNews(design) {
      const pages = design.pages ?? [];
      const total = pages.length;
      const { width, height } = sizeOf(design.ratio);

      return Promise.all(
        pages.map(async (page: VisualDesignPage) => {
          const prompt = buildCardPagePrompt(design, page);
          const result = await requestGraphic(config, graphicOnlyPrompt(prompt), width, height);

          return {
            ...base(design, `${design.id}-card-${page.page}`, prompt),
            page: page.page,
            visualElements: page.visualElements,
            textLayer: {
              layout: page.layout,
              headline: page.headline,
              keyMessage: page.keyMessage,
              sections: page.sections,
              footnote: page.page === total ? design.footnote : undefined,
              page: page.page,
              totalPages: total,
            },
            url: result.url,
            status: (result.url ? "READY" : "FAILED") as GeneratedImage["status"],
            error: result.error,
          };
        }),
      );
    },
  };
}

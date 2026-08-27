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

import type {
  AiBlogImageAsset,
  AiBlogImageRequest,
  AiBlogImageResult,
  GeneratedImage,
  ImageTextLayer,
  VisualDesignPage,
  VisualDesignPlan,
} from "@/lib/ai-blog/types";
import { artDirectionFor, sizeOf } from "@/lib/ai-blog/visual-design";
import { buildCardPagePrompt, buildImageGenerationPrompt } from "@/lib/ai-blog/visual-prompts";

/**
 * 이미지 생성 Provider.
 *
 *   VisualPlan → VisualDesignPlan → ImageProvider → 결과 이미지
 *
 * 실제 이미지 생성 API를 나중에 붙여도 화면·기획 계층을 다시 만들지 않도록,
 * 생성 단계만 이 인터페이스 뒤에 둔다. (AI_IMAGE_PROVIDER=mock | real)
 *
 * 지금은 mock 구현만 있다. mock 은 이미지를 만들지 않고,
 * 디자인 기획을 그대로 담은 "레이아웃 미리보기"용 데이터를 돌려준다.
 */
export interface ImageProvider {
  readonly mode: "MOCK" | "REAL";
  generateInfographic(design: VisualDesignPlan): Promise<GeneratedImage>;
  generateCardNews(design: VisualDesignPlan): Promise<GeneratedImage[]>;
  generateThumbnail(design: VisualDesignPlan): Promise<GeneratedImage>;
  /** 본문 비주얼 — 본문 중간에 넣는 상황 이미지 */
  generateArticleVisual(design: VisualDesignPlan): Promise<GeneratedImage>;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/* ------------------------------------------------------------------ */
/* 텍스트 레이어                                                        */
/* ------------------------------------------------------------------ */

/**
 * 이미지에 올릴 한글 텍스트를 이미지와 분리해 들고 간다.
 * 생성 모델이 한글을 못 그려도 웹 렌더러가 이 레이어를 그대로 얹을 수 있다.
 */
function textLayerOf(design: VisualDesignPlan): ImageTextLayer {
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

function pageTextLayer(
  design: VisualDesignPlan,
  page: VisualDesignPage,
  total: number,
): ImageTextLayer {
  return {
    layout: page.layout,
    headline: page.headline,
    keyMessage: page.keyMessage,
    sections: page.sections,
    footnote: page.page === total ? design.footnote : undefined,
    page: page.page,
    totalPages: total,
  };
}

function baseImage(design: VisualDesignPlan, id: string, prompt: string): Omit<GeneratedImage, "textLayer" | "page"> {
  const { width, height } = sizeOf(design.ratio);
  return {
    id,
    type: design.type,
    prompt,
    status: "MOCK",
    width,
    height,
    mimeType: "image/png",
    ratio: design.ratio,
    style: design.style,
    visualElements: design.visualElements,
    artDirection: design.artDirection,
  };
}

/* ------------------------------------------------------------------ */
/* Mock Provider                                                        */
/* ------------------------------------------------------------------ */

export const mockImageProvider: ImageProvider = {
  mode: "MOCK",

  async generateInfographic(design) {
    await delay(500);
    return {
      ...baseImage(design, `${design.id}-infographic`, design.imagePrompt),
      page: 0,
      textLayer: textLayerOf(design),
    };
  },

  async generateArticleVisual(design) {
    await delay(400);
    return {
      ...baseImage(design, `${design.id}-article`, design.imagePrompt),
      page: 0,
      textLayer: textLayerOf(design),
    };
  },

  async generateThumbnail(design) {
    await delay(400);
    return {
      ...baseImage(design, `${design.id}-thumbnail`, design.imagePrompt),
      page: 0,
      textLayer: textLayerOf(design),
    };
  },

  async generateCardNews(design) {
    await delay(700);
    const pages = design.pages ?? [];
    const total = pages.length;

    return pages.map((page) => ({
      ...baseImage(design, `${design.id}-card-${page.page}`, buildCardPagePrompt(design, page)),
      page: page.page,
      textLayer: pageTextLayer(design, page, total),
      visualElements: page.visualElements,
    }));
  },
};

/* ------------------------------------------------------------------ */
/* Provider 교체 지점                                                   */
/* ------------------------------------------------------------------ */

let current: ImageProvider = mockImageProvider;

/** 실제 이미지 생성 구현으로 교체 (서버 라우트에서 주입한다) */
export function setImageProvider(provider: ImageProvider): void {
  current = provider;
}

export function getImageProvider(): ImageProvider {
  return current;
}

/* ------------------------------------------------------------------ */
/* 실행                                                                 */
/* ------------------------------------------------------------------ */

/** GeneratedImage → 화면·저장용 자산 */
export function toAsset(image: GeneratedImage, design: VisualDesignPlan): AiBlogImageAsset {
  const { textLayer } = image;
  return {
    id: image.id,
    type: image.type,
    index: image.page,
    designId: design.id,
    layout: textLayer.layout,
    title: textLayer.headline,
    subtitle: textLayer.subheadline,
    keyMessage: textLayer.keyMessage,
    sections: textLayer.sections,
    visualElements: image.visualElements,
    footnote:
      textLayer.footnote ??
      (textLayer.totalPages ? `${textLayer.page} / ${textLayer.totalPages}` : undefined),
    ratio: image.ratio,
    style: image.style,
    palette: image.artDirection.palette,
    totalPages: textLayer.totalPages,
    width: image.width,
    height: image.height,
    mimeType: image.mimeType,
    afterHeading: design.afterHeading,
    scene: design.scene,
    category: design.category,
    error: image.error,
    url: image.url,
    prompt: image.prompt,
    status: image.status,
  };
}

/** 확정된 디자인 기획으로 이미지를 만든다 */
export async function generateImagesFromDesigns(
  request: AiBlogImageRequest,
): Promise<AiBlogImageResult> {
  const provider = getImageProvider();

  const perDesign = await Promise.all(
    request.designs.map(async (design) => {
      if (design.type === "cardnews") return provider.generateCardNews(design);
      if (design.type === "thumbnail") return [await provider.generateThumbnail(design)];
      if (design.type === "article") return [await provider.generateArticleVisual(design)];
      return [await provider.generateInfographic(design)];
    }),
  );

  const images: GeneratedImage[] = [];
  const assets: AiBlogImageAsset[] = [];

  for (const [i, group] of perDesign.entries()) {
    const design = request.designs[i];
    for (const image of group) {
      images.push(image);
      assets.push(toAsset(image, design));
    }
  }

  return { images, assets };
}

/** 디자인 기획의 이미지 생성 프롬프트를 다시 계산한다 (기획 저장 시 사용) */
export function refreshImagePrompt(design: VisualDesignPlan): VisualDesignPlan {
  return { ...design, imagePrompt: buildImageGenerationPrompt(design) };
}

/** 아트 디렉션이 비어 있을 때 스타일 기본값으로 채운다 */
export function fillArtDirection(design: VisualDesignPlan): VisualDesignPlan {
  if (design.artDirection) return design;
  return { ...design, artDirection: artDirectionFor(design.style) };
}

/**
 * 디자인 기획을 그대로 미리보기 자산으로 바꾼다 (이미지 생성 전 확인용).
 * 생성 결과와 같은 구조를 쓰므로, 미리보기에서 본 레이아웃이 그대로 결과가 된다.
 */
export function designToPreviewAssets(design: VisualDesignPlan): AiBlogImageAsset[] {
  const size = sizeOf(design.ratio);
  const common = {
    type: design.type,
    designId: design.id,
    ratio: design.ratio,
    style: design.style,
    palette: design.artDirection.palette,
    prompt: design.imagePrompt,
    status: "MOCK" as const,
    width: size.width,
    height: size.height,
    mimeType: "image/png",
    afterHeading: design.afterHeading,
    scene: design.scene,
    category: design.category,
  };

  if (design.type === "cardnews") {
    const pages = design.pages ?? [];
    return pages.map((page) => ({
      ...common,
      id: `${design.id}-preview-${page.page}`,
      index: page.page,
      layout: page.layout,
      title: page.headline,
      keyMessage: page.keyMessage,
      sections: page.sections,
      visualElements: page.visualElements,
      footnote: `${page.page} / ${pages.length}`,
      totalPages: pages.length,
    }));
  }

  return [
    {
      ...common,
      id: `${design.id}-preview`,
      index: 0,
      layout: design.layout,
      title: design.hierarchy.headline,
      subtitle: design.hierarchy.subheadline,
      keyMessage: design.hierarchy.keyMessage,
      sections: design.sections,
      visualElements: design.visualElements,
      footnote: design.footnote,
    },
  ];
}

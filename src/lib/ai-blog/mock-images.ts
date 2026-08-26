import { buildImagePrompts } from "@/lib/ai-blog/prompts";
import type { AiBlogImageAsset, AiBlogImageRequest, AiBlogImageResult } from "@/lib/ai-blog/types";

/**
 * 이미지 제작 Mock.
 *
 * 실제 이미지 생성 API는 아직 연결하지 않는다. 여기서는 최종 원고에서
 * 이미지 프롬프트를 만들고, 그 구성을 그대로 담은 "데모 미리보기" 자산을 돌려준다.
 * (원고 생성이 Claude API로 바뀌어도 이미지 단계는 이 구현을 계속 쓴다)
 *
 * 원고 생성 Mock(mock-service.ts)과 분리해 둔 이유:
 * 실제 API를 쓰는 경로에서도 이미지 단계는 이 모듈만 필요하므로,
 * 업종 플레이북 같은 무거운 모듈을 클라이언트 번들에 끌고 오지 않기 위함이다.
 */

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function toAssets(request: AiBlogImageRequest, stamp: number): AiBlogImageAsset[] {
  const prompts = buildImagePrompts(request);
  const assets: AiBlogImageAsset[] = [];

  for (const prompt of prompts) {
    if (prompt.type === "infographic") {
      assets.push({
        id: `img-${stamp}-infographic`,
        type: "infographic",
        index: 0,
        title: request.outline.title,
        lines: prompt.points,
        footnote: prompt.footnote,
        ratio: prompt.ratio,
        style: prompt.style,
        prompt: prompt.text,
        status: "MOCK",
      });
      continue;
    }

    if (prompt.type === "cardnews") {
      for (const card of prompt.cards) {
        assets.push({
          id: `img-${stamp}-card-${card.index}`,
          type: "cardnews",
          index: card.index,
          title: card.title,
          lines: card.lines,
          footnote: `${card.index} / ${prompt.cards.length}`,
          ratio: prompt.ratio,
          style: prompt.style,
          prompt: prompt.text,
          status: "MOCK",
        });
      }
      continue;
    }

    assets.push({
      id: `img-${stamp}-thumbnail`,
      type: "thumbnail",
      index: 0,
      title: request.outline.title,
      lines: prompt.titleLines,
      footnote: prompt.subtitle,
      ratio: prompt.ratio,
      style: prompt.style,
      prompt: prompt.text,
      status: "MOCK",
    });
  }

  return assets;
}

export async function generateMockImages(request: AiBlogImageRequest): Promise<AiBlogImageResult> {
  await delay(1_500);
  const stamp = Date.now();
  return { prompts: buildImagePrompts(request), assets: toAssets(request, stamp) };
}

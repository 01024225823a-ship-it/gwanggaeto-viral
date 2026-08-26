import type { AiBlogImageAsset, AiBlogImageRequest, AiBlogImageResult } from "@/lib/ai-blog/types";
import { buildImagePrompts } from "@/lib/ai-blog/visual-prompts";

/**
 * 이미지 제작 Mock.
 *
 * 실제 이미지 생성 API는 아직 연결하지 않는다. 여기서는 선택된 기획안(VisualPlan)을
 * 이미지 프롬프트로 바꾸고, 그 구성을 그대로 담은 "데모 미리보기" 자산을 돌려준다.
 *
 * 중요한 점은 미리보기에 들어가는 문구도 원고가 아니라 **기획안**에서 나온다는 것이다.
 * 그래서 실제 이미지 API를 붙여도 화면에 보이는 내용이 달라지지 않는다.
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
        id: `img-${stamp}-${prompt.planId}`,
        type: "infographic",
        index: 0,
        title: prompt.headline,
        subtitle: prompt.subheadline,
        lines: prompt.items.map((item) => `${item.title} — ${item.description}`),
        footnote: prompt.footer,
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
          id: `img-${stamp}-${prompt.planId}-${card.page}`,
          type: "cardnews",
          index: card.page,
          title: card.headline,
          lines: card.body ? [card.body] : [],
          footnote: `${card.page} / ${prompt.cards.length}`,
          ratio: prompt.ratio,
          style: prompt.style,
          prompt: prompt.text,
          status: "MOCK",
        });
      }
      continue;
    }

    assets.push({
      id: `img-${stamp}-${prompt.planId}`,
      type: "thumbnail",
      index: 0,
      title: prompt.titleLines.join(" "),
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
  await delay(1_200);
  const stamp = Date.now();
  return { prompts: buildImagePrompts(request), assets: toAssets(request, stamp) };
}

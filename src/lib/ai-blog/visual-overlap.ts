import { outlineFromDraft, toPlainText } from "@/lib/ai-blog/article";
import type { AiBlogDraft, VisualOverlapReport, VisualPlan } from "@/lib/ai-blog/types";

/**
 * 원고–이미지 중복 검사.
 *
 * 이미지는 원고를 "요약"하는 것이 아니라 "보완"해야 한다.
 * 그래서 기획안에 원고 문장이 그대로 옮겨진 곳이 있는지 확인한다.
 *
 * 판정 기준은 "문장 전체 복사"다.
 * 핵심 용어(예: 기능성, 1일 섭취량)는 원고와 이미지가 같아야 자연스러우므로
 * 짧은 표현은 중복으로 보지 않는다.
 */

/** 이 길이 이상이 통째로 겹치면 문장을 옮겨온 것으로 본다 (공백·문장부호 제외 기준) */
const DUPLICATE_MIN_LENGTH = 14;

/** 비교용 정규화 — 공백·문장부호·조사 차이를 무시한다 */
function normalize(text: string): string {
  return text
    .replace(/\s+/g, "")
    .replace(/[.,!?·“”"'’‘()[\]{}·:;~\-—…]/g, "")
    .toLowerCase();
}

/** 기획안에서 이미지에 실제로 들어갈 문구를 모두 뽑는다 */
export function planTexts(plan: VisualPlan): string[] {
  if (plan.type === "infographic") {
    return [
      plan.headline,
      plan.subheadline,
      ...plan.items.flatMap((item) => [item.title, item.description]),
      plan.footer,
    ].filter(Boolean);
  }
  if (plan.type === "cardnews") {
    return plan.cards.flatMap((card) => [card.headline, card.body]).filter(Boolean);
  }
  return [plan.headline, plan.subheadline].filter(Boolean);
}

/**
 * 기획안이 원고 문장을 그대로 쓰고 있는지 검사한다.
 * 중복이 발견되면 그 문구를 돌려주고, 호출 측이 재기획을 요청한다.
 */
/** 소제목·요약·FAQ 질문을 그대로 옮겼는지 볼 때의 최소 길이 */
const EXACT_MIN_LENGTH = 6;

export function checkVisualOverlap(
  plans: VisualPlan[],
  draft: AiBlogDraft,
): VisualOverlapReport {
  const article = normalize(`${draft.title}\n${toPlainText(draft.body)}`);

  // 소제목·요약·FAQ 질문은 "문장" 단위라, 길이와 무관하게 그대로 옮기면 안 된다.
  // (원고 소제목을 그대로 카드 제목으로 쓰는 것이 대표적인 중복 사례)
  const outline = outlineFromDraft(draft);
  const sentences = new Set(
    [draft.title, ...outline.headings, ...outline.summary, ...outline.faqs.map((f) => f.question)]
      .map(normalize)
      .filter((line) => line.length >= EXACT_MIN_LENGTH),
  );

  const duplicates: string[] = [];

  for (const plan of plans) {
    for (const text of planTexts(plan)) {
      const target = normalize(text);
      if (duplicates.includes(text)) continue;

      // ① 원고의 소제목·요약 문장을 그대로 쓴 경우
      if (target.length >= EXACT_MIN_LENGTH && sentences.has(target)) {
        duplicates.push(text);
        continue;
      }
      // ② 본문 문장을 통째로 옮겨온 경우
      if (target.length >= DUPLICATE_MIN_LENGTH && article.includes(target)) {
        duplicates.push(text);
      }
    }
  }

  return { ok: duplicates.length === 0, duplicates };
}

/** 여러 기획안 묶음을 한 번에 검사한다 */
export function checkPlanSetOverlap(
  plans: VisualPlan[][],
  draft: AiBlogDraft,
): VisualOverlapReport {
  return checkVisualOverlap(plans.flat(), draft);
}

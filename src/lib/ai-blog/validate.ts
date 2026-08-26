import { outlineFromDraft, toPlainText } from "@/lib/ai-blog/article";
import { otherDomainTerms, playbookOf } from "@/lib/ai-blog/playbooks";
import { topicTerms, unique } from "@/lib/ai-blog/subject";
import type {
  AiBlogDraft,
  AiBlogInput,
  RelevanceIssue,
  RelevanceReport,
} from "@/lib/ai-blog/types";

/**
 * 주제 관련성 검증.
 *
 * 원고가 "입력한 주제를 실제로 다루고 있는가"를 판정한다.
 * 키워드 등장 횟수만 세면 제목에만 키워드를 넣고 본문은 엉뚱한 글도 통과하므로,
 *  ① 주제 표현이 제목·도입·소제목·마무리 어디에 있는지(위치)
 *  ② 해당 업종의 어휘를 실제로 쓰고 있는지
 *  ③ 다른 분야 전용 어휘가 섞여 들어왔는지
 * 세 가지를 함께 본다.
 *
 * 지금은 규칙 기반이지만, 의미 수준의 판정은 규칙으로 한계가 있다.
 * 실제 AI API를 붙일 때는 RelevanceValidator를 구현한 모듈을 만들어
 * setRelevanceValidator()로 갈아 끼우면 생성 파이프라인의 검증 단계만 교체된다.
 */

const PASS_SCORE = 60;

function countOccurrences(text: string, term: string): number {
  if (!term) return 0;
  return text.split(term).length - 1;
}

function hasAnyTerm(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

/** 원고 본문에서 주제·업종 관련성을 계산한다 */
export function checkTopicRelevance(draft: AiBlogDraft, input: AiBlogInput): RelevanceReport {
  const outline = outlineFromDraft(draft);
  const plain = toPlainText(draft.body);
  const playbook = playbookOf(input.category);

  const terms = topicTerms(input.topic, input.keywords);
  const keywordTerms = input.keywords.map((k) => k.trim()).filter(Boolean);

  const issues: RelevanceIssue[] = [];
  let score = 0;

  /* 위치별 확인 — 제목·도입·소제목·마무리 */
  const titleHit = hasAnyTerm(draft.title, terms);
  if (titleHit) score += 25;
  else
    issues.push({
      code: "topic-missing",
      message: "제목에 주제나 핵심 키워드가 드러나지 않습니다.",
    });

  const intro = plain.split("\n").slice(0, 3).join(" ");
  if (hasAnyTerm(intro, terms)) score += 20;
  else
    issues.push({
      code: "topic-missing",
      message: "도입부가 입력한 주제를 다루고 있지 않습니다.",
    });

  const headingHits = outline.headings.filter(
    (heading) => hasAnyTerm(heading, terms) || hasAnyTerm(heading, playbook.vocabulary),
  ).length;
  const headingRatio = outline.headings.length > 0 ? headingHits / outline.headings.length : 0;
  score += Math.round(25 * headingRatio);
  if (outline.headings.length > 0 && headingRatio < 0.5) {
    issues.push({
      code: "heading-drift",
      message: "본문 소제목이 주제와 충분히 연결되지 않습니다.",
    });
  }

  const outro = plain.split("\n").slice(-3).join(" ");
  if (hasAnyTerm(outro, terms)) score += 15;

  /* 업종 어휘 사용량 */
  const vocabularyHits = playbook.vocabulary.filter((term) => plain.includes(term));
  score += Math.min(15, vocabularyHits.length * 5);

  /* 키워드가 본문에 전혀 없으면 감점 */
  const missingKeywords = keywordTerms.filter((k) => countOccurrences(plain, k) === 0);
  if (missingKeywords.length > 0) {
    score -= 10;
    issues.push({
      code: "keyword-missing",
      message: `핵심 키워드가 본문에 없습니다: ${missingKeywords.join(", ")}`,
    });
  }

  /* 다른 분야 어휘 혼입 — 예전 생성기가 건강 글에 계약·서류를 쓰던 문제를 잡는다 */
  const offDomainTerms = otherDomainTerms(input.category).filter(
    (term) => countOccurrences(plain, term) >= 2,
  );
  if (offDomainTerms.length >= 2 && offDomainTerms.length > vocabularyHits.length) {
    score = Math.min(score, 40);
    issues.push({
      code: "off-domain",
      message: `주제와 무관한 다른 분야 표현이 반복됩니다: ${offDomainTerms.slice(0, 4).join(", ")}`,
    });
  }

  if (outline.charCount < Math.min(600, input.articleLength * 0.4)) {
    issues.push({ code: "too-short", message: "본문 분량이 목표에 비해 지나치게 짧습니다." });
  }

  const finalScore = Math.max(0, Math.min(100, score));
  const hasBlocker = issues.some((i) => i.code === "off-domain" || i.code === "topic-missing");

  return {
    score: finalScore,
    ok: finalScore >= PASS_SCORE && !hasBlocker,
    matchedTerms: unique([
      ...terms.filter((t) => plain.includes(t) || draft.title.includes(t)),
      ...vocabularyHits,
    ]).slice(0, 8),
    offDomainTerms,
    issues,
  };
}

/* ------------------------------------------------------------------ */
/* 검증 계층 교체 지점                                                  */
/* ------------------------------------------------------------------ */

export interface RelevanceValidator {
  /** 규칙 기반인지 AI 기반인지 — 화면 안내에 쓸 수 있다 */
  readonly mode: "RULE" | "AI";
  validate(draft: AiBlogDraft, input: AiBlogInput): Promise<RelevanceReport>;
}

export const heuristicRelevanceValidator: RelevanceValidator = {
  mode: "RULE",
  async validate(draft, input) {
    return checkTopicRelevance(draft, input);
  },
};

let current: RelevanceValidator = heuristicRelevanceValidator;

/** 의미 수준 검증이 가능한 구현으로 교체 (AI API 연결 시) */
export function setRelevanceValidator(validator: RelevanceValidator): void {
  current = validator;
}

export function getRelevanceValidator(): RelevanceValidator {
  return current;
}

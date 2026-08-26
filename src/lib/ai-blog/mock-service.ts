import { BLOCK, articleToDraft, faqToMarkdown } from "@/lib/ai-blog/article";
import {
  brandMentionLimit,
  limitBrandMentions,
  mentionBrand,
  parseConstraints,
  toneDownAds,
} from "@/lib/ai-blog/constraints";
import type { AiBlogConstraints } from "@/lib/ai-blog/constraints";
import type { CategoryPlaybook, PlaybookContext, PlaybookSection } from "@/lib/ai-blog/playbooks";
import { TYPE_SECTION_ORDER, playbookOf, sectionHeading } from "@/lib/ai-blog/playbooks";
import { generateMockImages } from "@/lib/ai-blog/mock-images";
import { getReferenceResolver, usablePoints } from "@/lib/ai-blog/references";
import type { ResolvedReference } from "@/lib/ai-blog/references";
import type { AiBlogService } from "@/lib/ai-blog/service";
import { extractSubject, josa, topicIntent } from "@/lib/ai-blog/subject";
import type {
  AiBlogArticle,
  AiBlogDraft,
  AiBlogFaq,
  AiBlogInput,
  AiBlogReviseAction,
  AiBlogReviseInstruction,
  AiBlogSection,
} from "@/lib/ai-blog/types";
import { getRelevanceValidator } from "@/lib/ai-blog/validate";

/**
 * AI 블로그 콘텐츠 제작 — Mock 구현.
 *
 * 생성 기준의 우선순위는 다음과 같다.
 *   ① 포스팅 주제 → ② 참고자료 → ③ 추가 요청사항 → ④ 핵심 키워드
 *   → ⑤ 업종 → ⑥ 목적 → ⑦ 타깃 → ⑧ 원고 유형 → ⑨ 분량
 *
 * 그래서 문장 재료는 전부 "업종 플레이북 + 주제에서 뽑아낸 대상"에서 나온다.
 * 범용 문장을 먼저 만들어 두고 키워드만 끼워 넣는 방식은 쓰지 않는다.
 *
 * 생성 후에는 주제 관련성 검증을 거치고, 기준에 못 미치면 구성을 바꿔 다시 만든다.
 * 실제 API로 교체할 때 이 파일은 오프라인/데모용으로 남겨두면 된다.
 */

/* ------------------------------------------------------------------ */
/* 유틸                                                                 */
/* ------------------------------------------------------------------ */

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** 타깃을 여러 개 적었으면 첫 번째를 문장에 쓴다 */
function targetHead(target: string): string {
  return target.split(/[,·/]/)[0].trim() || target.trim();
}

function contextOf(input: AiBlogInput, constraints: AiBlogConstraints): PlaybookContext {
  const keywords = input.keywords.map((k) => k.trim()).filter(Boolean);
  return {
    subject: extractSubject(input.topic, keywords),
    topic: input.topic.trim(),
    target: targetHead(input.target) || "관련 정보를 찾는 분",
    keywords,
    brand: mentionBrand(constraints),
  };
}

/* ------------------------------------------------------------------ */
/* 제목 — 사용자가 입력한 주제를 그대로 살린다                          */
/* ------------------------------------------------------------------ */

function titleCandidates(input: AiBlogInput, c: PlaybookContext): string[] {
  const { topic, subject, target } = c;
  const intent = topicIntent(topic);

  const byType: Record<AiBlogInput["articleType"], string[]> = {
    expert: [
      `${topic}, ${josa(target, "이가")} 확인해야 할 기준`,
      intent === "howto"
        ? `${topic} — 확인 순서대로 정리했습니다`
        : `${topic} — ${subject} 고르기 전 확인할 4가지`,
      `${subject} 선택 기준 총정리 (${target} 기준)`,
      `${topic}, 판단 기준부터 정리했습니다`,
    ],
    review: [
      `${topic}, 직접 알아보고 정리했습니다`,
      `${subject} 알아보며 확인한 것들 (${target} 기준)`,
      `${topic} — 확인한 순서대로 정리`,
      `${subject}, 무엇을 보고 판단했나`,
    ],
    compare: [
      `${topic}, 항목별로 비교했습니다`,
      `${subject} 비교 기준 정리 (${target} 기준)`,
      `${topic} — 무엇이 어떻게 다를까`,
      `${subject}, 상황별로 유리한 선택은?`,
    ],
    qna: [
      `${topic}, 자주 묻는 질문 정리`,
      `${subject} Q&A — ${josa(target, "이가")} 궁금해하는 것`,
      `${topic} — 헷갈리는 부분만 모았습니다`,
      `${subject}, 이것만 확인하면 됩니다`,
    ],
  };

  const base = byType[input.articleType];
  const keyword = c.keywords[0];

  // SEO 목적이면 첫 키워드를 제목 앞쪽에 노출시킨다
  if (input.purpose === "seo" && keyword) {
    return base.map((title, i) =>
      i === 0 && !title.includes(keyword) ? `${keyword} | ${title}` : title,
    );
  }
  return base;
}

/* ------------------------------------------------------------------ */
/* 본문 구성                                                            */
/* ------------------------------------------------------------------ */

/** 도입·요약·표·체크리스트·FAQ·마무리가 차지하는 대략적인 분량 */
const FIXED_CHARS = 950;
/** 본문 소제목 1개(2문단)의 대략적인 분량 */
const PER_SECTION = 210;

function sectionCount(target: number, max: number): number {
  const need = Math.max(0, target - FIXED_CHARS);
  return Math.min(max, Math.max(3, Math.round(need / PER_SECTION)));
}

/** 분량이 모자랄 때 덧붙이는 문단 — 주제와 업종에 붙여서 만든다 */
function extraParagraphs(c: PlaybookContext, playbook: CategoryPlaybook): string[] {
  return [
    `${c.subject}와 관련한 기준은 시점에 따라 달라질 수 있습니다. 확인한 날짜와 출처를 함께 적어두면 나중에 다시 판단할 때 도움이 됩니다.`,
    `한 곳만 보고 결정하기보다 조건이 다른 두세 곳을 같은 기준으로 비교해 보세요. ${playbook.field} 분야는 비교 대상을 나란히 놓을수록 차이가 분명해집니다.`,
    `${c.target}에게 맞는 방법이 모두에게 맞는 것은 아닙니다. 조건이 다르면 결론도 달라지므로 본인 상황을 기준으로 판단하세요.`,
  ];
}

interface BuildContext {
  input: AiBlogInput;
  constraints: AiBlogConstraints;
  playbook: CategoryPlaybook;
  c: PlaybookContext;
  variant: number;
}

function pickSections(g: BuildContext): PlaybookSection[] {
  const { playbook, input, c, variant } = g;
  const order = TYPE_SECTION_ORDER[input.articleType];

  const ordered = order
    .map((role) => playbook.sections.find((s) => s.role === role))
    .filter((s): s is PlaybookSection => !!s);

  const core = ordered.filter((s) => s.role !== "product");
  const product = ordered.find((s) => s.role === "product");

  // 제품 언급 요청이 있거나 목적이 제품·서비스 소개일 때만 제품 문단을 넣는다
  const wantsProduct = !!c.brand || input.purpose === "product";

  const base = sectionCount(input.articleLength, core.length);
  // 재생성(variant)에서는 다루는 범위를 넓혀 주제 밀도를 높인다
  const count = Math.min(core.length, base + variant);

  const chosen = core.slice(0, count);
  return wantsProduct && product ? [...chosen, product] : chosen;
}

function buildIntro(g: BuildContext): string {
  const { playbook, c, input, constraints } = g;
  const lines = [...playbook.intro(c)];

  const byPurpose: Partial<Record<AiBlogInput["purpose"], string>> = {
    seo: `${c.keywords.slice(0, 3).join(", ") || c.subject} 관련해 검색으로 들어오셨다면 아래 핵심 요약부터 확인해 보세요.`,
    product: "제품이나 서비스를 고를 때 무엇을 기준으로 볼지 중심으로 정리했습니다.",
    brand: "실제로 자주 나오는 질문을 기준으로 내용을 정리했습니다.",
    compare: "선택지를 항목별로 비교할 수 있게 정리했습니다.",
  };
  const purposeLine = byPurpose[input.purpose];
  if (purposeLine) lines.push(purposeLine);

  if (constraints.noAds) {
    lines.push(
      "특정 제품을 권하기 위한 글이 아니라, 스스로 판단할 수 있도록 기준을 정리한 글입니다.",
    );
  }

  // 사용자가 적은 핵심 키워드가 도입부에 한 번도 안 나오면 자연스럽게 덧붙인다
  const written = lines.join(" ");
  const missing = c.keywords.filter((keyword) => !written.includes(keyword));
  if (missing.length > 0) {
    lines.push(
      `${josa(missing.join(", "), "을를")} 중심으로, 확인할 순서와 판단 기준을 함께 정리했습니다.`,
    );
  }

  return lines.join("\n\n");
}

function buildSections(g: BuildContext): AiBlogSection[] {
  const { input, c, playbook } = g;

  const sections: AiBlogSection[] = pickSections(g).map((section) => ({
    heading: sectionHeading(input.articleType, section, c),
    paragraphs: [...section.paragraphs(c)],
  }));

  // 목표 분량에 못 미치면 문단을 덧붙인다
  const pool = extraParagraphs(c, playbook);
  let poolIndex = 0;
  for (let round = 0; round < 2; round += 1) {
    const current =
      FIXED_CHARS + sections.reduce((sum, s) => sum + s.paragraphs.join("").length, 0);
    if (current >= input.articleLength * 0.9) break;
    for (const section of sections) {
      section.paragraphs.push(pool[poolIndex % pool.length]);
      poolIndex += 1;
    }
  }

  return sections;
}

function buildFaqs(g: BuildContext): AiBlogFaq[] {
  const { playbook, c, input } = g;
  const faqs = [...playbook.faqs(c)];

  // Q&A형은 질문을 더 넓게 다룬다
  if (input.articleType === "qna") {
    faqs.push(
      {
        question: `${c.subject}, 언제부터 확인하는 것이 좋을까요?`,
        answer: `필요를 느낀 시점보다 조금 앞서 확인해 두는 편이 선택지가 넓습니다. ${playbook.field} 관련 내용은 조건이 바뀌면 판단도 달라지므로 주기적으로 다시 확인하세요.`,
      },
      {
        question: "정보가 서로 다를 때는 어떻게 판단하나요?",
        answer:
          "출처와 작성 시점을 먼저 비교하세요. 공식 자료나 원문이 우선이고, 요약된 글은 조건이 빠져 있을 수 있습니다.",
      },
    );
  }

  return faqs;
}

function buildOutro(g: BuildContext): string {
  const { playbook, c, constraints } = g;
  const lines = [...playbook.outro(c)];

  if (constraints.noAds) {
    lines.push(
      "이 글은 특정 제품을 홍보하기 위한 것이 아니라 판단 기준을 정리한 참고용 정보입니다.",
    );
  }
  lines.push(playbook.disclaimer);

  return lines.join("\n\n");
}

/* ------------------------------------------------------------------ */
/* 후처리 — 제약조건을 원고 전체에 적용                                 */
/* ------------------------------------------------------------------ */

/** 원고의 모든 문자열에 같은 변환을 적용한다 */
function mapArticleText(article: AiBlogArticle, fn: (text: string) => string): AiBlogArticle {
  return {
    ...article,
    title: fn(article.title),
    intro: fn(article.intro),
    summary: article.summary.map(fn),
    referenceNotes: article.referenceNotes?.map(fn),
    sections: article.sections.map((s) => ({
      heading: fn(s.heading),
      paragraphs: s.paragraphs.map(fn),
    })),
    table: article.table
      ? {
          ...article.table,
          caption: fn(article.table.caption),
          rows: article.table.rows.map(([a, b]) => [fn(a), fn(b)] as [string, string]),
        }
      : undefined,
    checklist: article.checklist.map(fn),
    faqs: article.faqs.map((f) => ({ question: fn(f.question), answer: fn(f.answer) })),
    outro: fn(article.outro),
  };
}

/** 브랜드 언급 횟수를 원고 전체 기준으로 제한한다 */
function capBrandMentions(article: AiBlogArticle, brand: string, limit: number): AiBlogArticle {
  let used = 0;
  return mapArticleText(article, (text) => {
    const occurrences = text.split(brand).length - 1;
    if (occurrences === 0) return text;
    const allowed = Math.max(0, limit - used);
    used += Math.min(occurrences, allowed);
    return limitBrandMentions(text, brand, allowed);
  });
}

/* ------------------------------------------------------------------ */
/* 원고 생성                                                            */
/* ------------------------------------------------------------------ */

function buildArticle(
  input: AiBlogInput,
  constraints: AiBlogConstraints,
  resolved: ResolvedReference[],
  variant: number,
): AiBlogArticle {
  const playbook = playbookOf(input.category);
  const c = contextOf(input, constraints);
  const g: BuildContext = { input, constraints, playbook, c, variant };

  const referenceNotes = usablePoints(resolved);

  let article: AiBlogArticle = {
    title: titleCandidates(input, c)[variant % 4],
    intro: buildIntro(g),
    summary: playbook.summary(c).slice(0, 5),
    sections: buildSections(g),
    table: playbook.table(c),
    checklist: playbook.checklist(c),
    faqs: buildFaqs(g),
    outro: buildOutro(g),
    referenceNotes: referenceNotes.length > 0 ? referenceNotes : undefined,
    generatedAt: new Date().toISOString(),
    source: "MOCK",
  };

  if (constraints.noAds) article = mapArticleText(article, toneDownAds);

  const brand = c.brand;
  if (brand) article = capBrandMentions(article, brand, brandMentionLimit(constraints));

  return article;
}

/* ------------------------------------------------------------------ */
/* 원고 수정 (Mock)                                                     */
/* ------------------------------------------------------------------ */

/** 직접 입력한 요청을 가장 가까운 빠른 수정 동작으로 해석한다 */
function resolveAction(instruction: AiBlogReviseInstruction): AiBlogReviseAction {
  if (instruction.action !== "custom") return instruction.action;
  const note = instruction.note ?? "";
  if (/짧|줄여|간결/.test(note)) return "shorter";
  if (/길|늘려|자세/.test(note)) return "longer";
  if (/쉽|풀어|초보/.test(note)) return "simple";
  if (/전문|근거|정확/.test(note)) return "professional";
  if (/표|체크리스트/.test(note)) return "add-table";
  if (/FAQ|faq|질문/.test(note)) return "add-faq";
  if (/제목/.test(note)) return "retitle";
  if (/광고|홍보/.test(note)) return "less-ad";
  if (/키워드|검색|SEO|seo/.test(note)) return "seo";
  return "custom";
}

/** 본문을 "## 블록" 단위로 나눈다 */
function splitBlocks(body: string): string[] {
  const parts: string[] = [];
  let buffer: string[] = [];
  for (const line of body.split("\n")) {
    if (/^##\s+/.test(line) && !/^###\s+/.test(line) && buffer.length > 0) {
      parts.push(buffer.join("\n").trim());
      buffer = [];
    }
    buffer.push(line);
  }
  if (buffer.length > 0) parts.push(buffer.join("\n").trim());
  return parts.filter(Boolean);
}

function hasBlock(body: string, name: string): boolean {
  return body.split("\n").some((l) => /^##\s+/.test(l) && !/^###\s+/.test(l) && l.includes(name));
}

/** "### 소제목" 문단 뒤에 문장을 덧붙인다 */
function appendToSections(body: string, sentence: (heading: string, i: number) => string): string {
  let index = -1;
  return splitBlocks(body)
    .map((block) => {
      const match = block.match(/^###\s+(.+)$/m);
      if (!match) return block;
      index += 1;
      return `${block}\n\n${sentence(match[1].replace(/^\d+\.\s*/, ""), index)}`;
    })
    .join("\n\n");
}

/** 각 "### 소제목" 문단에서 마지막 문단을 덜어낸다 (최소 1문단 유지) */
function trimSections(body: string): string {
  return splitBlocks(body)
    .map((block) => {
      if (!/^###\s+/m.test(block)) return block;
      const paragraphs = block.split(/\n{2,}/);
      return paragraphs.length > 2 ? paragraphs.slice(0, -1).join("\n\n") : block;
    })
    .join("\n\n");
}

/** 본문에 아직 들어가지 않은 업종 문단을 하나 찾아 붙인다 */
function appendUnusedSection(body: string, g: BuildContext): string | null {
  const { playbook, input, c } = g;

  for (const role of TYPE_SECTION_ORDER[input.articleType]) {
    const section = playbook.sections.find((s) => s.role === role);
    if (!section) continue;
    if (role === "product" && !c.brand && input.purpose !== "product") continue;

    const heading = sectionHeading(input.articleType, section, c);
    if (body.includes(heading)) continue;

    const count = (body.match(/^###\s+/gm) ?? []).length;
    const block = `### ${count + 1}. ${heading}\n\n${section.paragraphs(c).join("\n\n")}`;

    // 정리 블록(## 한눈에 정리 등) 앞에 끼워 넣어 본문 흐름을 유지한다
    const blocks = splitBlocks(body);
    const at = blocks.findIndex(
      (b) =>
        /^##\s+/.test(b) &&
        !/^###\s+/.test(b) &&
        !b.startsWith(`## ${BLOCK.summary}`) &&
        !b.startsWith(`## ${BLOCK.reference}`),
    );
    if (at < 0) return `${body}\n\n${block}`;
    return [...blocks.slice(0, at), block, ...blocks.slice(at)].join("\n\n");
  }
  return null;
}

function applyRevision(
  action: AiBlogReviseAction,
  draft: AiBlogDraft,
  input: AiBlogInput,
  instruction: AiBlogReviseInstruction,
): AiBlogDraft {
  const constraints = parseConstraints(input.requestNotes);
  const playbook = playbookOf(input.category);
  const c = contextOf(input, constraints);
  const g: BuildContext = { input, constraints, playbook, c, variant: 0 };

  let { title, body } = draft;

  switch (action) {
    case "professional":
      body = body
        .replace(/좋아요/g, "좋습니다")
        .replace(/같아요/g, "것으로 보입니다")
        .replace(/해요/g, "합니다");
      body = appendToSections(
        body,
        (heading) =>
          `${heading} 부분은 결론보다 근거를 먼저 봐야 판단이 정확해집니다. 어떤 자료에 그렇게 적혀 있는지, 기준이 언제 바뀌었는지 함께 확인해 두세요.`,
      );
      break;

    case "simple":
      body = appendToSections(
        body,
        (heading) =>
          `쉽게 말하면, ${heading} 부분은 "${josa(c.subject, "을를")} 볼 때 무엇부터 확인할지"를 정하는 단계입니다.`,
      );
      break;

    case "longer": {
      const expanded = appendUnusedSection(body, g);
      if (expanded) {
        body = expanded;
      } else {
        const pool = extraParagraphs(c, playbook);
        body = appendToSections(body, (_heading, i) => pool[i % pool.length]);
      }
      break;
    }

    case "shorter":
      body = trimSections(body);
      break;

    case "less-ad":
      body = toneDownAds(body);
      body += `\n\n> 이 글은 특정 제품을 권유하기 위한 글이 아니라, 판단 기준을 정리한 참고용 정보입니다.`;
      break;

    case "seo": {
      const keywords = c.keywords.slice(0, 3);
      if (keywords.length > 0) {
        body += `\n\n${keywords.map((k) => `#${k.replace(/\s+/g, "")}`).join(" ")}`;
        body = body.replace(
          /^## /m,
          `${keywords[0]} 관련 내용을 찾고 계셨다면 아래 요약부터 확인해 보세요.\n\n## `,
        );
      }
      break;
    }

    case "retitle": {
      const candidates = titleCandidates(input, c);
      const at = candidates.indexOf(title);
      title = candidates[(at + 1 + candidates.length) % candidates.length] ?? candidates[0];
      break;
    }

    case "add-faq": {
      const extra: AiBlogFaq[] = [
        {
          question: `${c.subject}, 확인한 내용은 어떻게 남겨두면 좋을까요?`,
          answer: `확인한 날짜와 출처를 함께 적어두세요. ${playbook.field} 관련 기준은 바뀔 수 있어 나중에 다시 판단할 때 기준점이 됩니다.`,
        },
        {
          question: `${josa(c.target, "이가")} 가장 많이 놓치는 부분은 무엇인가요?`,
          answer:
            "기준을 정하지 않고 비교부터 시작하는 경우입니다. 확인할 항목을 세 가지 이내로 먼저 정하면 판단이 빨라집니다.",
        },
      ];
      const markdown = extra.map(faqToMarkdown).join("\n\n");
      body = hasBlock(body, BLOCK.faq)
        ? body.replace(
            new RegExp(`(##\\s+${BLOCK.faq}[\\s\\S]*?)(\\n##\\s+|$)`),
            (_m, block: string, next: string) => `${block}\n\n${markdown}${next}`,
          )
        : `${body}\n\n## ${BLOCK.faq}\n\n${markdown}`;
      break;
    }

    case "add-table": {
      if (!hasBlock(body, BLOCK.table)) {
        const table = playbook.table(c);
        body += `\n\n## ${BLOCK.table}\n\n${table.caption}\n\n| ${table.columns[0]} | ${table.columns[1]} |\n| --- | --- |\n${table.rows
          .map(([a, b]) => `| ${a} | ${b} |`)
          .join("\n")}`;
      }
      if (!hasBlock(body, BLOCK.checklist)) {
        body += `\n\n## ${BLOCK.checklist}\n\n${playbook
          .checklist(c)
          .map((x) => `- [ ] ${x}`)
          .join("\n")}`;
      }
      break;
    }

    default: {
      // 해석하지 못한 직접 입력 요청 — 요청 내용을 별도 문단으로 반영한다
      const note = (instruction.note ?? "").trim();
      body += `\n\n### 추가로 확인할 내용\n\n${note || "요청하신 내용"}과 관련해서는, ${josa(c.subject, "을를")} 볼 때 기준을 먼저 정하고 그 기준에 맞는 자료를 확인하는 순서가 가장 정확합니다.`;
      break;
    }
  }

  const brand = mentionBrand(constraints);
  if (brand) body = limitBrandMentions(body, brand, brandMentionLimit(constraints));

  return { title, body: body.trim() };
}

/* ------------------------------------------------------------------ */
/* 서비스 구현                                                          */
/* ------------------------------------------------------------------ */

/** 주제 관련성이 기준에 못 미칠 때 다시 만들어 볼 최대 횟수 */
const MAX_RETRY = 2;

export const mockAiBlogService: AiBlogService = {
  mode: "MOCK",

  async generateBlogArticle(input) {
    await delay(1_200);

    const constraints = parseConstraints(input.requestNotes);
    const resolved = await getReferenceResolver().resolve(input.references);
    const validator = getRelevanceValidator();

    let article = buildArticle(input, constraints, resolved, 0);
    let report = await validator.validate(articleToDraft(article), input);

    // 주제와 어긋나면 구성을 바꿔 다시 생성한다
    for (let attempt = 1; !report.ok && attempt <= MAX_RETRY; attempt += 1) {
      const retry = buildArticle(input, constraints, resolved, attempt);
      const retryReport = await validator.validate(articleToDraft(retry), input);
      if (retryReport.score <= report.score) break;
      article = retry;
      report = retryReport;
    }

    return { ...article, relevance: report };
  },

  async reviseBlogArticle(draft, instruction, input) {
    await delay(800);
    return applyRevision(resolveAction(instruction), draft, input, instruction);
  },

  generateImages(request) {
    return generateMockImages(request);
  },
};

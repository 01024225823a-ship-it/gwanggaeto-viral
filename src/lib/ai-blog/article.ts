import type { AiBlogArticle, AiBlogDraft, AiBlogFaq, AiBlogOutline } from "@/lib/ai-blog/types";

/**
 * 구조화 원고(AiBlogArticle) ↔ 편집용 마크다운(AiBlogDraft) 변환.
 *
 * 사용자는 마크다운 본문을 자유롭게 고칠 수 있어야 하고,
 * 이미지 제작은 "수정된 최종 원고"에서 정보를 다시 뽑아야 한다.
 * 그래서 생성 → 마크다운(직렬화) → 사용자가 수정 → 아웃라인(파싱) 순서로 흐른다.
 *
 * 파서는 사용자가 소제목 문구를 바꾸거나 블록을 지워도 깨지지 않도록
 * "찾으면 쓰고 없으면 넘어간다" 원칙으로 작성한다.
 */

/** 마크다운 블록 제목 — 직렬화와 파싱이 같은 값을 쓴다 */
export const BLOCK = {
  summary: "핵심 요약",
  reference: "참고자료에서 확인한 내용",
  table: "한눈에 정리",
  checklist: "체크리스트",
  faq: "자주 묻는 질문",
  outro: "마무리",
} as const;

/* ------------------------------------------------------------------ */
/* 직렬화                                                               */
/* ------------------------------------------------------------------ */

export function articleToDraft(article: AiBlogArticle): AiBlogDraft {
  return { title: article.title, body: articleToMarkdown(article) };
}

export function articleToMarkdown(article: AiBlogArticle): string {
  const out: string[] = [];

  if (article.intro.trim()) out.push(article.intro.trim());

  if (article.summary.length > 0) {
    out.push(`## ${BLOCK.summary}`);
    out.push(article.summary.map((s) => `- ${s}`).join("\n"));
  }

  if (article.referenceNotes && article.referenceNotes.length > 0) {
    out.push(`## ${BLOCK.reference}`);
    out.push(article.referenceNotes.map((note) => `- ${note}`).join("\n"));
  }

  // 1인칭 독백형은 번호형 소제목을 쓰지 않는다 (리포트처럼 보이면 안 된다)
  const numbered = article.articleType !== "monologue";

  for (const [i, section] of article.sections.entries()) {
    out.push(numbered ? `### ${i + 1}. ${section.heading}` : `### ${section.heading}`);
    out.push(section.paragraphs.join("\n\n"));
  }

  if (article.table && article.table.rows.length > 0) {
    const { caption, columns, rows } = article.table;
    out.push(`## ${BLOCK.table}`);
    if (caption) out.push(caption);
    out.push(
      [
        `| ${columns[0]} | ${columns[1]} |`,
        "| --- | --- |",
        ...rows.map(([a, b]) => `| ${a} | ${b} |`),
      ].join("\n"),
    );
  }

  if (article.checklist.length > 0) {
    out.push(`## ${BLOCK.checklist}`);
    out.push(article.checklist.map((c) => `- [ ] ${c}`).join("\n"));
  }

  if (article.faqs.length > 0) {
    out.push(`## ${BLOCK.faq}`);
    out.push(article.faqs.map(faqToMarkdown).join("\n\n"));
  }

  if (article.outro.trim()) {
    out.push(`## ${BLOCK.outro}`);
    out.push(article.outro.trim());
  }

  return out.join("\n\n");
}

export function faqToMarkdown(faq: AiBlogFaq): string {
  return `**Q. ${faq.question}**\nA. ${faq.answer}`;
}

/** 제목까지 포함한 복사용 전문 */
export function draftToFullText(draft: AiBlogDraft): string {
  return `# ${draft.title}\n\n${draft.body}`.trim();
}

/* ------------------------------------------------------------------ */
/* 파싱                                                                 */
/* ------------------------------------------------------------------ */

/** "## 핵심 요약" 처럼 블록 제목으로 시작하는 줄인지 */
function isBlockHeading(line: string): boolean {
  return /^##\s+/.test(line) && !/^###\s+/.test(line);
}

/** 블록 제목이 name을 포함하는 구간의 내용 줄을 돌려준다 */
function blockLines(lines: string[], name: string): string[] {
  const start = lines.findIndex((l) => isBlockHeading(l) && l.replace(/^##\s+/, "").includes(name));
  if (start < 0) return [];
  const rest = lines.slice(start + 1);
  const end = rest.findIndex(isBlockHeading);
  return end < 0 ? rest : rest.slice(0, end);
}

function bulletsOf(lines: string[]): string[] {
  return lines
    .filter((l) => /^\s*(?:[-*]|\d+\.)\s+/.test(l))
    .map((l) =>
      l
        .replace(/^\s*(?:[-*]|\d+\.)\s+/, "")
        .replace(/^\[[ xX]\]\s*/, "")
        .trim(),
    )
    .filter(Boolean);
}

/** 마크다운 장식을 걷어낸 평문 */
export function toPlainText(markdown: string): string {
  return markdown
    .split("\n")
    .map((line) =>
      line
        .replace(/^\s*#{1,6}\s+/, "")
        .replace(/^\s*(?:[-*]|\d+\.)\s+/, "")
        .replace(/^\[[ xX]\]\s*/, "")
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/^\|\s*-{2,}.*$/, "")
        .replace(/^\|\s*/, "")
        .replace(/\s*\|\s*$/, "")
        .replace(/\s*\|\s*/g, " · ")
        .trim(),
    )
    .filter(Boolean)
    .join("\n");
}

/** 공백을 제외한 글자 수 — 블로그 분량 기준으로 흔히 쓰는 방식 */
export function countChars(markdown: string): number {
  return toPlainText(markdown).replace(/\s/g, "").length;
}

/**
 * 사용자가 수정한 최종 원고에서 이미지 제작에 필요한 정보를 추출한다.
 * 이미지 프롬프트 생성은 항상 이 함수의 결과만 사용한다.
 */
export function outlineFromDraft(draft: AiBlogDraft): AiBlogOutline {
  const lines = draft.body.split("\n");

  const headings = lines
    .filter((l) => /^###\s+/.test(l))
    .map((l) => l.replace(/^###\s+/, "").replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);

  let summary = bulletsOf(blockLines(lines, BLOCK.summary));
  if (summary.length === 0) {
    // 요약 블록을 지운 경우 — 본문 첫 목록을 요약으로 본다
    summary = bulletsOf(lines).slice(0, 5);
  }
  if (summary.length === 0) summary = headings.slice(0, 4);

  const checklist = bulletsOf(blockLines(lines, BLOCK.checklist));

  const tableRows: Array<[string, string]> = lines
    .filter((l) => /^\s*\|/.test(l) && !/^\s*\|\s*-{2,}/.test(l))
    .map((l) =>
      l
        .replace(/^\s*\|/, "")
        .replace(/\|\s*$/, "")
        .split("|")
        .map((c) => c.trim()),
    )
    .filter((cells) => cells.length >= 2)
    .slice(1) // 헤더 행 제외
    .map((cells) => [cells[0], cells[1]] as [string, string]);

  const faqs: AiBlogFaq[] = [];
  for (const [i, line] of lines.entries()) {
    const q = line.match(/^\s*(?:\*\*)?Q[.):]\s*(.+?)(?:\*\*)?\s*$/);
    if (!q) continue;
    const answerLine = lines.slice(i + 1, i + 4).find((l) => /^\s*(?:\*\*)?A[.):]?\s+/.test(l));
    faqs.push({
      question: q[1].replace(/\*\*/g, "").trim(),
      answer: (answerLine ?? "").replace(/^\s*(?:\*\*)?A[.):]?\s+/, "").replace(/\*\*/g, "").trim(),
    });
  }

  const plainText = toPlainText(draft.body);

  return {
    title: draft.title.trim(),
    summary: summary.slice(0, 5),
    headings,
    checklist,
    faqs,
    tableRows,
    plainText,
    charCount: countChars(draft.body),
  };
}

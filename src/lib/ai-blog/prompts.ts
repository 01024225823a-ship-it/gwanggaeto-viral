import { BLOCK } from "@/lib/ai-blog/article";
import type { AiBlogConstraints } from "@/lib/ai-blog/constraints";
import { articleTypeLabel, categoryLabel, purposeLabel } from "@/lib/ai-blog/options";
import type { ResolvedReference } from "@/lib/ai-blog/references";
import type {
  AiBlogArticleType,
  AiBlogDraft,
  AiBlogInput,
  AiBlogReviseInstruction,
} from "@/lib/ai-blog/types";

/**
 * 원고 생성·수정 프롬프트 — UI와 완전히 분리된 순수 함수 모음.
 *
 * 화면(컴포넌트)은 이 파일의 함수를 호출하기만 하고 프롬프트 문자열을 직접 만들지 않는다.
 * 이미지 기획·이미지 생성 프롬프트는 visual-prompts.ts 에 따로 있다.
 */

/* ------------------------------------------------------------------ */
/* 원고 프롬프트                                                        */
/* ------------------------------------------------------------------ */

export interface ArticlePromptOptions {
  /** 참고자료 수집 결과 — 읽지 못한 URL은 그렇게 명시한다 */
  resolved?: ResolvedReference[];
  /** 추가 요청사항을 해석한 제약조건 */
  constraints?: AiBlogConstraints;
  /** 업종 플레이북이 정한 소제목 구성 */
  outline?: string[];
}

function referenceBlock(resolved: ResolvedReference[]): string {
  const usable = resolved.filter((r) => r.status !== "NOT_FETCHED");
  const unread = resolved.filter((r) => r.status === "NOT_FETCHED");

  const blocks: string[] = [];

  if (usable.length > 0) {
    const points = usable
      .map((r) => (r.points.length > 0 ? r.points.map((pt) => `- ${pt}`).join("\n") : `- ${r.source}`))
      .join("\n");
    blocks.push(`[3. 참고자료 — 아래 내용을 근거로 사용]\n${points}`);
  }

  if (unread.length > 0) {
    const links = unread.map((r) => `- ${r.source}`).join("\n");
    blocks.push(
      `[3-1. 참고 링크 — 내용 미확인]\n${links}\n※ 위 링크의 본문은 수집하지 못했습니다. 주소만 전달된 것이니, 링크에 적혀 있을 법한 내용을 추측해서 쓰지 마세요. 이 링크를 읽은 것처럼 서술하지 마세요.`,
    );
  }

  return blocks.join("\n\n");
}

function constraintBlock(constraints?: AiBlogConstraints): string {
  if (!constraints || !constraints.raw) return "";

  const rules = [
    constraints.noAds
      ? "- 제품 홍보가 아니라 정보 전달이 목적이다. 광고성 수식어와 단정적인 효능 표현을 쓰지 않는다."
      : "",
    constraints.professional
      ? "- 각 문단은 근거 → 설명 → 독자가 확인할 사항 순서로 구성한다."
      : "",
    constraints.simple ? "- 전문 용어는 풀어 쓰고 문장을 짧게 유지한다." : "",
    constraints.brands.length > 0 && constraints.brandLevel === "light"
      ? `- ${constraints.brands.join(", ")}는 본문 후반부에서 1~2회만 예시 수준으로 언급하고, 본문 대부분은 일반적인 정보로 채운다.`
      : "",
    constraints.brands.length > 0 && constraints.brandLevel === "none"
      ? `- ${constraints.brands.join(", ")}는 언급하지 않는다.`
      : "",
    constraints.includeTable ? "- 정리 표를 반드시 포함한다." : "",
    constraints.includeChecklist ? "- 체크리스트를 반드시 포함한다." : "",
    constraints.includeFaq ? "- FAQ를 반드시 포함한다." : "",
  ].filter(Boolean);

  return [
    `[1. 추가 요청사항 — 가장 우선해서 지킬 것]\n${constraints.raw}`,
    ...rules,
  ].join("\n");
}

/**
 * 원고 생성 시스템 프롬프트 — 역할과 지켜야 할 원칙.
 *
 * 입력값(주제·요청사항 등)은 여기 넣지 않는다. 시스템 프롬프트는 요청마다
 * 바뀌지 않아야 프롬프트 캐시가 살아 있고, 사용자 입력은 user 메시지로 분리해야
 * 지시와 데이터의 경계가 분명해진다.
 */
export function buildSystemPrompt(articleType?: AiBlogArticleType): string {
  if (articleType === "monologue") return buildMonologueSystemPrompt();

  return [
    "당신은 네이버 블로그에 발행할 정보성 콘텐츠를 쓰는 전문 한국어 콘텐츠 에디터입니다.",
    "독자가 실제로 판단에 쓸 수 있는 글을 씁니다.",
    "",
    "[반드시 지킬 원칙]",
    "1. 사용자가 준 주제에서 벗어나지 않는다. 주제와 무관한 일반론으로 지면을 채우지 않는다.",
    "2. 입력되지 않은 사실을 지어내지 않는다. 통계·수치·법령 조문·의학적 효능은 확신해서 쓰지 않는다.",
    "   근거가 필요하지만 확인되지 않은 부분은 '확인이 필요하다'는 취지로 쓰고 구체적 수치를 만들지 않는다.",
    "3. 광고성 표현(최고, 무조건, 확실히, 완벽한 등)을 쓰지 않는다. 정보 전달 톤을 유지한다.",
    "4. 특정 제품을 약하게 언급하라는 요청을 받으면, 본문 대부분은 일반 정보로 채우고",
    "   제품명은 후반부에서 예시 수준으로 1~2회만 쓴다. 글 전체를 제품 홍보글로 바꾸지 않는다.",
    "5. 핵심 키워드는 문맥에 맞게 자연스럽게 쓰고, 억지로 반복 삽입하지 않는다.",
    "6. 같은 표현과 문장을 반복하지 않는다. 문단마다 새로운 정보를 담는다.",
    "7. 내용이 없는 추상적인 문장으로 글자수를 채우지 않는다.",
    "   '상황에 따라 다릅니다', '확인하는 것이 좋습니다' 같은 문장만으로 문단을 끝내지 않는다.",
    "8. 각 문단은 '왜 그런지 → 무엇을 확인해야 하는지 → 어떻게 판단할지' 순서로 구체적으로 쓴다.",
    "9. 문단은 3~4줄로 끊어 모바일에서 읽기 좋게 쓴다.",
    "",
    "[기본 구성]",
    "제목 / 도입 / 핵심 요약 / 본문 소제목 3~6개 / 표 또는 체크리스트 / FAQ / 마무리",
    "단, 주제에 맞지 않는 항목은 억지로 넣지 않는다. 표가 어색한 주제라면 표 대신 체크리스트만 써도 된다.",
    "",
    "[분야 안내 문구]",
    "건강·의료·법률·금융처럼 개인 상황에 따라 결론이 달라지는 분야는",
    "마무리에 전문가 확인을 권하는 안내 문구를 disclaimer 로 덧붙인다.",
  ].join("\n");
}

/* ------------------------------------------------------------------ */
/* 1인칭 독백형 전용 프롬프트                                           */
/* ------------------------------------------------------------------ */

/**
 * 1인칭 독백형 시스템 프롬프트.
 *
 * 전문 정보형의 "보고서" 프롬프트를 그대로 쓰면 소제목·요약·표가 붙은
 * 리포트가 나온다. 이 유형은 구조가 아니라 생각의 흐름이 핵심이므로
 * 원칙 자체를 다르게 준다.
 *
 * 가장 조심할 것은 **가짜 후기**다. 사용자가 실제 사용 경험을 주지 않았는데
 * "먹어보니 좋았다" 류의 체험담이 나오면 이 유형은 실패다.
 */
export function buildMonologueSystemPrompt(): string {
  return [
    "당신은 한국어 블로그에 1인칭 글을 쓰는 사람입니다.",
    "이 글은 독자에게 강의하거나 보고하는 글이 아니라,",
    "작성자가 제품이나 주제를 알아보고 판단한 과정을",
    "자신의 생각을 정리하듯 자연스럽게 풀어가는 1인칭 글입니다.",
    "",
    "[후기형과의 차이 — 반드시 구분할 것]",
    "후기형   : 실제 사용·경험 → 느낀 점 → 평가",
    "독백형   : 고민 → 탐색 → 비교 → 의문 → 확인 → 판단 → 선택 이유",
    "제품을 이미 사용했다는 전제가 없습니다. 사용하지 않아도 쓸 수 있는 글입니다.",
    "",
    "[가장 중요한 원칙 — 없는 체험을 만들지 않는다]",
    "사용자가 실제 섭취·사용 경험을 제공하지 않았다면 체험담을 지어내지 마세요.",
    "",
    "쓰면 안 되는 표현",
    '  "직접 먹어보니 효과가 있었다"',
    '  "며칠 먹었더니 통증이 줄었다"',
    '  "확실히 좋아졌다"',
    "",
    "쓸 수 있는 표현",
    '  "구성을 비교해보니 괜찮아 보였다"',
    '  "개인적으로 이 부분이 눈에 들어왔다"',
    '  "내가 제품을 비교할 때 보는 기준에는 잘 맞았다"',
    "",
    "체감·효과·복용 기간·증상 변화는 사용자가 직접 제공한 경우에만 씁니다.",
    "",
    "[문체]",
    "- 광고주나 전문가가 설명하는 말투가 아니라, 스스로 생각을 정리하는 말투로 씁니다.",
    "- 짧은 문장과 중간 길이 문장을 섞습니다. 한 문장을 지나치게 길게 만들지 않습니다.",
    "- 다음 연결 표현을 자연스럽게 씁니다 — 처음에는 / 그런데 / 자세히 보니 / 생각해보면 /",
    "  그래서 / 오히려 / 개인적으로는 / 물론 / 결국",
    "  단, 같은 표현을 기계적으로 반복하지 않습니다.",
    "- '~습니다' 체로 독자에게 설명하지 말고, '~다' 체로 자기 생각을 적습니다.",
    "",
    "[글의 흐름 — 참고용이며 그대로 10개 항목으로 나누지 않는다]",
    "이 주제를 알아보게 된 계기 → 처음 느낀 고민 → 선택지를 비교한 과정 →",
    "특정 제품·서비스를 알게 된 계기 → 처음 들었던 의문 → 하나씩 확인해 본 내용 →",
    "내 상황·타깃 관점에서 생각해 본 점 → 장점 또는 선택 기준 →",
    "과장하지 않는 한계·주의점 → 최종적으로 관심을 갖게 된 이유",
    "",
    "정리된 보고서가 아니라 생각이 자연스럽게 이어지는 글이어야 합니다.",
    "소제목은 3~5개면 충분하고, 번호를 붙이지 않습니다.",
    "소제목도 목차 제목이 아니라 그 대목의 생각을 담은 짧은 문장으로 씁니다.",
    "",
    "[쓰지 않는 형식 — 사용자가 따로 요청한 경우에만 사용]",
    "핵심 요약 박스 / FAQ / 표 / 체크리스트 / 번호형 소제목 /",
    "'첫째, 둘째, 셋째' / 논문·리포트 같은 구성",
    "→ 해당 필드(summary, table, checklist, faqs)는 빈 값으로 두세요.",
    "",
    "[정보성은 유지한다]",
    "독백형이라고 정보가 없어지면 안 됩니다. 왜 그렇게 생각했는지 근거가 있어야 합니다.",
    "  생각 → 이유 → 정보 → 개인적 판단",
    "순서로 씁니다. 의문을 던졌으면 이후에 실제 구성·성분·기능 설명으로 답을 줍니다.",
    "",
    "[사실 범위]",
    "- 참고자료가 있으면 사실 정보는 참고자료를 우선합니다.",
    "- 참고자료에 없는 효능·수치·시험 결과·사용자 경험을 지어내지 않습니다.",
    "- 개인적인 표현과 객관적인 사실 정보를 문장 안에서 구분합니다.",
    "",
    "[제품 언급]",
    "제품명을 반복해서 넣지 마세요. 처음 소개한 뒤에는",
    "'이 제품', '이 구성', '이런 방식' 처럼 자연스러운 대체 표현을 씁니다.",
    "SEO 목적으로 제품명을 기계적으로 반복하지 않습니다.",
    "",
    "[분야 안내 문구]",
    "건강·의료·법률·금융처럼 개인 상황에 따라 결론이 달라지는 분야는",
    "마무리에 전문가 확인을 권하는 안내 문구를 disclaimer 로 덧붙입니다.",
  ].join("\n");
}

/** 독백형일 때 user 메시지에 덧붙이는 지시 */
function monologueBlock(input: AiBlogInput): string {
  return [
    "[10. 원고 유형 상세 — 1인칭 독백형]",
    "작성자가 이 주제를 알아보고 판단한 과정을 혼잣말하듯 1인칭으로 씁니다.",
    `타깃(${input.target || "일반 독자"})에게 설명하는 글이 아니라,`,
    "작성자가 자기 생각을 정리하는 글입니다.",
    "",
    "- summary(핵심 요약), table(표), checklist(체크리스트), faqs(FAQ) 는 빈 값으로 두세요.",
    "  ([1. 추가 요청사항]에서 명시적으로 요청한 경우에만 채웁니다)",
    "- sections 의 heading 에 번호를 붙이지 않습니다. 소제목은 3~5개로 씁니다.",
    "- paragraphs 는 문단 중심의 자연스러운 글로 씁니다.",
    "- 실제 사용·섭취 경험은 위 [1. 추가 요청사항]이나 [3. 참고자료]에 있을 때만 씁니다.",
    "  없으면 '알아보고 비교한 과정'까지만 쓰고 체감·효과를 지어내지 않습니다.",
  ].join("\n");
}

/**
 * STEP 1 입력 → 원고 생성 프롬프트(user 메시지).
 *
 * 블록 순서 = 반영 우선순위.
 *   ① 추가 요청사항 ② 주제 ③ 확보된 참고자료 ④ 핵심 키워드
 *   ⑤ 업종 ⑥ 타깃 ⑦ 목적 ⑧ 원고 유형 ⑨ 목표 분량
 * 앞에 놓인 블록이 뒤의 블록과 충돌하면 앞의 블록을 따른다는 점을 명시한다.
 */
export function buildArticlePrompt(input: AiBlogInput, options?: ArticlePromptOptions): string {
  const constraints = constraintBlock(options?.constraints);
  const references = referenceBlock(options?.resolved ?? []);

  const structure =
    options?.outline && options.outline.length > 0
      ? `참고 구성안: ${options.outline.join(" / ")}`
      : "";

  return [
    "아래 조건으로 블로그 원고를 작성해 주세요.",
    "블록은 반영 우선순위 순서로 적었습니다. 서로 충돌하면 위쪽 블록을 우선합니다.",
    "",
    constraints || "[1. 추가 요청사항] 없음",
    "",
    `[2. 포스팅 주제]\n${input.topic}`,
    "이 글은 위 주제를 설명하는 글입니다.",
    "",
    references || "[3. 참고자료] 제공된 내용 없음",
    "",
    `[4. 핵심 키워드] ${input.keywords.join(", ") || "지정 없음"}`,
    `[5. 업종/분야] ${categoryLabel(input.category)}`,
    `[6. 타깃 독자] ${input.target || "일반 독자"}`,
    `[7. 원고 목적] ${purposeLabel(input.purpose)}`,
    `[8. 원고 유형] ${articleTypeLabel(input.articleType)}`,
    `[9. 목표 분량] 공백 제외 약 ${input.articleLength}자 (±15% 이내)`,
    // 독백형은 구성안(소제목 목록)을 주면 다시 리포트가 되므로 넣지 않는다
    input.articleType === "monologue" ? "" : structure,
    input.articleType === "monologue" ? `\n${monologueBlock(input)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/* ------------------------------------------------------------------ */
/* 원고 수정 프롬프트                                                   */
/* ------------------------------------------------------------------ */

/** 편집기가 쓰는 마크다운 규칙 — 수정 결과도 이 형식을 유지해야 파서가 동작한다 */
export function markdownFormatSpec(articleType?: AiBlogArticleType): string {
  const monologue = articleType === "monologue";

  return [
    "[본문 마크다운 형식 — 반드시 지킬 것]",
    `- 큰 블록 제목은 "## ${BLOCK.summary}", "## ${BLOCK.table}", "## ${BLOCK.checklist}", "## ${BLOCK.faq}", "## ${BLOCK.outro}" 를 사용한다.`,
    monologue
      ? '- 본문 소제목은 "### 소제목" 처럼 ### 만 쓰고 번호를 붙이지 않는다.'
      : '- 본문 소제목은 "### 1. 소제목" 처럼 ### 와 번호를 쓴다.',
    '- 목록은 "- 내용", 체크리스트는 "- [ ] 내용" 으로 쓴다.',
    '- 표는 "| 항목 | 내용 |" 형식의 마크다운 표로 쓰고, 두 번째 줄에 "| --- | --- |" 를 넣는다.',
    '- FAQ 는 "**Q. 질문**" 다음 줄에 "A. 답변" 으로 쓴다.',
    "- 제목(H1)은 본문에 넣지 않는다. 제목은 title 필드로만 돌려준다.",
  ].join("\n");
}

/** 원고 수정 시스템 프롬프트 */
export function buildReviseSystemPrompt(articleType?: AiBlogArticleType): string {
  const monologue = articleType === "monologue";

  return [
    "당신은 한국어 블로그 원고를 다듬는 전문 에디터입니다.",
    "",
    "[가장 중요한 원칙]",
    "사용자가 직접 고쳐 놓은 문장이 있을 수 있습니다.",
    "요청받은 부분만 바꾸고, 그 외의 문장·문단·순서는 원문 그대로 유지하세요.",
    "요청과 무관한 문장을 임의로 다시 쓰거나 삭제하지 않습니다.",
    "",
    "[그 밖의 원칙]",
    "- 주제와 사실관계를 바꾸지 않는다. 새로운 수치나 근거를 지어내지 않는다.",
    "- 광고성 표현을 늘리지 않는다.",
    "- 전체 구조(블록 순서)를 유지한다. 요청이 구조 변경일 때만 바꾼다.",
    ...(monologue
      ? [
          "",
          "[이 원고는 1인칭 독백형입니다]",
          "- 작성자가 자기 생각을 정리하는 1인칭 문체를 유지한다. 설명·보고 말투로 바꾸지 않는다.",
          "- 요약·표·체크리스트·FAQ 블록은 수정 요청에 명시된 경우에만 추가한다.",
          "- 실제 사용·섭취 경험이 원문에 없으면 새로 만들지 않는다.",
          "  체감·효과·복용 기간·증상 변화를 덧붙이지 않는다.",
          "- 제품명을 늘려 반복하지 않는다.",
        ]
      : []),
    "",
    markdownFormatSpec(articleType),
  ].join("\n");
}

/** 원고 수정 프롬프트(user 메시지) */
export function buildRevisePrompt(
  draft: AiBlogDraft,
  instruction: AiBlogReviseInstruction,
  input: AiBlogInput,
): string {
  const request = instruction.action === "custom" ? (instruction.note ?? "") : instruction.label;

  return [
    `[수정 요청] ${request}`,
    "",
    "[유지해야 할 맥락]",
    `- 주제: ${input.topic}`,
    `- 핵심 키워드: ${input.keywords.join(", ") || "지정 없음"}`,
    `- 타깃 독자: ${input.target || "일반 독자"}`,
    `- 업종/분야: ${categoryLabel(input.category)}`,
    input.requestNotes ? `- 최초 요청사항: ${input.requestNotes}` : "",
    "",
    `[현재 제목]\n${draft.title}`,
    "",
    `[현재 본문]\n${draft.body}`,
  ]
    .filter(Boolean)
    .join("\n");
}


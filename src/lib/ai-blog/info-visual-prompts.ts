import { INFO_VISUAL_TYPES, infoVisualTypeLabel } from "@/lib/ai-blog/info-visual";
import { categoryLabel } from "@/lib/ai-blog/options";
import type {
  AiBlogArticleType,
  AiBlogInput,
  InfoVisualPlan,
  InfoVisualPlanRequest,
  InfoVisualReviseRequest,
} from "@/lib/ai-blog/types";

/**
 * 정보 이미지 기획 프롬프트.
 *
 *   최종 원고 → (이 프롬프트) → InfoVisualPlan → SVG/Canvas 렌더
 *
 * Claude 는 "그림"을 상상하지 않는다. 원고에서 시각화할 정보를 골라
 * 짧은 라벨과 한 줄 설명으로 재작성하는 일만 한다.
 * 실제 이미지는 렌더러가 정확한 한글로 그린다.
 */

/* ------------------------------------------------------------------ */
/* 공통 규칙                                                            */
/* ------------------------------------------------------------------ */

const ROLE = [
  "[역할]",
  "당신은 한국 기업 블로그의 정보 디자이너입니다.",
  "블로그 원고를 읽고, 본문에 넣을 '정보 카드'에 담을 내용을 정리합니다.",
  "",
  "만드는 것은 일러스트나 사진이 아니라 정보 시각화 자료입니다.",
  "  정보 카드 · 체크리스트 · 비교표 · 표 · 단계 도식 · 숫자 강조",
  "장면 묘사, 인물, 배경, 분위기 같은 그림 지시는 절대 쓰지 마세요.",
].join("\n");

const VALUE_RULE = [
  "[무엇을 이미지로 만들 것인가]",
  "원고를 요약하는 것이 목적이 아닙니다.",
  "원고와 관련 있으면서, 그 이미지 한 장만 봐도 유용한 정보가 되어야 합니다.",
  "",
  '예) 원고 주제가 "관절영양제가 필요한 이유" 라면',
  "  · 관절 건강을 위해 확인할 4가지",
  "  · 관절영양제 선택 전 체크사항",
  "  · 성분표에서 확인해야 할 항목",
  "  · 생활관리 핵심 3가지",
  "  · 이런 경우에는 전문가 상담이 필요",
  "  · 제품 선택 시 비교 기준",
  "",
  "독자가 캡처해서 저장하고 싶어지는 정보를 고르세요.",
].join("\n");

const COPY_RULE = [
  "[문장 재작성 규칙 — 가장 중요]",
  "원고 문장을 그대로 복사하지 마세요.",
  "원고 소제목을 그대로 이미지 제목으로 쓰지 마세요.",
  "같은 내용을 더 짧고 시각적인 표현으로 다시 씁니다.",
  "",
  "예)",
  '  원고 : "관절 건강기능식품을 선택할 때는 기능성 원료와 1일 섭취량을 함께 확인해야 합니다."',
  "  이미지 : label \"기능성\" / detail \"인정받은 기능성 원료인지 확인\"",
  "           label \"섭취량\" / detail \"1일 섭취량과 방법 확인\"",
  "",
  "label 은 2~10자 명사구, detail 은 30자 이내 한 줄입니다.",
  "문장 부호로 끝내지 말고 명사형·짧은 서술형으로 끊어 씁니다.",
].join("\n");

const MONOLOGUE_RULE = [
  "[원고가 1인칭 독백형일 때]",
  "작성자의 개인적인 생각·감상 문장은 이미지로 만들지 마세요.",
  "이미지는 그 문단이 담고 있는 객관적인 정보만 뽑아 재구성합니다.",
  "",
  "예)",
  '  원고 : "처음에는 왜 이런 성분들이 들어갔을까 싶었다."',
  "  → 이 문장 자체는 이미지로 만들지 않습니다.",
  "  → 대신 그 문단에서 설명한 구성을 표로 정리합니다.",
  '     title "주요 기능성 구성" / table.headers ["기능", "관련 원료"]',
  "",
  '"나는", "내가", "싶었다", "괜찮아 보였다" 같은 1인칭 표현을 이미지 문구에 넣지 마세요.',
  "이미지는 원고를 읽지 않은 사람이 봐도 정보로 성립해야 합니다.",
].join("\n");

const FACT_RULE = [
  "[사실 범위]",
  "원고에 없는 사실을 새로 만들지 마세요.",
  "특히 의학·법률·금융 수치나 효능·효과를 임의로 추가하지 않습니다.",
  "원고에서 확인 가능한 내용을 체크리스트·표·단계·비교로 재구성하는 것만 허용합니다.",
].join("\n");

function typeGuide(): string {
  const rows = INFO_VISUAL_TYPES.map(
    (spec) => `  ${spec.id} (${spec.label}) — ${spec.whenToUse}`,
  );
  return [
    "[정보 이미지 유형]",
    ...rows,
    "",
    "유형별로 반드시 채워야 하는 필드가 다릅니다.",
    "  summary, checklist  → items 4~5개",
    "  process             → process 3~5단계 (순서가 분명해야 함)",
    "  comparison          → comparison.leftTitle/leftItems, rightTitle/rightItems (각 3~4개)",
    "  table               → table.headers 2개, table.rows 3~5행 (각 행은 2칸)",
    "  number              → highlight.value(짧은 숫자) + highlight.caption, items 3~5개",
    "",
    "쓰지 않는 필드는 빈 배열 또는 빈 문자열로 두세요. null 을 쓰지 마세요.",
  ].join("\n");
}

const DIVERSITY_RULE = [
  "[유형 배분]",
  "한 원고에서 같은 유형을 3장 이상 만들지 마세요. 같은 유형이 연속으로 나오지 않게 배치합니다.",
  "원고에 재료가 없는 유형은 억지로 만들지 말고, 대신 재료가 있는 다른 유형을 고르세요.",
  "표로 정리할 대응 관계가 없는데 table 을 만들지 않습니다.",
  "순서가 없는 내용을 process 로 만들지 않습니다.",
].join("\n");

const THUMBNAIL_RULE = [
  "[대표 이미지 (type=thumbnail)]",
  "정보를 나열하지 않습니다. items·table·comparison·process·highlight 를 전부 비웁니다.",
  "title 은 클릭을 부르는 짧은 문구 (20자 내외, 두세 어절씩 끊어 읽히게).",
  "subtitle 은 한 줄 서브카피 (25자 내외).",
  "",
  "예) title : \"관절영양제, 언제부터 챙겨야 할까?\"",
  "    subtitle : \"부모님 관절 건강을 위해 확인해야 할 기준\"",
].join("\n");

/* ------------------------------------------------------------------ */
/* 기획 프롬프트                                                        */
/* ------------------------------------------------------------------ */

export function buildInfoVisualSystemPrompt(articleType?: AiBlogArticleType): string {
  return [
    ROLE,
    "",
    VALUE_RULE,
    "",
    typeGuide(),
    "",
    THUMBNAIL_RULE,
    "",
    COPY_RULE,
    "",
    FACT_RULE,
    "",
    DIVERSITY_RULE,
    ...(articleType === "monologue" ? ["", MONOLOGUE_RULE] : []),
    "",
    "[출력]",
    "지정된 JSON 구조를 정확히 지킵니다. 설명 문장을 덧붙이지 않습니다.",
  ].join("\n");
}

function inputBlock(input: AiBlogInput): string {
  return [
    "[원고 정보]",
    `주제 : ${input.topic}`,
    `핵심 키워드 : ${input.keywords.join(", ") || "(없음)"}`,
    `분야 : ${categoryLabel(input.category) || "기타"}`,
    `타깃 독자 : ${input.target || "일반 독자"}`,
  ].join("\n");
}

export function buildInfoVisualPlanPrompt(request: InfoVisualPlanRequest): string {
  const { draft, input, infoCount, withThumbnail } = request;
  const total = infoCount + (withThumbnail ? 1 : 0);

  const lines = [
    inputBlock(input),
    "",
    "[최종 원고]",
    `제목 : ${draft.title}`,
    "",
    draft.body,
    "",
    "[요청]",
    `위 원고를 분석해 이미지 ${total}장의 기획을 만들어 주세요.`,
  ];

  if (withThumbnail) {
    lines.push(
      `  1장 : 대표 이미지 (type=thumbnail)`,
      `  ${infoCount}장 : 정보 이미지 (thumbnail 을 제외한 유형에서 고른다)`,
      "배열의 첫 번째 항목이 대표 이미지여야 합니다.",
    );
  } else {
    lines.push(`  ${infoCount}장 모두 정보 이미지입니다. type=thumbnail 은 만들지 마세요.`);
  }

  lines.push(
    "",
    "각 이미지마다 purpose 에 '이 이미지가 독자에게 해주는 일'을 한 줄로 적습니다.",
    "sourceSections 에는 이 정보를 뽑아낸 원고 소제목을 1~2개 적습니다.",
    "이미지끼리도 내용이 겹치지 않게 서로 다른 각도로 만드세요.",
  );

  const exclude = (request.exclude ?? []).filter(Boolean);
  if (exclude.length > 0) {
    lines.push(
      "",
      "[제외]",
      "아래 제목은 이미 사용했습니다. 같은 내용을 다시 만들지 말고 다른 각도로 기획하세요.",
      ...exclude.map((title) => `- ${title}`),
    );
  }

  return lines.join("\n");
}

/** 원고 문장을 그대로 옮긴 곳이 있을 때 붙이는 재요청 문구 */
export function buildInfoOverlapRetryNote(duplicates: string[]): string {
  return [
    "",
    "",
    "[재요청] 아래 문구는 원고 문장을 그대로 옮긴 것입니다.",
    ...duplicates.slice(0, 8).map((text) => `- ${text}`),
    "같은 정보를 더 짧은 라벨과 다른 표현으로 다시 써 주세요. 원고 소제목도 그대로 쓰지 않습니다.",
  ].join("\n");
}

/* ------------------------------------------------------------------ */
/* 개별 이미지 수정                                                     */
/* ------------------------------------------------------------------ */

export function buildInfoVisualReviseSystemPrompt(articleType?: AiBlogArticleType): string {
  return [
    ROLE,
    "",
    typeGuide(),
    "",
    THUMBNAIL_RULE,
    "",
    COPY_RULE,
    "",
    FACT_RULE,
    ...(articleType === "monologue" ? ["", MONOLOGUE_RULE] : []),
    "",
    "[수정 작업]",
    "이미지 한 장만 고칩니다. 요청받은 부분만 바꾸고 나머지는 최대한 유지합니다.",
    "요청이 유형 변경을 뜻하면 type 을 바꾸고, 그 유형이 요구하는 필드를 채웁니다.",
    "대표 이미지(thumbnail)는 요청이 없으면 유형을 바꾸지 않습니다.",
  ].join("\n");
}

/** 수정 대상 기획을 사람이 읽는 형태로 펼친다 (JSON 을 그대로 넣지 않는다) */
function planDigest(plan: InfoVisualPlan): string {
  const lines = [
    `유형 : ${plan.type} (${infoVisualTypeLabel(plan.type)})`,
    `제목 : ${plan.title}`,
    `보조 문구 : ${plan.subtitle ?? "(없음)"}`,
    `목적 : ${plan.purpose}`,
  ];

  if (plan.items.length > 0) {
    lines.push("항목 :", ...plan.items.map((i) => `  - ${i.label} / ${i.detail ?? ""}`));
  }
  if (plan.process && plan.process.length > 0) {
    lines.push("단계 :", ...plan.process.map((i, n) => `  ${n + 1}. ${i.label} / ${i.detail ?? ""}`));
  }
  if (plan.table) {
    lines.push(
      `표 : ${plan.table.headers.join(" | ")}`,
      ...plan.table.rows.map((r) => `  ${r[0]} | ${r[1]}`),
    );
  }
  if (plan.comparison) {
    lines.push(
      `비교 좌 : ${plan.comparison.left.title} — ${plan.comparison.left.items.join(", ")}`,
      `비교 우 : ${plan.comparison.right.title} — ${plan.comparison.right.items.join(", ")}`,
    );
  }
  if (plan.highlight) {
    lines.push(`강조 숫자 : ${plan.highlight.value} — ${plan.highlight.caption}`);
  }

  return lines.join("\n");
}

export function buildInfoVisualRevisePrompt(request: InfoVisualReviseRequest): string {
  const { plan, draft, input, instruction } = request;

  const lines = [
    inputBlock(input),
    "",
    "[최종 원고]",
    `제목 : ${draft.title}`,
    "",
    draft.body,
    "",
    "[현재 이미지 기획]",
    planDigest(plan),
    "",
  ];

  const note = (instruction ?? "").trim();
  if (note) {
    lines.push("[수정 요청]", note, "", "요청을 반영한 이미지 기획 한 장을 돌려주세요.");
  } else {
    lines.push(
      "[요청]",
      "같은 원고에서 다른 각도로 이 이미지를 다시 기획해 주세요.",
      "현재 제목·항목과 겹치지 않게, 더 유용한 정보로 바꿉니다.",
      plan.type === "thumbnail"
        ? "대표 이미지이므로 type 은 thumbnail 을 유지합니다."
        : "필요하면 유형(type)도 바꿔도 됩니다.",
    );
  }

  const siblings = (request.siblingTitles ?? []).filter((t) => t && t !== plan.title);
  if (siblings.length > 0) {
    lines.push(
      "",
      "[다른 이미지 제목 — 내용이 겹치면 안 됩니다]",
      ...siblings.map((title) => `- ${title}`),
    );
  }

  return lines.join("\n");
}

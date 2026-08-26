import { BLOCK, faqToMarkdown } from "@/lib/ai-blog/article";
import { articleTypeLabel, categoryLabel, purposeLabel } from "@/lib/ai-blog/options";
import { buildImagePrompts } from "@/lib/ai-blog/prompts";
import type { AiBlogService } from "@/lib/ai-blog/service";
import type {
  AiBlogArticle,
  AiBlogArticleType,
  AiBlogDraft,
  AiBlogFaq,
  AiBlogImageAsset,
  AiBlogImageRequest,
  AiBlogInput,
  AiBlogReviseAction,
  AiBlogReviseInstruction,
  AiBlogSection,
} from "@/lib/ai-blog/types";

/**
 * AI 블로그 콘텐츠 제작 — Mock 구현.
 *
 * 실제 AI API가 연결되기 전에 화면 흐름과 데이터 구조를 그대로 검증하기 위한 구현이다.
 * 입력값(주제·키워드·유형·목적·타깃·분량)에 따라 결과가 달라지도록 만들었지만,
 * 어디까지나 템플릿 조합이므로 사실 확인이 필요한 내용을 담고 있지 않다.
 *
 * 실제 API로 교체할 때 이 파일은 지우지 말고 남겨두면
 * 오프라인/데모 환경에서 계속 사용할 수 있다. (service.ts의 setAiBlogService 참고)
 */

/* ------------------------------------------------------------------ */
/* 유틸                                                                 */
/* ------------------------------------------------------------------ */

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** 마지막 글자에 받침이 있는지 (한글이 아니면 받침 없음으로 본다) */
function hasFinalConsonant(word: string): boolean {
  const ch = word.trim().slice(-1);
  if (!ch) return false;
  const code = ch.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

type JosaPair = "은는" | "이가" | "을를" | "과와" | "로";

/** 조사 붙이기 — 템플릿 문장이 어색해지지 않도록 받침을 보고 고른다 */
function josa(word: string, pair: JosaPair): string {
  const final = hasFinalConsonant(word);
  if (pair === "로") return `${word}${final ? "으로" : "로"}`;
  const [withFinal, withoutFinal] = [
    { 은는: "은", 이가: "이", 을를: "을", 과와: "과" }[pair],
    { 은는: "는", 이가: "가", 을를: "를", 과와: "와" }[pair],
  ];
  return `${word}${final ? withFinal : withoutFinal}`;
}

/** "~이라면 / ~라면" 처럼 받침에 따라 갈리는 어미 */
function ira(word: string): string {
  return `${word}${hasFinalConsonant(word) ? "이" : ""}라면`;
}

interface Ctx {
  input: AiBlogInput;
  topic: string;
  keywords: string[];
  target: string;
  /** 목표 분량에 따라 문단을 얼마나 더 붙일지 */
  extra: number;
  /** 광고성 표현을 자제할지 (추가 요청사항에 '광고'가 언급된 경우) */
  soft: boolean;
}

function contextOf(input: AiBlogInput): Ctx {
  const keywords = input.keywords.filter(Boolean);
  return {
    input,
    topic: input.topic.trim(),
    keywords,
    target: input.target.trim() || "관련 정보를 찾는 분",
    extra: Math.max(0, Math.round((input.articleLength - 1_500) / 700)),
    soft: /광고|홍보/.test(input.requestNotes),
  };
}

/** i번째 키워드 — 없으면 주제로 대체한다 */
function kw(c: Ctx, i: number): string {
  return c.keywords[i] ?? c.keywords[c.keywords.length - 1] ?? c.topic;
}

/* ------------------------------------------------------------------ */
/* 제목                                                                 */
/* ------------------------------------------------------------------ */

const TITLE_TEMPLATES: Record<AiBlogArticleType, Array<(c: Ctx) => string>> = {
  expert: [
    (c) => `${c.topic}, 꼭 확인해야 할 것`,
    (c) => `${c.topic} 전에 반드시 알아둘 3가지`,
    (c) => `${kw(c, 0)} 기준으로 정리한 ${c.topic}`,
    (c) => `${c.topic}, 판단 기준부터 정리했습니다`,
  ],
  review: [
    (c) => `${c.topic}, 직접 알아보고 정리했습니다`,
    (c) => `${c.topic} 겪어보며 느낀 점 정리`,
    (c) => `${kw(c, 0)}부터 확인한 ${c.topic} 후기`,
    (c) => `${c.topic}, 실제로 해보니 이렇더라고요`,
  ],
  compare: [
    (c) => `${c.topic}, 무엇이 다를까? 항목별 비교`,
    (c) => `${kw(c, 0)} vs ${kw(c, 1)} 한눈에 비교`,
    (c) => `${c.topic} 선택 기준 비교 정리`,
    (c) => `${c.topic}, 상황별로 유리한 선택은?`,
  ],
  qna: [
    (c) => `${c.topic}, 가장 많이 묻는 질문 정리`,
    (c) => `${c.topic} Q&A — 헷갈리는 부분만 모았습니다`,
    (c) => `${kw(c, 0)} 관련 질문 7가지 정리`,
    (c) => `${c.topic}, 이것만 알면 됩니다`,
  ],
};

function titleCandidates(c: Ctx): string[] {
  const base = TITLE_TEMPLATES[c.input.articleType].map((build) => build(c));
  // SEO 목적이면 첫 키워드를 제목 앞쪽에 노출시킨다
  return c.input.purpose === "seo"
    ? base.map((t, i) => (i === 0 && !t.includes(kw(c, 0)) ? `${kw(c, 0)} | ${t}` : t))
    : base;
}

/* ------------------------------------------------------------------ */
/* 본문 구성                                                            */
/* ------------------------------------------------------------------ */

interface SectionPlan {
  heading: (c: Ctx) => string;
  paragraphs: (c: Ctx) => string[];
}

const SECTION_PLANS: Record<AiBlogArticleType, SectionPlan[]> = {
  expert: [
    {
      heading: (c) => `${c.topic}, 어떤 상황에서 문제가 되나요?`,
      paragraphs: (c) => [
        `${josa(c.topic, "은는")} 상황마다 적용되는 기준이 달라서, 같은 사례처럼 보여도 결론이 다르게 나오는 경우가 많습니다. 그래서 가장 먼저 할 일은 지금 내 상황이 어떤 조건에 해당하는지 정리하는 것입니다.`,
        `특히 ${josa(kw(c, 0), "은는")} 판단의 출발점이 되는 경우가 많습니다. 관련 서류나 기록이 있다면 날짜 순으로 모아두고, 확인되지 않은 내용은 사실과 추측을 구분해 적어두는 편이 좋습니다.`,
      ],
    },
    {
      heading: (c) => `${kw(c, 1)} 기준부터 확인하세요`,
      paragraphs: (c) => [
        `${josa(kw(c, 1), "을를")} 확인할 때는 문서에 적힌 내용과 실제 진행된 내용이 같은지 함께 봐야 합니다. 둘이 다르면 나중에 근거를 대기 어려워지기 때문입니다.`,
        `${ira(c.target)} 이 단계에서 한 번 더 확인해 두는 것만으로도 불필요한 분쟁을 상당 부분 줄일 수 있습니다. 확인한 날짜와 방법을 함께 기록해 두세요.`,
      ],
    },
    {
      heading: () => `실제로는 이렇게 진행됩니다`,
      paragraphs: (c) => [
        `절차는 보통 확인 → 요청 → 협의 → 정리 순으로 이어집니다. 각 단계에서 남긴 기록이 다음 단계의 근거가 되므로, 통화보다는 문자·메일처럼 남는 방식이 유리합니다.`,
        `${josa(kw(c, 2), "이가")} 관련된 경우에는 처리 기간이 더 걸릴 수 있습니다. 일정에 여유를 두고 준비하는 편이 안전합니다.`,
      ],
    },
    {
      heading: () => `놓치기 쉬운 주의사항`,
      paragraphs: (c) => [
        `가장 흔한 실수는 "말로만 정리하고 넘어가는 것"입니다. 서로 이해한 내용이 다르면 나중에 확인할 방법이 없습니다.`,
        `또한 인터넷에서 본 사례를 그대로 적용하면 오히려 손해를 볼 수 있습니다. ${categoryLabel(c.input.category)} 분야는 조건이 조금만 달라져도 결론이 바뀔 수 있으니, 최종 판단 전에는 반드시 원문이나 전문가 확인을 거치세요.`,
      ],
    },
  ],
  review: [
    {
      heading: (c) => `${josa(c.topic, "을를")} 알아보게 된 이유`,
      paragraphs: (c) => [
        `처음에는 간단하게 끝날 줄 알았는데, 막상 알아보니 확인할 게 생각보다 많았습니다. ${josa(kw(c, 0), "이가")} 특히 헷갈렸습니다.`,
        `비슷한 고민을 하는 ${josa(c.target, "이가")} 적지 않을 것 같아, 알아보면서 정리한 내용을 순서대로 남겨봅니다.`,
      ],
    },
    {
      heading: () => `직접 확인해 본 내용`,
      paragraphs: (c) => [
        `먼저 ${josa(kw(c, 1), "을를")} 기준으로 하나씩 확인했습니다. 자료를 찾아보고, 필요한 부분은 직접 문의해서 답을 들었습니다.`,
        `확인 과정에서 알게 된 건, 조건에 따라 결과가 꽤 달라진다는 점이었습니다. 그래서 내 상황을 먼저 정리하는 게 시간을 아끼는 방법이었습니다.`,
      ],
    },
    {
      heading: () => `좋았던 점과 아쉬웠던 점`,
      paragraphs: (c) => [
        `좋았던 건 기준을 알고 나니 판단이 빨라졌다는 점입니다. 반대로 아쉬웠던 건 안내가 흩어져 있어 정리에 시간이 걸렸다는 점이었습니다.`,
        `${josa(kw(c, 2), "은는")} 미리 준비해 두면 확실히 수월합니다. 저처럼 뒤늦게 찾지 마시고 먼저 챙겨보세요.`,
      ],
    },
    {
      heading: () => `정리하며`,
      paragraphs: (c) => [
        `결론만 말하면, ${josa(c.topic, "은는")} 순서를 지켜 확인하면 크게 어렵지 않았습니다. 다만 기록을 남기는 습관은 꼭 필요했습니다.`,
      ],
    },
  ],
  compare: [
    {
      heading: () => `비교 전에 알아둘 기준`,
      paragraphs: (c) => [
        `무엇이 더 좋은지는 상황에 따라 다릅니다. 그래서 비교하기 전에 어떤 기준으로 볼지부터 정해야 합니다.`,
        `여기서는 ${c.keywords.slice(0, 3).join(", ") || c.topic} 기준으로 비교했습니다.`,
      ],
    },
    {
      heading: (c) => `${kw(c, 0)}와 ${kw(c, 1)}, 무엇이 다른가`,
      paragraphs: (c) => [
        `가장 큰 차이는 적용 조건입니다. ${josa(kw(c, 0), "은는")} 조건이 명확할 때 유리하고, ${josa(kw(c, 1), "은는")} 상황 변화가 잦을 때 선택지가 넓습니다.`,
        `비용과 시간도 함께 봐야 합니다. 겉으로 드러나는 금액만 보면 나중에 추가 비용이 생길 수 있습니다.`,
      ],
    },
    {
      heading: () => `상황별로 어떤 선택이 유리할까`,
      paragraphs: (c) => [
        `${c.target}처럼 확인할 시간이 넉넉하지 않다면 절차가 단순한 쪽이 낫습니다. 반대로 조건을 세밀하게 맞춰야 한다면 시간이 걸리더라도 검토가 필요합니다.`,
      ],
    },
    {
      heading: () => `선택 전 마지막 확인`,
      paragraphs: () => [
        `아래 표와 체크리스트로 한 번 더 확인해 보세요. 항목별로 비교하면 판단이 훨씬 빨라집니다.`,
      ],
    },
  ],
  qna: [
    {
      heading: (c) => `Q. ${c.topic}, 무조건 그렇게 되나요?`,
      paragraphs: (c) => [
        `아닙니다. 조건에 따라 결론이 달라집니다. ${josa(kw(c, 0), "이가")} 어떻게 정리되어 있는지에 따라 판단이 나뉩니다.`,
        `그래서 "무조건 된다/안 된다"보다는 내 상황이 어느 쪽에 해당하는지를 먼저 확인해야 합니다.`,
      ],
    },
    {
      heading: (c) => `Q. ${kw(c, 1)}, 언제까지 확인해야 하나요?`,
      paragraphs: () => [
        `일정이 정해져 있는 경우가 많아 미루면 선택지가 줄어듭니다. 여유 있게 확인하고, 확인한 날짜를 남겨두세요.`,
      ],
    },
    {
      heading: () => `Q. 준비해야 할 자료는 무엇인가요?`,
      paragraphs: (c) => [
        `계약·신청 관련 서류와 주고받은 메시지가 기본입니다. ${josa(kw(c, 2), "이가")} 관련된 자료가 있다면 함께 정리해 두면 좋습니다.`,
      ],
    },
    {
      heading: () => `Q. 혼자 해결하기 어렵다면?`,
      paragraphs: (c) => [
        `${categoryLabel(c.input.category)} 분야는 사례마다 조건이 달라, 판단이 서지 않을 때는 관련 기관이나 전문가의 확인을 받는 편이 안전합니다.`,
      ],
    },
  ],
};

/** 분량을 늘릴 때 덧붙이는 문단 */
const EXTRA_PARAGRAPHS: Array<(c: Ctx) => string> = [
  (c) =>
    `조금 더 덧붙이면, ${josa(kw(c, 0), "은는")} 한 번 확인하고 끝내기보다 진행 상황이 바뀔 때마다 다시 점검하는 편이 좋습니다. 상황이 달라지면 적용 기준도 함께 달라지기 때문입니다.`,
  (c) =>
    `${josa(c.target, "이가")} 자주 놓치는 부분은 "확인은 했지만 기록은 남기지 않는 것"입니다. 나중에 근거가 필요할 때 가장 아쉬운 지점이니, 간단한 메모라도 남겨두세요.`,
  (c) =>
    `관련 내용을 찾을 때는 출처가 분명한 자료부터 보는 것이 좋습니다. ${categoryLabel(c.input.category)} 분야는 오래된 정보가 그대로 돌아다니는 경우가 있어, 최신 기준인지 함께 확인해야 합니다.`,
];

function buildSections(c: Ctx): AiBlogSection[] {
  return SECTION_PLANS[c.input.articleType].map((plan, i) => {
    const paragraphs = plan.paragraphs(c);
    for (let n = 0; n < c.extra; n += 1) {
      const build = EXTRA_PARAGRAPHS[(i + n) % EXTRA_PARAGRAPHS.length];
      paragraphs.push(build(c));
    }
    return { heading: plan.heading(c), paragraphs };
  });
}

function buildIntro(c: Ctx): string {
  const purpose = c.input.purpose;
  const lead =
    purpose === "product"
      ? `${josa(c.topic, "을를")} 알아보는 분들이 늘고 있습니다. 다만 어떤 기준으로 봐야 하는지는 정리된 곳이 많지 않습니다.`
      : purpose === "brand"
        ? `현장에서 ${josa(c.topic, "과와")} 관련한 문의를 자주 받습니다. 자주 나오는 질문을 기준으로 내용을 정리했습니다.`
        : `${josa(c.topic, "은는")} 막상 닥치면 어디서부터 확인해야 할지 막막한 주제입니다.`;

  return [
    lead,
    `${ira(c.target)} ${c.keywords.slice(0, 3).join(", ") || c.topic} 정도는 미리 확인해 두는 편이 좋습니다. 이 글에서는 확인 순서와 판단 기준을 정리했습니다.`,
    c.soft
      ? `특정 상품이나 업체를 권하는 글이 아니라, 스스로 판단할 수 있도록 기준만 정리한 글입니다.`
      : `읽는 데 3분이면 충분하도록 핵심만 담았습니다.`,
  ].join("\n\n");
}

function buildSummary(c: Ctx): string[] {
  const lines = [
    `${josa(kw(c, 0), "은는")} 상황에 따라 적용 기준이 달라집니다.`,
    `${josa(kw(c, 1), "을를")} 먼저 확인하면 불필요한 분쟁을 줄일 수 있습니다.`,
    `${josa(c.target, "은는")} 아래 체크리스트부터 확인해 보세요.`,
    `확인한 내용은 날짜와 함께 기록으로 남겨두는 것이 가장 확실합니다.`,
  ];
  if (c.keywords.length >= 3) {
    lines.push(`${josa(kw(c, 2), "은는")} 일정이 정해져 있는 경우가 많아 미루지 않는 것이 좋습니다.`);
  }
  return lines;
}

function buildTable(c: Ctx) {
  const rows: Array<[string, string]> = [
    [`${kw(c, 0)} 확인이 필요할 때`, "관련 서류와 주고받은 기록을 먼저 모읍니다."],
    [`${kw(c, 1)}이 애매할 때`, "문서에 적힌 내용과 실제 진행 내용을 대조합니다."],
    ["상대방과 의견이 다를 때", "구두 대신 문자·메일로 정리해 근거를 남깁니다."],
  ];
  if (c.keywords.length >= 3) {
    rows.push([`${kw(c, 2)} 일정이 걸릴 때`, "처리 기간을 감안해 미리 요청합니다."]);
  }
  return {
    caption: "상황별로 확인할 내용을 정리했습니다.",
    columns: ["상황", "확인사항"] as [string, string],
    rows,
  };
}

function buildChecklist(c: Ctx): string[] {
  return [
    `${kw(c, 0)} 관련 자료를 한곳에 모아두었나요?`,
    `${kw(c, 1)} 기준을 문서로 확인했나요?`,
    "확인한 날짜와 방법을 기록으로 남겼나요?",
    "판단이 어려운 부분을 따로 표시해 두었나요?",
  ];
}

function buildFaqs(c: Ctx): AiBlogFaq[] {
  return [
    {
      question: `${c.topic}, 상황이 달라져도 같은 기준인가요?`,
      answer: "조건이 달라지면 결론도 달라질 수 있습니다. 내 상황이 어떤 조건에 해당하는지부터 확인하세요.",
    },
    {
      question: `${kw(c, 0)} 자료가 없으면 어떻게 하나요?`,
      answer: "남아 있는 기록부터 정리하고, 부족한 부분은 상대방에게 서면으로 확인을 요청하는 편이 안전합니다.",
    },
    {
      question: "혼자 판단하기 어려울 때는 어디에 물어보나요?",
      answer: `${categoryLabel(c.input.category)} 분야의 관련 기관이나 전문가에게 확인하면 가장 확실합니다.`,
    },
  ];
}

function buildOutro(c: Ctx): string {
  return [
    `정리하면 ${josa(c.topic, "은는")} ①상황 확인 ②기준 확인 ③기록 남기기 순으로 접근하면 대부분 정리됩니다.`,
    `이 글은 ${purposeLabel(c.input.purpose)} 목적으로 ${articleTypeLabel(c.input.articleType)} 구성으로 작성했습니다. 실제 적용 전에는 최신 기준과 개별 조건을 다시 확인해 주세요.`,
  ].join("\n\n");
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
  const blocks = splitBlocks(body).map((block) => {
    const match = block.match(/^###\s+(.+)$/m);
    if (!match) return block;
    index += 1;
    return `${block}\n\n${sentence(match[1].replace(/^\d+\.\s*/, ""), index)}`;
  });
  return blocks.join("\n\n");
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

const AD_WORDS: Array<[RegExp, string]> = [
  [/무조건/g, "대체로"],
  [/최고의/g, "참고할 만한"],
  [/완벽(한|하게)/g, "충분$1"],
  [/절대/g, "가급적"],
  [/확실히/g, "대체로"],
  [/강력 ?추천/g, "참고"],
  [/보장합니다/g, "안내드립니다"],
];

function applyRevision(
  action: AiBlogReviseAction,
  draft: AiBlogDraft,
  input: AiBlogInput,
  instruction: AiBlogReviseInstruction,
): AiBlogDraft {
  const c = contextOf(input);
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
          `이 부분은 ${heading} 자체보다 적용 조건을 먼저 확인해야 판단이 정확해집니다. 근거가 되는 문서와 날짜를 함께 확인해 두세요.`,
      );
      break;

    case "simple":
      body = appendToSections(
        body,
        (heading) => `쉽게 말하면, ${heading} 부분은 "내 상황이 어디에 해당하는지"만 확인하면 됩니다.`,
      );
      break;

    case "longer":
      body = appendToSections(body, (_heading, i) =>
        EXTRA_PARAGRAPHS[i % EXTRA_PARAGRAPHS.length](c),
      );
      break;

    case "shorter":
      body = trimSections(body);
      break;

    case "less-ad":
      for (const [pattern, replacement] of AD_WORDS) body = body.replace(pattern, replacement);
      body += `\n\n> 이 글은 특정 상품을 권유하기 위한 글이 아니라, 판단 기준을 정리한 참고용 정보입니다.`;
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
      const candidates = titleCandidates(c);
      const at = candidates.indexOf(title);
      title = candidates[(at + 1 + candidates.length) % candidates.length] ?? candidates[0];
      break;
    }

    case "add-faq": {
      const extraFaqs: AiBlogFaq[] = [
        {
          question: `${c.topic}, 진행 중에 상황이 바뀌면 어떻게 하나요?`,
          answer: "바뀐 시점과 내용을 기록으로 남기고, 기준을 다시 확인하는 것이 먼저입니다.",
        },
        {
          question: "확인한 내용을 어떻게 남겨두면 좋을까요?",
          answer: "문자·메일처럼 남는 방식으로 정리하고, 파일명에 날짜를 넣어 보관하면 찾기 쉽습니다.",
        },
      ];
      const markdown = extraFaqs.map(faqToMarkdown).join("\n\n");
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
        const table = buildTable(c);
        body += `\n\n## ${BLOCK.table}\n\n${table.caption}\n\n| ${table.columns[0]} | ${table.columns[1]} |\n| --- | --- |\n${table.rows.map(([a, b]) => `| ${a} | ${b} |`).join("\n")}`;
      }
      if (!hasBlock(body, BLOCK.checklist)) {
        body += `\n\n## ${BLOCK.checklist}\n\n${buildChecklist(c).map((x) => `- [ ] ${x}`).join("\n")}`;
      }
      break;
    }

    default: {
      // 해석하지 못한 직접 입력 요청 — 요청 내용을 별도 문단으로 반영한다
      const note = (instruction.note ?? "").trim();
      body += `\n\n### 추가로 짚어볼 내용\n\n${note || "요청하신 내용"}에 대해 정리하면, 판단 기준과 확인 순서를 먼저 정한 뒤 관련 자료를 모으는 순서가 가장 효율적입니다.`;
      break;
    }
  }

  return { title, body: body.trim() };
}

/* ------------------------------------------------------------------ */
/* 이미지 (Mock)                                                        */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* 서비스 구현                                                          */
/* ------------------------------------------------------------------ */

export const mockAiBlogService: AiBlogService = {
  mode: "MOCK",

  async generateBlogArticle(input) {
    await delay(1_200);
    const c = contextOf(input);
    const article: AiBlogArticle = {
      title: titleCandidates(c)[0],
      intro: buildIntro(c),
      summary: buildSummary(c),
      sections: buildSections(c),
      table: buildTable(c),
      checklist: buildChecklist(c),
      faqs: buildFaqs(c),
      outro: buildOutro(c),
      generatedAt: new Date().toISOString(),
      source: "MOCK",
    };
    return article;
  },

  async reviseBlogArticle(draft, instruction, input) {
    await delay(800);
    return applyRevision(resolveAction(instruction), draft, input, instruction);
  },

  async generateImages(request) {
    await delay(1_500);
    const stamp = Date.now();
    return { prompts: buildImagePrompts(request), assets: toAssets(request, stamp) };
  },
};

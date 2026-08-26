import { stripParticle, unique } from "@/lib/ai-blog/subject";

/**
 * 추가 요청사항 해석.
 *
 * "추가 요청사항"은 참고 문구가 아니라 **제약조건**이다.
 * 자유 문장을 구조화해서 원고 생성 단계가 실제로 지킬 수 있게 만든다.
 * (실제 AI API를 붙일 때도 이 구조가 그대로 프롬프트의 제약조건 블록이 된다)
 */

export type BrandMentionLevel = "none" | "light" | "normal";

export interface AiBlogConstraints {
  raw: string;
  /** 문장 단위 원문 — 프롬프트에 그대로 전달한다 */
  notes: string[];
  /** 광고·홍보 표현을 쓰지 않는다 */
  noAds: boolean;
  /** 근거 → 설명 → 확인사항 순으로 전문성 있게 구성한다 */
  professional: boolean;
  /** 쉬운 표현으로 풀어 쓴다 */
  simple: boolean;
  includeTable: boolean;
  includeChecklist: boolean;
  includeFaq: boolean;
  /** 언급을 요청받은 제품·브랜드명 */
  brands: string[];
  /** 얼마나 언급할지 — light면 후반부에 1회만 */
  brandLevel: BrandMentionLevel;
  /** 화면에 "반영된 요청"으로 보여줄 라벨 */
  labels: string[];
}

const EMPTY: AiBlogConstraints = {
  raw: "",
  notes: [],
  noAds: false,
  professional: false,
  simple: false,
  includeTable: false,
  includeChecklist: false,
  includeFaq: false,
  brands: [],
  brandLevel: "normal",
  labels: [],
};

/** 브랜드 후보로 볼 수 없는 낱말 */
const NOT_BRAND =
  /^(?:너무|그리고|또한|그러나|다만|제품|브랜드|상품|우리|자사|해당|관련|특정|광고|홍보|내용|글|원고)$/;

/**
 * "○○ 제품은 살짝만 언급" 같은 문장에서 브랜드명을 뽑아낸다.
 * 제품/브랜드/상품 앞의 낱말을 우선 보고, 없으면 절의 첫 낱말을 후보로 삼는다.
 */
function extractBrands(text: string): string[] {
  const found: string[] = [];

  for (const clause of splitClauses(text)) {
    if (!/언급|소개|넣어|노출/.test(clause)) continue;

    const withNoun = clause.match(/([가-힣A-Za-z0-9][가-힣A-Za-z0-9·+\-_]*)\s*(?:제품|브랜드|상품)/);
    if (withNoun) {
      found.push(stripParticle(withNoun[1]));
      continue;
    }

    const first = clause.split(/\s+/)[0] ?? "";
    const candidate = stripParticle(first);
    if (candidate.length >= 2 && !NOT_BRAND.test(candidate)) found.push(candidate);
  }

  return unique(found).filter((brand) => brand.length >= 2 && !NOT_BRAND.test(brand));
}

function splitClauses(text: string): string[] {
  return text
    .split(/[\n.,]|(?:하되|하고|지만)\s/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function splitNotes(text: string): string[] {
  return text
    .split(/[\n.]/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 2);
}

export function parseConstraints(requestNotes: string): AiBlogConstraints {
  const raw = requestNotes.trim();
  if (!raw) return EMPTY;

  const brands = extractBrands(raw);
  const brandLevel: BrandMentionLevel = /언급하지|넣지\s*마|제외|빼\s*주|빼고/.test(raw)
    ? "none"
    : /살짝|가볍게|짧게|간단히|최소한|한두\s*번|1~2회/.test(raw)
      ? "light"
      : "normal";

  const constraints: AiBlogConstraints = {
    raw,
    notes: splitNotes(raw),
    noAds: /광고|홍보|판매\s*글|영업/.test(raw),
    professional: /전문|근거|신뢰|정확|객관/.test(raw),
    simple: /쉽게|쉬운|풀어|초보|어렵지/.test(raw),
    includeTable: /표|도표|정리표/.test(raw),
    includeChecklist: /체크리스트|체크 ?리스트|점검/.test(raw),
    includeFaq: /FAQ|faq|자주 묻는|질문/.test(raw),
    brands,
    brandLevel,
    labels: [],
  };

  constraints.labels = buildLabels(constraints);
  return constraints;
}

function buildLabels(c: AiBlogConstraints): string[] {
  const labels: string[] = [];
  if (c.noAds) labels.push("광고성 표현 지양");
  if (c.professional) labels.push("전문성 강화");
  if (c.simple) labels.push("쉬운 설명");
  if (c.includeTable) labels.push("정리 표 포함");
  if (c.includeChecklist) labels.push("체크리스트 포함");
  if (c.includeFaq) labels.push("FAQ 포함");
  for (const brand of c.brands) {
    labels.push(
      c.brandLevel === "none"
        ? `${brand} 언급 제외`
        : c.brandLevel === "light"
          ? `${brand} 최소 언급`
          : `${brand} 언급`,
    );
  }
  return labels;
}

/** 원고에서 실제로 언급할 브랜드 (요청이 없거나 제외 요청이면 없음) */
export function mentionBrand(c: AiBlogConstraints): string | undefined {
  if (c.brandLevel === "none") return undefined;
  return c.brands[0];
}

/** light 요청이면 본문 전체에서 몇 번까지 허용할지 */
export function brandMentionLimit(c: AiBlogConstraints): number {
  if (c.brandLevel === "none") return 0;
  return c.brandLevel === "light" ? 2 : 4;
}

/** 광고성 표현 → 정보성 표현 치환표 */
export const AD_WORDS: Array<[RegExp, string]> = [
  [/무조건/g, "대체로"],
  [/최고의/g, "참고할 만한"],
  [/완벽(한|하게)/g, "충분$1"],
  [/절대/g, "가급적"],
  [/확실히/g, "대체로"],
  [/강력\s?추천/g, "참고"],
  [/보장합니다/g, "안내드립니다"],
  [/효과가 좋습니다/g, "도움이 될 수 있습니다"],
  [/특효/g, "도움"],
];

/** 광고성 표현을 정보성 표현으로 바꾼다 */
export function toneDownAds(text: string): string {
  let next = text;
  for (const [pattern, replacement] of AD_WORDS) next = next.replace(pattern, replacement);
  return next;
}

/**
 * 브랜드 언급 횟수를 요청 수준에 맞게 제한한다.
 * 허용 횟수를 넘는 언급은 "해당 제품"으로 바꿔 반복 노출을 막는다.
 */
export function limitBrandMentions(text: string, brand: string, limit: number): string {
  if (!brand) return text;
  let seen = 0;
  return text.split(brand).reduce((acc, part, index) => {
    if (index === 0) return part;
    seen += 1;
    return `${acc}${seen <= limit ? brand : "해당 제품"}${part}`;
  }, "");
}

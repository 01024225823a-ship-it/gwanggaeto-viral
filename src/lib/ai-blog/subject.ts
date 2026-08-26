/**
 * 주제 분석 — 원고 생성의 1순위 기준인 "포스팅 주제"를 실제로 쓸 수 있는 형태로 쪼갠다.
 *
 * 범용 템플릿에 키워드만 끼워 넣지 않으려면, 먼저 주제에서
 * ① 무엇에 대한 글인지(핵심 대상) ② 무엇을 묻고 있는지(의도)를 뽑아내야 한다.
 */

/** 문장 끝에 붙는 조사 */
const TRAILING_PARTICLE =
  /(?:이|가|은|는|을|를|의|에|에서|으로|로|와|과|도|만|까지|부터|보다|처럼|이라도|라도)$/;

/**
 * 주제 문장에서 떼어낼 꼬리표.
 * "관절영양제가 필요한 이유" → "관절영양제"
 */
const TOPIC_TAIL =
  /\s*(?:이|가|은|는|을|를)?\s*(?:정말\s*)?(?:꼭\s*)?(?:필요한 이유|중요한 이유|해야 하는 이유|고르는 법|고르는 방법|선택하는 법|선택하는 방법|알아보는 법|하는 방법|하는 법|할 때|하는 경우|하는 이유|총정리|완벽 정리|정리|가이드|방법|이유|후기|비교|추천|차이)\s*$/;

/**
 * 동사·연결어미로 끝나는 표현 — 명사구가 아니라 "절"이라는 신호.
 * 예: "나가라고", "실거주한다고"
 */
const CLAUSE_ENDING =
  /(?:라고|다고|하고|이고|되고|으며|하며|해서|하면|는데|려고|으려고|한다|된다|이다|였다|했다)$/;

/** 문장 중간에 주격 조사가 있으면 명사구가 아니라 문장이다 */
const HAS_SUBJECT_MARKER = /[가-힣](?:이|가)\s/;

/** 문장이 아니라 "무엇"을 가리키는 명사구인지 */
export function looksLikeNounPhrase(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 2) return false;
  if (CLAUSE_ENDING.test(trimmed)) return false;
  if (HAS_SUBJECT_MARKER.test(trimmed)) return false;
  return true;
}

/**
 * 주제에서 조사·꼬리표를 걷어낸 핵심 대상.
 *
 * 주제가 "집주인이 실거주한다고 나가라고 할 때"처럼 문장형이면
 * 꼬리표를 떼어도 명사구가 나오지 않는다. 이럴 때는
 * 사용자가 직접 적은 핵심 키워드를 우선 쓰고, 그것도 없으면
 * 주제에서 명사로 보이는 첫 낱말을 쓴다.
 */
export function extractSubject(topic: string, keywords: string[] = []): string {
  let text = topic.replace(/\s+/g, " ").trim();

  // "~가 필요한 이유" 같은 꼬리표는 최대 두 번까지 걷어낸다
  for (let i = 0; i < 2; i += 1) {
    const next = text.replace(TOPIC_TAIL, "").trim();
    if (next === text) break;
    text = next;
  }

  text = stripParticle(text);
  if (looksLikeNounPhrase(text)) return text;

  const keyword = keywords.map((k) => k.trim()).find(looksLikeNounPhrase);
  if (keyword) return keyword;

  const fromTopic = topic
    .split(/[\s,·/]+/)
    .map(stripParticle)
    .find((token) => looksLikeNounPhrase(token) && !STOP_WORDS.has(token));
  if (fromTopic) return fromTopic;

  return topic.trim();
}

/** 단어 끝 조사 제거 */
export function stripParticle(word: string): string {
  const trimmed = word.trim();
  if (trimmed.length <= 2) return trimmed;
  return trimmed.replace(TRAILING_PARTICLE, "").trim() || trimmed;
}

/** 주제가 무엇을 묻고 있는지 */
export type TopicIntent = "reason" | "howto" | "situation" | "compare" | "review" | "general";

export function topicIntent(topic: string): TopicIntent {
  if (/비교|차이|vs|VS|어느 것|뭐가 다/.test(topic)) return "compare";
  if (/후기|써보|사용해|추천/.test(topic)) return "review";
  if (/이유|왜|필요한/.test(topic)) return "reason";
  if (/방법|어떻게|고르는|선택|하는 법/.test(topic)) return "howto";
  if (/할 때|경우|상황|받으면|하면/.test(topic)) return "situation";
  return "general";
}

/**
 * 주제·키워드에서 검색·검증에 쓸 표현 목록.
 * 조사를 떼고 2글자 이상만 남긴다.
 */
export function topicTerms(topic: string, keywords: string[]): string[] {
  const fromTopic = topic
    .split(/[\s,·/]+/)
    .map(stripParticle)
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));

  const fromKeywords = keywords.flatMap((keyword) =>
    keyword
      .split(/[\s,·/]+/)
      .map(stripParticle)
      .filter((t) => t.length >= 2),
  );

  const subject = extractSubject(topic, keywords);
  return unique([subject, ...fromKeywords, ...fromTopic]);
}

/** 주제 문장에서 의미가 없는 흔한 낱말 */
const STOP_WORDS = new Set([
  "이유",
  "방법",
  "정리",
  "가이드",
  "총정리",
  "때문",
  "경우",
  "정말",
  "그리고",
  "하지만",
  "무엇",
  "어떻게",
  "필요한",
  "중요한",
]);

export function unique(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

/** 마지막 글자에 받침이 있는지 (한글이 아니면 받침 없음으로 본다) */
export function hasFinalConsonant(word: string): boolean {
  const ch = word.trim().slice(-1);
  if (!ch) return false;
  const code = ch.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

export type JosaPair = "은는" | "이가" | "을를" | "과와" | "로";

/** 조사 붙이기 — 템플릿 문장이 어색해지지 않도록 받침을 보고 고른다 */
export function josa(word: string, pair: JosaPair): string {
  const final = hasFinalConsonant(word);
  if (pair === "로") return `${word}${final ? "으로" : "로"}`;
  const table: Record<Exclude<JosaPair, "로">, [string, string]> = {
    은는: ["은", "는"],
    이가: ["이", "가"],
    을를: ["을", "를"],
    과와: ["과", "와"],
  };
  const [withFinal, withoutFinal] = table[pair];
  return `${word}${final ? withFinal : withoutFinal}`;
}

/** "~이라면 / ~라면" 처럼 받침에 따라 갈리는 어미 */
export function ira(word: string): string {
  return `${word}${hasFinalConsonant(word) ? "이" : ""}라면`;
}

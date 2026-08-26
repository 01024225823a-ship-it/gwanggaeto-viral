/**
 * AI 블로그 콘텐츠 제작 — 도메인 타입
 *
 * 이 기능은 일반 주문 상품(Order)이 아니라 "도구형 서비스"다.
 * 따라서 주문/검수/정산 도메인(lib/domain/types.ts)과 분리해 이 폴더에서만 정의한다.
 *
 * 현재는 Mock 구현 + localStorage 저장이지만, 타입을 그대로 서버 스키마로 옮길 수 있도록
 * UI에 종속된 값(클래스명·아이콘 등)은 절대 넣지 않는다.
 */

/* ------------------------------------------------------------------ */
/* 입력 (STEP 1)                                                        */
/* ------------------------------------------------------------------ */

/** 업종·분야 */
export type AiBlogCategory =
  | "realestate"
  | "legal"
  | "health"
  | "beauty"
  | "food"
  | "education"
  | "finance"
  | "auto"
  | "etc";

/** 원고 목적 */
export type AiBlogPurpose = "info" | "seo" | "product" | "brand" | "compare";

/** 원고 유형 */
export type AiBlogArticleType = "expert" | "review" | "compare" | "qna";

/** 참고자료 — MVP에서는 외부 URL을 크롤링하지 않고 입력값만 보관·활용한다 */
export interface AiBlogReference {
  id: string;
  kind: "url" | "text";
  value: string;
}

export interface AiBlogInput {
  /** 포스팅 주제 (필수) */
  topic: string;
  /** 핵심 키워드 (필수, 1개 이상) */
  keywords: string[];
  category: AiBlogCategory;
  purpose: AiBlogPurpose;
  /** 타깃 독자 */
  target: string;
  articleType: AiBlogArticleType;
  /** 목표 분량 (자) */
  articleLength: number;
  references: AiBlogReference[];
  /** 추가 요청사항 */
  requestNotes: string;
}

/* ------------------------------------------------------------------ */
/* 원고 (STEP 2·3)                                                      */
/* ------------------------------------------------------------------ */

/** 원고가 어떻게 만들어졌는지 — 실제 AI 연결 전에는 항상 MOCK */
export type AiBlogSource = "MOCK" | "AI";

export interface AiBlogSection {
  heading: string;
  paragraphs: string[];
}

export interface AiBlogTable {
  caption: string;
  columns: [string, string];
  rows: Array<[string, string]>;
}

export interface AiBlogFaq {
  question: string;
  answer: string;
}

/** AI가 생성한 구조화 원고 */
export interface AiBlogArticle {
  title: string;
  intro: string;
  /** 핵심 요약 3~5개 */
  summary: string[];
  sections: AiBlogSection[];
  table?: AiBlogTable;
  checklist: string[];
  faqs: AiBlogFaq[];
  outro: string;
  generatedAt: string;
  source: AiBlogSource;
}

/**
 * 사용자가 편집하는 원고.
 * 구조화 원고(AiBlogArticle)를 마크다운 본문으로 펼쳐 자유롭게 고칠 수 있게 한다.
 */
export interface AiBlogDraft {
  title: string;
  /** 마크다운 본문 */
  body: string;
}

/**
 * 최종 원고에서 이미지 제작에 필요한 정보만 추출한 결과.
 * "최초 생성본"이 아니라 "사용자가 수정한 최종 원고"를 파싱해 만든다.
 */
export interface AiBlogOutline {
  title: string;
  summary: string[];
  headings: string[];
  checklist: string[];
  faqs: AiBlogFaq[];
  tableRows: Array<[string, string]>;
  plainText: string;
  charCount: number;
}

/* ------------------------------------------------------------------ */
/* 원고 수정 (STEP 3)                                                   */
/* ------------------------------------------------------------------ */

export type AiBlogReviseAction =
  | "professional"
  | "simple"
  | "longer"
  | "shorter"
  | "less-ad"
  | "seo"
  | "retitle"
  | "add-faq"
  | "add-table"
  | "custom";

export interface AiBlogReviseInstruction {
  action: AiBlogReviseAction;
  /** 화면 표시명 (이력·토스트에 사용) */
  label: string;
  /** action === "custom" 일 때 사용자가 직접 쓴 요청 */
  note?: string;
}

/* ------------------------------------------------------------------ */
/* 이미지 (STEP 4)                                                      */
/* ------------------------------------------------------------------ */

export type AiBlogImageType = "infographic" | "cardnews" | "thumbnail";

export type AiBlogImageStyle = "business" | "clean" | "warm" | "minimal" | "news";

export type AiBlogAspectRatio = "1:1" | "4:3" | "3:4" | "9:16";

/** 카드뉴스 카드 1장의 역할 */
export type AiBlogCardRole = "cover" | "intro" | "point" | "checklist" | "faq" | "outro";

export interface AiBlogCardPlan {
  index: number;
  role: AiBlogCardRole;
  title: string;
  lines: string[];
}

interface AiBlogPromptBase {
  style: AiBlogImageStyle;
  /** 스타일 한글 표기 (프롬프트 문자열에 그대로 들어간다) */
  styleLabel: string;
  ratio: AiBlogAspectRatio;
  /** 실제 이미지 생성 API에 보낼 최종 프롬프트 문자열 */
  text: string;
}

export interface InfographicPrompt extends AiBlogPromptBase {
  type: "infographic";
  topic: string;
  points: string[];
  checklist: string[];
  target: string;
  footnote: string;
}

export interface CardNewsPrompt extends AiBlogPromptBase {
  type: "cardnews";
  topic: string;
  cards: AiBlogCardPlan[];
}

export interface ThumbnailPrompt extends AiBlogPromptBase {
  type: "thumbnail";
  /** 썸네일에 줄바꿈해 넣을 제목 */
  titleLines: string[];
  subtitle: string;
  category: AiBlogCategory;
  categoryLabel: string;
}

export type AiBlogImagePrompt = InfographicPrompt | CardNewsPrompt | ThumbnailPrompt;

/**
 * 생성 결과 이미지 1장.
 *
 * 실제 이미지 생성 API가 연결되기 전에는 url이 비어 있고 status가 "MOCK"이다.
 * 화면은 url이 없으면 텍스트 기반 미리보기(데모)를 렌더링한다.
 */
export interface AiBlogImageAsset {
  id: string;
  type: AiBlogImageType;
  /** 카드뉴스 카드 순번 (그 외 타입은 0) */
  index: number;
  title: string;
  lines: string[];
  footnote?: string;
  ratio: AiBlogAspectRatio;
  style: AiBlogImageStyle;
  /** 실제 생성 이미지 주소 — Mock 단계에서는 undefined */
  url?: string;
  /** 이 이미지를 만들 때 사용한 프롬프트 문자열 */
  prompt: string;
  status: "MOCK" | "READY";
}

export interface AiBlogImageRequest {
  /** 최종 원고에서 추출한 정보 */
  outline: AiBlogOutline;
  /** 업종·타깃 등 맥락 */
  input: AiBlogInput;
  types: AiBlogImageType[];
  style: AiBlogImageStyle;
  /** 카드뉴스 장수 */
  cardCount: number;
  /** 블로그 대표 이미지 비율 */
  thumbnailRatio: AiBlogAspectRatio;
}

export interface AiBlogImageResult {
  prompts: AiBlogImagePrompt[];
  assets: AiBlogImageAsset[];
}

/* ------------------------------------------------------------------ */
/* 저장 구조                                                            */
/* ------------------------------------------------------------------ */

/**
 * 사용자의 콘텐츠 제작 작업물 1건.
 * 현재는 localStorage에 저장하지만, 그대로 DB 테이블로 옮길 수 있는 형태로 유지한다.
 */
export interface AiBlogProject extends AiBlogInput {
  id: string;
  /** 작성자 (비로그인 상태에서는 저장하지 않으므로 사실상 항상 존재) */
  userId?: string;
  generatedArticle?: AiBlogArticle;
  editedArticle?: AiBlogDraft;
  imageTypes: AiBlogImageType[];
  imageStyle: AiBlogImageStyle;
  thumbnailRatio: AiBlogAspectRatio;
  cardCount: number;
  imagePrompts: AiBlogImagePrompt[];
  images: AiBlogImageAsset[];
  createdAt: string;
  updatedAt: string;
}

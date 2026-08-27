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

/**
 * 원고 유형.
 *
 * monologue(1인칭 독백형)는 후기형과 다르다.
 *   review    : 실제 사용·경험 → 느낀 점 → 평가
 *   monologue : 고민 → 탐색 → 비교 → 의문 → 확인 → 판단 → 선택 이유
 * 제품을 이미 사용했다는 전제가 없어도 쓸 수 있다.
 *
 * ⚠ 값(id)은 저장 구조(AiBlogProject)에 그대로 들어가므로 기존 값은 바꾸지 않는다.
 */
export type AiBlogArticleType = "expert" | "review" | "monologue" | "compare" | "qna";

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
  /** 참고자료에서 정리한 요점 — 직접 입력한 자료가 있을 때만 채워진다 */
  referenceNotes?: string[];
  /**
   * 이 원고를 만든 원고 유형.
   * 마크다운으로 펼칠 때 유형에 따라 표기가 달라진다
   * (독백형은 소제목에 번호를 붙이지 않는다 — article.ts 참고).
   */
  articleType?: AiBlogArticleType;
  /** 생성 직후 자동 검증한 주제 관련성 */
  relevance?: RelevanceReport;
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
/* 주제 관련성 검증                                                     */
/* ------------------------------------------------------------------ */

export type RelevanceIssueCode =
  | "topic-missing"
  | "heading-drift"
  | "off-domain"
  | "keyword-missing"
  | "too-short";

export interface RelevanceIssue {
  code: RelevanceIssueCode;
  message: string;
}

/**
 * 생성된 원고가 입력한 주제를 실제로 다루고 있는지에 대한 판정.
 * 키워드 등장 횟수만이 아니라 제목·도입·소제목·마무리의 "위치"와
 * 업종 어휘 사용, 다른 분야 어휘 혼입까지 함께 본다.
 */
export interface RelevanceReport {
  /** 0~100 */
  score: number;
  ok: boolean;
  /** 원고에서 확인된 주제·키워드 표현 */
  matchedTerms: string[];
  /** 주제와 무관한 다른 분야 어휘 */
  offDomainTerms: string[];
  issues: RelevanceIssue[];
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

/**
 * 이미지 유형.
 * article = 본문 비주얼 — 블로그 본문 중간에 넣는 상황·분위기 이미지 (텍스트 최소)
 */
export type AiBlogImageType = "thumbnail" | "article" | "infographic" | "cardnews";

export type AiBlogImageStyle = "business" | "clean" | "warm" | "minimal" | "news";

/**
 * 출력 비율.
 * 27:40 은 세로 인포그래픽(1080×1600) 전용 값이다.
 */
export type AiBlogAspectRatio = "1:1" | "4:3" | "16:9" | "3:4" | "4:5" | "27:40" | "9:16";

/* ------------------------------------------------------------------ */
/* 이미지 콘텐츠 기획 (VisualPlan)                                      */
/* ------------------------------------------------------------------ */

/**
 * 이미지는 "원고 요약본"이 아니라 원고를 보완하는 별도의 시각 콘텐츠다.
 *
 * 그래서 원고 문장을 잘라 붙이지 않고, 먼저 AI가 원고를 분석해
 * "이미지로 만들면 좋은 관점"을 기획(VisualPlan)한 뒤 그 결과로 이미지를 만든다.
 *
 *   최종 원고 → VisualPlan(기획) → 이미지 프롬프트 → 이미지
 */

/** 어떤 형태로 시각화할지 */
export type VisualType =
  /** 확인 항목 나열 */
  | "checklist"
  /** 순서·단계 */
  | "steps"
  /** 둘 이상 비교 */
  | "comparison"
  /** 숫자 중심 */
  | "numbers"
  /** 이런 신호가 있는지 점검 */
  | "signals"
  /** 판단 기준 정리 */
  | "criteria";

export interface VisualPlanItem {
  /** 짧은 라벨 */
  title: string;
  /** 한 줄 설명 */
  description: string;
}

export interface VisualCard {
  page: number;
  headline: string;
  body: string;
  /** 이 장의 그림 방향 (이미지 생성 프롬프트에 들어간다) */
  visualDirection: string;
}

interface VisualPlanBase {
  /** 한 원고에서 만든 여러 기획안을 구분하는 ID */
  id: string;
  /** 기획 의도 한 줄 — 화면의 "AI 추천 이미지 주제"에 그대로 노출된다 */
  concept: string;
  /** 이 이미지가 독자에게 무엇을 해주는지 */
  goal: string;
  /** 원고와 겹치지 않기 위해 지킨 규칙 */
  avoidOverlap: string[];
}

export interface InfographicPlan extends VisualPlanBase {
  type: "infographic";
  headline: string;
  subheadline: string;
  visualType: VisualType;
  items: VisualPlanItem[];
  footer: string;
}

export interface CardNewsPlan extends VisualPlanBase {
  type: "cardnews";
  cards: VisualCard[];
}

export interface ThumbnailPlan extends VisualPlanBase {
  type: "thumbnail";
  /** 클릭을 부르는 짧은 문구 (정보 나열이 아니다) */
  headline: string;
  subheadline: string;
}

/**
 * 본문 비주얼 기획.
 *
 * 원고 문장을 이미지에 넣지 않는다. 그 문단의 상황·개념·분위기를 그림으로 보완한다.
 */
export interface ArticleVisualPlan extends VisualPlanBase {
  type: "article";
  /** 어느 소제목 아래에 넣으면 좋은지 */
  afterHeading: string;
  /** 이 이미지가 하는 일 */
  purpose: string;
  /** 무엇을 그릴지 */
  subject: string;
  /** 어떤 장면인지 */
  scene: string;
  /** 분위기 */
  mood: string;
  /** 그림 방향 */
  visualDirection: string;
  /** 이미지 위에 얹을 짧은 문구 — 보통 비워 둔다 */
  textOverlay?: string;
}

export type VisualPlan = InfographicPlan | CardNewsPlan | ThumbnailPlan | ArticleVisualPlan;

/** 이미지 유형별 추천 기획안 */
export type VisualPlanSet = Partial<Record<AiBlogImageType, VisualPlan[]>>;

export interface VisualPlanRequest {
  /** 사용자가 확정한 최종 원고 */
  draft: AiBlogDraft;
  input: AiBlogInput;
  types: AiBlogImageType[];
  /** 카드뉴스 장수 */
  cardCount: number;
  /** 본문 비주얼 장수 */
  articleCount: number;
  /** 이미 본 기획안의 concept — "다른 아이디어 추천"에서 제외한다 */
  exclude?: string[];
}

/** 원고 문장을 그대로 옮겼는지 검사한 결과 */
export interface VisualOverlapReport {
  ok: boolean;
  duplicates: string[];
}

export interface VisualPlanResult {
  plans: VisualPlanSet;
  overlap: VisualOverlapReport;
  /** 기획을 실제 AI가 했는지 Mock이 했는지 */
  source: AiBlogSource;
}

/* ------------------------------------------------------------------ */
/* 이미지 디자인 기획 (VisualDesignPlan)                                */
/* ------------------------------------------------------------------ */

/**
 * VisualPlan 이 "무엇을 보여줄지"를 정했다면,
 * VisualDesignPlan 은 "어떻게 보여줄지"를 정한다.
 *
 *   VisualPlan       = 콘텐츠 디렉터
 *   VisualDesignPlan = 아트 디렉터
 *
 * 텍스트를 카드에 나열하는 대신, 정보의 성격에 맞는 레이아웃과
 * 시각 요소(일러스트·아이콘·번호·연결선·비교 구조)를 함께 정한다.
 */

/** 정보 구조에 맞는 화면 레이아웃 */
export type VisualLayout =
  /** 중앙 비주얼 + 주변 포인트 */
  | "radial"
  /** 시간 흐름 */
  | "timeline"
  /** 좌우 대조 */
  | "comparison"
  /** 체크박스 목록 */
  | "checklist"
  /** 화살표로 이어지는 단계 */
  | "process"
  /** 균등 분할 카드 */
  | "grid"
  /** 관계를 선으로 잇는 도식 */
  | "diagram"
  /** 큰 번호 중심 */
  | "numbered"
  /** 큰 제목 + 대표 비주얼 (표지·썸네일) */
  | "hero"
  /** 핵심 정리 + 행동 유도 */
  | "summary"
  /** 위 요소를 섞은 구성 */
  | "mixed"
  /** 이미지가 주인공 — 텍스트를 거의 넣지 않는 본문 비주얼 */
  | "visual";

export type VisualElementType =
  | "illustration"
  | "medical_illustration"
  | "icon"
  | "number"
  | "arrow"
  | "connector"
  | "badge"
  | "chart"
  | "shape";

export type VisualPosition =
  | "center"
  | "center-top"
  | "center-bottom"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "left"
  | "right"
  | "background";

export interface VisualElement {
  type: VisualElementType;
  /** 무엇을 그릴지 (한국어 서술) */
  subject: string;
  position: VisualPosition;
  emphasis: "primary" | "secondary" | "accent";
}

/** 이미지 안의 정보 구획 하나 */
export interface VisualSection {
  /** 01, 02 / STEP 1 처럼 앞에 붙는 표시 */
  marker?: string;
  /** 2~10자 */
  title: string;
  /** 15~30자 */
  description?: string;
  /** 이 구획을 대표하는 아이콘 서술 */
  icon?: string;
}

export interface ArtDirection {
  mood: string;
  illustrationStyle: string;
  backgroundStyle: string;
  typographyDirection: string;
  /** 정보 밀도 — 이미지에 넣는 텍스트 양을 좌우한다 */
  density: "low" | "medium" | "high";
  /** 팔레트 표현 (프롬프트와 미리보기가 함께 쓴다) */
  palette: string;
}

/** 카드뉴스 한 장의 디자인 */
export interface VisualDesignPage {
  page: number;
  /** 장마다 레이아웃이 달라야 한다 */
  layout: VisualLayout;
  headline: string;
  keyMessage?: string;
  sections: VisualSection[];
  visualElements: VisualElement[];
}

export interface VisualDesignPlan {
  id: string;
  /** 어떤 콘텐츠 기획(VisualPlan)을 디자인한 것인지 */
  planId: string;
  type: AiBlogImageType;
  concept: string;
  designGoal: string;
  layout: VisualLayout;
  hierarchy: {
    headline: string;
    subheadline?: string;
    keyMessage?: string;
  };
  visualElements: VisualElement[];
  sections: VisualSection[];
  /** 카드뉴스 전용 — 장별 디자인 */
  pages?: VisualDesignPage[];
  artDirection: ArtDirection;
  style: AiBlogImageStyle;
  ratio: AiBlogAspectRatio;
  /** 업종 — 이미지 생성 프롬프트의 분야 표현에 쓴다 */
  category: AiBlogCategory;
  /** 하단 안내 문구 */
  footnote?: string;
  /** 본문 비주얼 — 추천 삽입 위치 */
  afterHeading?: string;
  /** 본문 비주얼 — 장면 설명 */
  scene?: string;
  /** 실제 이미지 생성 API에 넘길 상세 프롬프트 */
  imagePrompt: string;
  source: AiBlogSource;
}

/** 이미지 구성 — 유형별로 몇 장을 만들지 */
export interface AiBlogImageComposition {
  mode: "auto" | "manual";
  thumbnailCount: number;
  articleVisualCount: number;
  infographicCount: number;
  /** 카드뉴스 장수 */
  cardNewsCount: number;
}

export interface VisualDesignRequest {
  /** 사용자가 고른 콘텐츠 기획 (이미지 유형당 1개) */
  plans: VisualPlan[];
  input: AiBlogInput;
  style: AiBlogImageStyle;
  /** 유형별 비율 */
  ratios: Partial<Record<AiBlogImageType, AiBlogAspectRatio>>;
  /** "다른 디자인 추천" — 이미 본 레이아웃은 피한다 */
  excludeLayouts?: VisualLayout[];
  /** 이미지 하나만 수정 요청할 때 쓰는 문구 */
  instruction?: string;
}

export interface VisualDesignResult {
  designs: VisualDesignPlan[];
  source: AiBlogSource;
}

/* ------------------------------------------------------------------ */
/* 이미지 생성 (Provider)                                               */
/* ------------------------------------------------------------------ */

/**
 * 한글 텍스트 레이어.
 *
 * 이미지 생성 모델이 한글을 정확히 그리지 못할 수 있으므로,
 * "그래픽은 AI / 한글 텍스트는 웹 렌더러" 조합이 가능하도록
 * 텍스트를 이미지와 분리해 따로 들고 다닌다.
 */
export interface ImageTextLayer {
  layout: VisualLayout;
  headline: string;
  subheadline?: string;
  keyMessage?: string;
  sections: VisualSection[];
  footnote?: string;
  /** 카드뉴스 장 번호 (그 외 0) */
  page: number;
  totalPages?: number;
}

export interface GeneratedImage {
  id: string;
  type: AiBlogImageType;
  page: number;
  /** 출력 해상도 */
  width: number;
  height: number;
  mimeType: string;
  /** 실제 생성 이미지 주소 — Mock 단계에서는 undefined */
  url?: string;
  /** 다운로드 전용 주소 (Provider 가 따로 주는 경우) */
  downloadUrl?: string;
  /** 이 이미지를 만들 때 쓴 프롬프트 */
  prompt: string;
  status: "MOCK" | "READY" | "FAILED";
  /** 웹 렌더러가 그릴 한글 텍스트 */
  textLayer: ImageTextLayer;
  /** 생성 실패 사유 (status="FAILED") */
  error?: string;
  ratio: AiBlogAspectRatio;
  style: AiBlogImageStyle;
  visualElements: VisualElement[];
  artDirection: ArtDirection;
}

/**
 * 결과 이미지 1장 (화면·저장용).
 *
 * 실제 이미지 생성 API가 연결되기 전에는 url이 비어 있고 status가 "MOCK"이다.
 * 화면은 url이 없으면 레이아웃 기반 미리보기(데모)를 렌더링한다.
 */
export interface AiBlogImageAsset {
  id: string;
  type: AiBlogImageType;
  /** 카드뉴스 카드 순번 (그 외 타입은 0) */
  index: number;
  /** 어떤 디자인 기획으로 만든 이미지인지 */
  designId?: string;
  layout: VisualLayout;
  title: string;
  /** 제목 아래 보조 문구 */
  subtitle?: string;
  /** 이미지에서 가장 강조할 한 줄 */
  keyMessage?: string;
  /** 정보 구획 — 미리보기가 레이아웃에 맞게 배치한다 */
  sections: VisualSection[];
  visualElements: VisualElement[];
  footnote?: string;
  ratio: AiBlogAspectRatio;
  style: AiBlogImageStyle;
  palette?: string;
  totalPages?: number;
  /** 출력 해상도 (다운로드 크기) */
  width?: number;
  height?: number;
  mimeType?: string;
  /** 본문 비주얼 — 추천 삽입 위치 */
  afterHeading?: string;
  /** 본문 비주얼 — 장면 설명 (미리보기 문구) */
  scene?: string;
  /** 업종 — 일러스트 선택에 쓴다 */
  category?: AiBlogCategory;
  /** 생성 실패 사유 */
  error?: string;
  /** 실제 생성 이미지 주소 — Mock 단계에서는 undefined */
  url?: string;
  /** 이 이미지를 만들 때 사용한 프롬프트 문자열 */
  prompt: string;
  status: "MOCK" | "READY" | "FAILED";
}

export interface AiBlogImageRequest {
  /** 확정된 디자인 기획 — 이미지 내용은 전부 여기서 나온다 */
  designs: VisualDesignPlan[];
}

export interface AiBlogImageResult {
  images: GeneratedImage[];
  assets: AiBlogImageAsset[];
}

/* ------------------------------------------------------------------ */
/* 정보 이미지 (InfoVisual) — AI 블로그 기본 이미지 경로                */
/* ------------------------------------------------------------------ */

/**
 * 정보 이미지.
 *
 * 실사/일러스트 이미지를 생성하는 것이 목표가 아니다.
 * 최종 원고를 분석해 "이미지로 만들 가치가 있는 정보"만 뽑아 재구성하고,
 * SVG/Canvas 렌더러가 정확한 한글로 정보 카드·도표를 그린다.
 *
 *   최종 원고 → InfoVisualPlan(정보 추출·재구성) → SVG/Canvas → PNG
 *
 * 이 경로에는 이미지 생성 API가 없다. 사람 실루엣·배경 일러스트·장면(Scene)도 쓰지 않는다.
 * (기존 ArticleVisualPlan / VisualDesignPlan 경로는 legacy 로만 남는다)
 */

/** 정보 이미지 유형 — thumbnail 만 성격이 다른 대표 이미지다 */
export type InfoVisualType =
  /** 대표 이미지 — 큰 제목 + 짧은 서브카피 */
  | "thumbnail"
  /** 핵심 요약형 — 01·02 번호가 붙은 요약 블록 */
  | "summary"
  /** 체크리스트형 — 확인 항목 나열 */
  | "checklist"
  /** 단계·프로세스형 — 순서와 화살표 */
  | "process"
  /** 비교형 — 좌우 대조 */
  | "comparison"
  /** 표·기준형 — 2열 표 */
  | "table"
  /** 숫자 강조형 — 큰 숫자 + 항목 */
  | "number";

/** 디자인 스타일 — 정보 구조는 유지하고 색·여백·타이포·테두리만 달라진다 */
export type InfoVisualStyle = "report" | "clean" | "premium" | "friendly";

export interface InfoVisualItem {
  /** 짧은 라벨 (2~10자) */
  label: string;
  /** 한 줄 설명 (30자 이내) */
  detail?: string;
}

export interface InfoVisualTable {
  headers: [string, string];
  rows: Array<[string, string]>;
}

export interface InfoVisualComparisonSide {
  /** 열 제목 (예: 광고 문구 / 실제 확인할 것) */
  title: string;
  items: string[];
}

export interface InfoVisualComparison {
  left: InfoVisualComparisonSide;
  right: InfoVisualComparisonSide;
}

/** 숫자 강조형에서 가장 크게 보여줄 값 */
export interface InfoVisualHighlight {
  /** 보통 한두 글자 (예: "4") */
  value: string;
  /** 값 아래 짧은 설명 */
  caption: string;
}

/**
 * 이미지 한 장의 기획 결과.
 *
 * 원고 문장을 그대로 복사하지 않고 짧게 재작성한 내용만 들어간다.
 * 표현(색·비율)은 담지 않는다 — 같은 기획을 다른 스타일로 다시 그릴 수 있어야 한다.
 */
export interface InfoVisualPlan {
  id: string;
  type: InfoVisualType;
  /** 이미지 제목 (원고 소제목 복사 금지) */
  title: string;
  /** 제목 아래 한 줄 */
  subtitle?: string;
  /** 이 이미지가 독자에게 해주는 일 — 화면 설명에 그대로 노출된다 */
  purpose: string;
  /** 공통 항목 (summary·checklist·number 가 사용) */
  items: InfoVisualItem[];
  table?: InfoVisualTable;
  comparison?: InfoVisualComparison;
  process?: InfoVisualItem[];
  highlight?: InfoVisualHighlight;
  /** 어떤 소제목에서 뽑아낸 정보인지 (화면 표시·중복 점검용) */
  sourceSections: string[];
}

/** 기획 + 표현 — 렌더러가 그리는 최종 단위 */
export interface InfoVisualImage {
  id: string;
  plan: InfoVisualPlan;
  style: InfoVisualStyle;
  ratio: AiBlogAspectRatio;
  /** 실제 출력 해상도 */
  width: number;
  height: number;
  mimeType: string;
}

export interface InfoVisualPlanRequest {
  /** 사용자가 확정한 최종 원고 */
  draft: AiBlogDraft;
  input: AiBlogInput;
  /** 정보 이미지 장수 (대표 이미지 제외) */
  infoCount: number;
  /** 대표 이미지를 함께 만들지 */
  withThumbnail: boolean;
  /** 이미 본 이미지 제목 — 다시 추천에서 제외한다 */
  exclude?: string[];
}

export interface InfoVisualPlanResult {
  /** withThumbnail=true 이면 첫 번째가 대표 이미지 */
  plans: InfoVisualPlan[];
  /** 원고 문장을 그대로 옮겼는지 검사한 결과 */
  overlap: VisualOverlapReport;
  source: AiBlogSource;
}

export interface InfoVisualReviseRequest {
  draft: AiBlogDraft;
  input: AiBlogInput;
  /** 수정할 이미지의 현재 기획 */
  plan: InfoVisualPlan;
  /** 사용자 수정 요청. 비우면 "다른 각도로 다시 만들기" */
  instruction?: string;
  /** 다른 이미지 제목 — 같은 내용이 겹치지 않게 한다 */
  siblingTitles?: string[];
}

export interface InfoVisualReviseResult {
  plan: InfoVisualPlan;
  source: AiBlogSource;
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
  /** 이미지 제작에 사용한 콘텐츠 기획안 */
  visualPlans: VisualPlan[];
  /** 이미지 제작에 사용한 디자인 기획안 */
  visualDesigns: VisualDesignPlan[];
  /** 이미지 구성 설정 — 기존 저장본에는 없을 수 있다 */
  imageComposition?: AiBlogImageComposition;
  images: AiBlogImageAsset[];
  /* --- 정보 이미지 (현재 기본 경로) --- */
  /** 정보 이미지 기획 결과 — 첫 번째가 대표 이미지 */
  infoVisuals?: InfoVisualPlan[];
  infoVisualStyle?: InfoVisualStyle;
  /** 정보 이미지 비율 */
  infoRatio?: AiBlogAspectRatio;
  /** 대표 이미지 비율 */
  infoThumbnailRatio?: AiBlogAspectRatio;
  createdAt: string;
  updatedAt: string;
}

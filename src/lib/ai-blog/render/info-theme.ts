import type { InfoVisualStyle } from "@/lib/ai-blog/types";

/**
 * 정보 이미지 디자인 토큰.
 *
 * "한국 기업 블로그 / 전문 정보 콘텐츠" 느낌을 기본으로 한다.
 *   - 화이트 또는 아주 연한 배경
 *   - 네이비/블루 기반
 *   - 명확한 정보 위계, 큰 제목, 번호 강조
 *   - 표·구분선 활용, 장식 최소화, 넉넉한 여백
 *
 * 레이아웃은 정보 유형이 정하고, 이 파일은 색·여백·모서리·헤더 표현만 바꾼다.
 * 캔버스가 이해하는 색 문자열만 쓴다 (oklch·CSS 변수 사용 불가).
 */
export interface InfoTheme {
  id: InfoVisualStyle;
  /** 페이지 배경 */
  page: string;
  /** 카드·행 배경 */
  panel: string;
  /** 표 지브라 행 */
  panelAlt: string;
  /** 얇은 구분선 */
  border: string;
  /** 강한 구분선 (표 헤더 아래 등) */
  borderStrong: string;
  /** 헤더 밴드 채움 */
  headerFill: string;
  headerText: string;
  headerSub: string;
  /** 본문 글자 */
  title: string;
  body: string;
  muted: string;
  /** 번호·강조 */
  accent: string;
  accentSoft: string;
  onAccent: string;
  /** 비교형 오른쪽 열 등 보조 강조 */
  secondary: string;
  secondarySoft: string;
  /** 모서리 반경 (1080 기준 px, 0 이면 각진 디자인) */
  radius: number;
  /** 여백 (1080 기준 px) */
  pad: number;
  /** 헤더 표현 — band: 컬러 밴드 / rule: 밝은 배경 + 구분선 */
  header: "band" | "rule";
  /** 목록 표현 — divider: 구분선만 / card: 카드 배경 */
  list: "divider" | "card";
}

const THEMES: Record<InfoVisualStyle, InfoTheme> = {
  // 전문 리포트 — navy header / white body / thin divider / strong table
  report: {
    id: "report",
    page: "#ffffff",
    panel: "#f5f8fc",
    panelAlt: "#eef3f9",
    border: "#dde4ee",
    borderStrong: "#b9c6d8",
    headerFill: "#12294a",
    headerText: "#ffffff",
    headerSub: "#c3d1e4",
    title: "#12294a",
    body: "#465a75",
    muted: "#8c9cb3",
    accent: "#1d4f91",
    accentSoft: "#e8eff8",
    onAccent: "#ffffff",
    secondary: "#0f766e",
    secondarySoft: "#e3f2f0",
    radius: 6,
    pad: 76,
    header: "band",
    list: "divider",
  },
  // 깔끔한 정보형 — white background / blue accent / rounded cards
  clean: {
    id: "clean",
    page: "#ffffff",
    panel: "#f3f7fd",
    panelAlt: "#e9f0fa",
    border: "#dbe6f5",
    borderStrong: "#b9cdea",
    headerFill: "#ffffff",
    headerText: "#132a44",
    headerSub: "#5b7896",
    title: "#132a44",
    body: "#4a6280",
    muted: "#8ea2bb",
    accent: "#2563eb",
    accentSoft: "#e6efff",
    onAccent: "#ffffff",
    secondary: "#0ea5e9",
    secondarySoft: "#e2f4fd",
    radius: 26,
    pad: 72,
    header: "rule",
    list: "card",
  },
  // 프리미엄 — dark navy / cream / muted gold / 넓은 여백
  premium: {
    id: "premium",
    page: "#faf7f0",
    panel: "#f3ecdf",
    panelAlt: "#efe6d5",
    border: "#ddd0b6",
    borderStrong: "#c0ab86",
    headerFill: "#faf7f0",
    headerText: "#16233a",
    headerSub: "#6b6152",
    title: "#16233a",
    body: "#5a5646",
    muted: "#9c927f",
    accent: "#a8823f",
    accentSoft: "#f0e6d2",
    onAccent: "#ffffff",
    secondary: "#16233a",
    secondarySoft: "#e6e2d6",
    radius: 2,
    pad: 96,
    header: "rule",
    list: "divider",
  },
  // 친근한 정보형 — soft blue / mint / 둥근 요소
  friendly: {
    id: "friendly",
    page: "#f6fbfd",
    panel: "#ffffff",
    panelAlt: "#eaf6fa",
    border: "#cee7f0",
    borderStrong: "#a8d5e4",
    headerFill: "#2f92b8",
    headerText: "#ffffff",
    headerSub: "#dcf0f7",
    title: "#134559",
    body: "#3f6f83",
    muted: "#83aabb",
    accent: "#2f92b8",
    accentSoft: "#e2f2f8",
    onAccent: "#ffffff",
    secondary: "#2fae9b",
    secondarySoft: "#e0f5f1",
    radius: 30,
    pad: 72,
    header: "band",
    list: "card",
  },
};

export function infoThemeOf(style: InfoVisualStyle): InfoTheme {
  return THEMES[style] ?? THEMES.report;
}

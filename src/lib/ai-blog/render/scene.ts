import type { AiBlogImageStyle } from "@/lib/ai-blog/types";

/**
 * 렌더 장면(Scene).
 *
 * 화면 미리보기(SVG)와 다운로드 파일(Canvas → PNG)이 **같은 장면 데이터**를 그린다.
 * 좌표는 실제 출력 해상도(예: 1080×1080) 기준이라, 미리보기는 그대로 축소만 하면 된다.
 *
 * 장면은 세 겹으로 쌓인다.
 *   1) 배경  — 그라디언트·컬러 블록 (또는 AI가 만든 그래픽 이미지)
 *   2) 아트  — 일러스트·아이콘 (벡터 path)
 *   3) 텍스트 — 한글 (웹폰트로 정확히 렌더링)
 */

export type TextAlign = "left" | "center" | "right";

export interface SceneGradient {
  from: string;
  to: string;
  /** 기본 세로 */
  direction?: "vertical" | "horizontal" | "diagonal";
}

export interface SceneRect {
  kind: "rect";
  x: number;
  y: number;
  w: number;
  h: number;
  fill?: string;
  gradient?: SceneGradient;
  stroke?: string;
  strokeWidth?: number;
  radius?: number;
  dash?: number[];
  opacity?: number;
}

export interface SceneCircle {
  kind: "circle";
  cx: number;
  cy: number;
  r: number;
  fill?: string;
  gradient?: SceneGradient;
  stroke?: string;
  strokeWidth?: number;
  dash?: number[];
  opacity?: number;
}

export interface SceneLine {
  kind: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  strokeWidth: number;
  dash?: number[];
  opacity?: number;
}

/** 아래를 향하는 삼각형 (프로세스 화살표) */
export interface SceneArrow {
  kind: "arrow";
  x: number;
  y: number;
  size: number;
  fill: string;
  /** 기본 아래 방향 */
  direction?: "down" | "right";
}

/**
 * 벡터 path — 아이콘·일러스트를 그린다.
 * d 는 24×24 기준 좌표계로 쓰고, transform 으로 실제 위치·크기를 잡는다.
 */
export interface ScenePath {
  kind: "path";
  d: string;
  /** 원본 좌표계 크기 (기본 24) */
  viewport?: number;
  x: number;
  y: number;
  size: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
}

/** AI가 만든 그래픽 이미지 (real provider 연결 시 사용) */
export interface SceneImage {
  kind: "image";
  x: number;
  y: number;
  w: number;
  h: number;
  href: string;
  radius?: number;
  opacity?: number;
}

export interface SceneText {
  kind: "text";
  x: number;
  y: number;
  /** 이미 줄바꿈이 끝난 상태로 넣는다 (두 렌더러가 같은 줄을 그리도록) */
  lines: string[];
  size: number;
  weight: number;
  color: string;
  align: TextAlign;
  lineHeight: number;
  opacity?: number;
}

export type SceneNode =
  | SceneRect
  | SceneCircle
  | SceneLine
  | SceneArrow
  | ScenePath
  | SceneImage
  | SceneText;

export interface RenderScene {
  width: number;
  height: number;
  background: string;
  backgroundGradient?: SceneGradient;
  nodes: SceneNode[];
}

/** 캔버스와 SVG가 같은 글꼴을 쓰도록 한 곳에서 정의한다 */
export const RENDER_FONT_FAMILY =
  '"Pretendard Variable", Pretendard, -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';

/* ------------------------------------------------------------------ */
/* 팔레트                                                               */
/* ------------------------------------------------------------------ */

export interface IllustrationColors {
  /** 일러스트 본체 */
  base: string;
  /** 그림자·깊이 */
  shade: string;
  /** 강조 포인트 */
  highlight: string;
  /** 인물 피부 톤 */
  skin: string;
  /** 배경 소품 */
  prop: string;
}

export interface ScenePalette {
  /** 배경 그라디언트 시작·끝 */
  background: string;
  backgroundAlt: string;
  /** 카드·패널 */
  surface: string;
  surfaceStrong: string;
  /** 글자 */
  title: string;
  body: string;
  muted: string;
  onDark: string;
  /** 메인 2색 + 보조 */
  primary: string;
  secondary: string;
  accent: string;
  onPrimary: string;
  line: string;
  illustration: IllustrationColors;
}

/**
 * 스타일별 색 — 한 이미지에 메인 2색 + 보조 1~2색만 쓴다.
 * 반드시 캔버스가 이해하는 색 문자열이어야 한다(oklch·CSS 변수 사용 불가).
 */
export const SCENE_PALETTE: Record<AiBlogImageStyle, ScenePalette> = {
  // 전문 정보형 — navy / blue / light gray / white
  business: {
    background: "#ffffff",
    backgroundAlt: "#eef2f8",
    surface: "#f3f6fb",
    surfaceStrong: "#e2e9f4",
    title: "#0f2444",
    body: "#41567a",
    muted: "#8798b5",
    onDark: "#ffffff",
    primary: "#1e3a5f",
    secondary: "#2563eb",
    accent: "#38bdf8",
    onPrimary: "#ffffff",
    line: "#c9d6e8",
    illustration: {
      base: "#2563eb",
      shade: "#1e3a5f",
      highlight: "#38bdf8",
      skin: "#f3c9a8",
      prop: "#c9d6e8",
    },
  },
  // 건강 콘텐츠 — deep navy / teal / soft blue / warm neutral
  clean: {
    background: "#ffffff",
    backgroundAlt: "#e8f5f3",
    surface: "#effaf8",
    surfaceStrong: "#d3ede8",
    title: "#0f2d4a",
    body: "#3d5f70",
    muted: "#8aa6b0",
    onDark: "#ffffff",
    primary: "#0f2d4a",
    secondary: "#0d9488",
    accent: "#60a5fa",
    onPrimary: "#ffffff",
    line: "#bfe0da",
    illustration: {
      base: "#0d9488",
      shade: "#0f2d4a",
      highlight: "#5eead4",
      skin: "#f5cfae",
      prop: "#dbeafe",
    },
  },
  // 친근한 정보형 — soft blue / mint / warm beige
  warm: {
    background: "#fffdf7",
    backgroundAlt: "#fdf0dc",
    surface: "#fef6e7",
    surfaceStrong: "#fbe6c4",
    title: "#3f2d17",
    body: "#7a6244",
    muted: "#b09a76",
    onDark: "#ffffff",
    primary: "#60a5fa",
    secondary: "#34d399",
    accent: "#f59e0b",
    onPrimary: "#ffffff",
    line: "#f0d9b0",
    illustration: {
      base: "#60a5fa",
      shade: "#2f6fbf",
      highlight: "#34d399",
      skin: "#f6cda9",
      prop: "#fbe6c4",
    },
  },
  // 프리미엄 — dark navy / cream / muted gold
  minimal: {
    background: "#fbf8f2",
    backgroundAlt: "#f2ece0",
    surface: "#f6f1e7",
    surfaceStrong: "#e9dfcb",
    title: "#111827",
    body: "#4b5563",
    muted: "#9ca3af",
    onDark: "#faf7f0",
    primary: "#111827",
    secondary: "#b08d57",
    accent: "#6b7280",
    onPrimary: "#faf7f0",
    line: "#ddd2ba",
    illustration: {
      base: "#b08d57",
      shade: "#111827",
      highlight: "#d9bb85",
      skin: "#eccfb0",
      prop: "#e9dfcb",
    },
  },
  // 뉴스·SNS — white / deep red / black
  news: {
    background: "#ffffff",
    backgroundAlt: "#f5f5f5",
    surface: "#f7f7f7",
    surfaceStrong: "#ffe4e6",
    title: "#111111",
    body: "#3f3f46",
    muted: "#8b8b90",
    onDark: "#ffffff",
    primary: "#111111",
    secondary: "#be123c",
    accent: "#f43f5e",
    onPrimary: "#ffffff",
    line: "#d4d4d8",
    illustration: {
      base: "#be123c",
      shade: "#111111",
      highlight: "#f43f5e",
      skin: "#f0c5a6",
      prop: "#e4e4e7",
    },
  },
};

export function paletteFor(style: AiBlogImageStyle): ScenePalette {
  return SCENE_PALETTE[style] ?? SCENE_PALETTE.business;
}

/**
 * [LEGACY] 실사·일러스트 비주얼 파이프라인.
 *
 * AI 블로그 **기본** 이미지 제작 경로는 정보 이미지로 대체됐다.
 *   최종 원고 → InfoVisualPlan (lib/ai-blog/info-visual.ts)
 *             → SVG/Canvas (render/info-layout.ts) → PNG
 *
 * 이 모듈은 기본 경로에서 호출하지 않는다.
 * 향후 별도 "비주얼 이미지" 기능을 다시 붙일 때를 위해 삭제하지 않고 유지한다.
 */

import type { IllustrationColors, ScenePalette, SceneNode, ScenePath } from "@/lib/ai-blog/render/scene";
import type { AiBlogCategory } from "@/lib/ai-blog/types";

/**
 * 벡터 아트 — 아이콘과 일러스트.
 *
 * 이미지 생성 API가 없어도 결과물이 "회색 placeholder"가 되지 않도록,
 * 실제로 그려지는 도형을 코드로 들고 있는다.
 * SVG(미리보기)와 Canvas(다운로드) 모두 같은 path 를 그리므로 export 에서도 깨지지 않는다.
 *
 * 좌표계는 아이콘 24×24, 일러스트 100×100 을 쓰고 배치할 때 크기를 맞춘다.
 */

/* ------------------------------------------------------------------ */
/* 아이콘 (24×24, 선 기반)                                              */
/* ------------------------------------------------------------------ */

export type IconName =
  | "check"
  | "shield"
  | "capsule"
  | "calendar"
  | "walk"
  | "scale"
  | "alert"
  | "compare"
  | "document"
  | "clock"
  | "leaf"
  | "search"
  | "pulse"
  | "target";

export const ICON_PATHS: Record<IconName, string> = {
  check: "M20 6L9 17l-5-5",
  shield: "M12 3l7 3v6c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3z M9 12l2 2 4-4",
  capsule: "M6 14a5 5 0 015-5h2a5 5 0 010 10h-2a5 5 0 01-5-5z M11.5 9v10",
  calendar: "M4 6h16v14H4z M4 10.5h16 M8 3v4 M16 3v4",
  walk: "M13.5 4.2a1.6 1.6 0 100-3.2 1.6 1.6 0 000 3.2z M10.5 22l2.2-6.4-3-2.2 1-4.8 3.1 2.1 2.2 1.9 M9.8 13.4L6.6 16.6 M14.8 15.6L16 22",
  scale: "M12 4v16 M5 8h14 M5 8l-3 6.2a3.2 3.2 0 006.2 0z M19 8l-3 6.2a3.2 3.2 0 006.2 0z M8 20h8",
  alert: "M12 3.2l9 16.6H3z M12 9.4v4.8 M12 17.2h.02",
  compare: "M4 5h6.4v14H4z M13.6 5H20v14h-6.4z M7.2 9v6 M16.8 9v6",
  document: "M6.5 3h7.2L18 7.4V21H6.5z M13.5 3v4.6H18 M9.6 12.4h5.4 M9.6 16.2h5.4",
  clock: "M12 21a9 9 0 100-18 9 9 0 000 18z M12 7.2V12l3.2 2",
  leaf: "M20.2 3.8C10.6 3.8 4 10 4 20.2c10.2 0 16.2-6.4 16.2-16.4z M4.6 19.6L13.8 10.4",
  search: "M11 19a8 8 0 100-16 8 8 0 000 16z M21 21l-4.4-4.4",
  pulse: "M3 12.4h4.2l2.4-5.2 3.4 10.4 2.4-5.2H21",
  target: "M12 21a9 9 0 100-18 9 9 0 000 18z M12 16.4a4.4 4.4 0 100-8.8 4.4 4.4 0 000 8.8z M12 13.2a1.2 1.2 0 100-2.4 1.2 1.2 0 000 2.4z",
};

/** 라벨 문구에서 어울리는 아이콘을 고른다 */
export function pickIcon(label: string, fallback: IconName = "check"): IconName {
  const rules: Array<[RegExp, IconName]> = [
    [/기능성|인정|인증|허가/, "shield"],
    [/성분|원료|함량|영양/, "capsule"],
    [/섭취|복용|1일|하루|기간|일정/, "calendar"],
    [/운동|생활|활동|산책|걷기/, "walk"],
    [/체중|무게|비용|가격|금액/, "scale"],
    [/주의|경고|위험|피해|금지/, "alert"],
    [/비교|차이|대비|선택지/, "compare"],
    [/서류|표시|라벨|문서|계약|약관|자료/, "document"],
    [/시점|시기|언제|기한|기간/, "clock"],
    [/건강|관리|자연|유지/, "leaf"],
    [/확인|점검|검토|살펴/, "search"],
    [/신호|증상|변화|상태/, "pulse"],
    [/기준|목표|핵심|포인트/, "target"],
  ];
  for (const [pattern, name] of rules) if (pattern.test(label)) return name;
  return fallback;
}

/** 아이콘 하나를 장면 노드로 */
export function icon(
  name: IconName,
  x: number,
  y: number,
  size: number,
  color: string,
  strokeWidth = 1.9,
): ScenePath {
  return {
    kind: "path",
    d: ICON_PATHS[name] ?? ICON_PATHS.check,
    viewport: 24,
    x,
    y,
    size,
    stroke: color,
    strokeWidth,
  };
}

/* ------------------------------------------------------------------ */
/* 일러스트 (100×100)                                                   */
/* ------------------------------------------------------------------ */

interface Shape {
  d: string;
  /** base | shade | highlight | skin | prop | line */
  tone: keyof IllustrationColors | "none";
  stroke?: boolean;
  strokeWidth?: number;
}

export type IllustrationName =
  | "knee"
  | "supplement"
  | "document"
  | "house"
  | "justice"
  | "cosmetic"
  | "foodpack"
  | "study"
  | "finance"
  | "car"
  | "generic";

const ILLUSTRATIONS: Record<IllustrationName, Shape[]> = {
  // 무릎 관절 — 건강 콘텐츠 대표 비주얼
  knee: [
    { d: "M36 6h18a5 5 0 015 5v25a5 5 0 01-5 5H36a5 5 0 01-5-5V11a5 5 0 015-5z", tone: "base" },
    { d: "M36 62h18a5 5 0 015 5v27a5 5 0 01-5 5H36a5 5 0 01-5-5V67a5 5 0 015-5z", tone: "base" },
    { d: "M45 32a17 17 0 110 34 17 17 0 010-34z", tone: "highlight" },
    { d: "M45 40a9 9 0 110 18 9 9 0 010-18z", tone: "shade" },
    { d: "M14 49h12l5-8 6 16 5-8h10", tone: "shade", stroke: true, strokeWidth: 3 },
    { d: "M72 30a22 22 0 010 38", tone: "prop", stroke: true, strokeWidth: 4 },
  ],
  // 건강기능식품 병 + 캡슐
  supplement: [
    { d: "M26 34h48a7 7 0 017 7v48a7 7 0 01-7 7H26a7 7 0 01-7-7V41a7 7 0 017-7z", tone: "base" },
    { d: "M38 16h24a5 5 0 015 5v13H33V21a5 5 0 015-5z", tone: "shade" },
    { d: "M27 52h46v26H27z", tone: "prop" },
    { d: "M42 65h16 M50 57v16", tone: "shade", stroke: true, strokeWidth: 3.5 },
    { d: "M78 14a8 8 0 0111 11l-9 9a8 8 0 01-11-11z", tone: "highlight" },
  ],
  // 성분표·서류
  document: [
    { d: "M20 8h40l18 18v66H20z", tone: "prop" },
    { d: "M60 8v18h18z", tone: "shade" },
    { d: "M31 44h36 M31 56h36 M31 68h22", tone: "base", stroke: true, strokeWidth: 3.5 },
    { d: "M66 88a12 12 0 110-24 12 12 0 010 24z", tone: "highlight" },
    { d: "M60 76l4 4 8-8", tone: "shade", stroke: true, strokeWidth: 3.5 },
  ],
  // 부동산
  house: [
    { d: "M10 46L50 14l40 32", tone: "shade", stroke: true, strokeWidth: 5 },
    { d: "M20 46h60v46H20z", tone: "base" },
    { d: "M40 62h20v30H40z", tone: "prop" },
    { d: "M28 56h12v12H28z", tone: "highlight" },
    { d: "M60 56h12v12H60z", tone: "highlight" },
  ],
  // 법률
  justice: [
    { d: "M50 12v78 M26 24h48", tone: "shade", stroke: true, strokeWidth: 5 },
    { d: "M30 90h40", tone: "shade", stroke: true, strokeWidth: 5 },
    { d: "M26 24L14 52a12 12 0 0024 0z", tone: "base" },
    { d: "M74 24L62 52a12 12 0 0024 0z", tone: "base" },
    { d: "M50 8a5 5 0 110 10 5 5 0 010-10z", tone: "highlight" },
  ],
  // 뷰티
  cosmetic: [
    { d: "M34 36h32a8 8 0 018 8v42a8 8 0 01-8 8H34a8 8 0 01-8-8V44a8 8 0 018-8z", tone: "base" },
    { d: "M42 18h16v18H42z", tone: "shade" },
    { d: "M38 20h24", tone: "highlight", stroke: true, strokeWidth: 5 },
    { d: "M34 56h32v22H34z", tone: "prop" },
    { d: "M42 66h16", tone: "shade", stroke: true, strokeWidth: 3 },
  ],
  // 식품 포장
  foodpack: [
    { d: "M24 22h52l-6 70H30z", tone: "base" },
    { d: "M32 12h36l4 10H28z", tone: "shade" },
    { d: "M32 46h36v28H32z", tone: "prop" },
    { d: "M38 56h24 M38 64h16", tone: "shade", stroke: true, strokeWidth: 3 },
    { d: "M70 30a9 9 0 110 18 9 9 0 010-18z", tone: "highlight" },
  ],
  // 교육
  study: [
    { d: "M12 26c14-8 26-8 38 0v58c-12-8-24-8-38 0z", tone: "base" },
    { d: "M88 26c-14-8-26-8-38 0v58c12-8 24-8 38 0z", tone: "shade" },
    { d: "M22 40h18 M22 52h18 M60 40h18 M60 52h18", tone: "prop", stroke: true, strokeWidth: 3 },
    { d: "M50 18a7 7 0 110 14 7 7 0 010-14z", tone: "highlight" },
  ],
  // 금융
  finance: [
    { d: "M18 14h44l16 16v60H18z", tone: "prop" },
    { d: "M62 14v16h16z", tone: "shade" },
    { d: "M28 46h30 M28 58h30", tone: "base", stroke: true, strokeWidth: 3.5 },
    { d: "M66 84a16 16 0 110-32 16 16 0 010 32z", tone: "highlight" },
    { d: "M66 60v16 M60 66h12", tone: "shade", stroke: true, strokeWidth: 3.5 },
  ],
  // 자동차
  car: [
    { d: "M14 60l10-22h52l10 22v18H14z", tone: "base" },
    { d: "M28 42h44l6 16H22z", tone: "prop" },
    { d: "M30 78a9 9 0 110 18 9 9 0 010-18z", tone: "shade" },
    { d: "M70 78a9 9 0 110 18 9 9 0 010-18z", tone: "shade" },
    { d: "M18 66h10 M72 66h10", tone: "highlight", stroke: true, strokeWidth: 4 },
  ],
  // 기타 — 추상 도형
  generic: [
    { d: "M50 10a40 40 0 110 80 40 40 0 010-80z", tone: "prop" },
    { d: "M50 24a26 26 0 110 52 26 26 0 010-52z", tone: "base" },
    { d: "M38 50l8 9 17-19", tone: "onDark" as never, stroke: true, strokeWidth: 5 },
  ],
};

const CATEGORY_ILLUSTRATION: Record<AiBlogCategory, IllustrationName> = {
  health: "knee",
  realestate: "house",
  legal: "justice",
  beauty: "cosmetic",
  food: "foodpack",
  education: "study",
  finance: "finance",
  auto: "car",
  etc: "generic",
};

export function illustrationFor(category: AiBlogCategory): IllustrationName {
  return CATEGORY_ILLUSTRATION[category] ?? "generic";
}

/** 업종별 보조 일러스트 (같은 이미지에서 대표와 겹치지 않게) */
export function secondaryIllustrationFor(category: AiBlogCategory): IllustrationName {
  if (category === "health") return "supplement";
  if (category === "food" || category === "beauty") return "document";
  if (category === "legal" || category === "realestate") return "document";
  return "generic";
}

function toneColor(tone: Shape["tone"], colors: IllustrationColors, palette: ScenePalette): string {
  if (tone === "none") return "transparent";
  if (tone === ("onDark" as never)) return palette.onPrimary;
  return colors[tone as keyof IllustrationColors] ?? colors.base;
}

/** 일러스트를 장면 노드로 (x,y = 왼쪽 위, size = 한 변) */
export function illustration(
  name: IllustrationName,
  x: number,
  y: number,
  size: number,
  palette: ScenePalette,
): SceneNode[] {
  const shapes = ILLUSTRATIONS[name] ?? ILLUSTRATIONS.generic;
  const colors = palette.illustration;

  return shapes.map((shape) => ({
    kind: "path" as const,
    d: shape.d,
    viewport: 100,
    x,
    y,
    size,
    ...(shape.stroke
      ? { stroke: toneColor(shape.tone, colors, palette), strokeWidth: shape.strokeWidth ?? 3 }
      : { fill: toneColor(shape.tone, colors, palette) }),
  }));
}

/* ------------------------------------------------------------------ */
/* 본문 비주얼 — 인물이 있는 장면                                       */
/* ------------------------------------------------------------------ */

export type ArticleSceneKind = "walk" | "stairs" | "check-label" | "care";

/** 장면 설명에서 어떤 그림을 그릴지 고른다 */
export function pickArticleScene(text: string, index: number): ArticleSceneKind {
  if (/계단|오르|내려/.test(text)) return "stairs";
  if (/표시|라벨|성분|확인|자료|서류/.test(text)) return "check-label";
  if (/관리|케어|돌봄|예방|습관|스트레칭/.test(text)) return "care";
  if (/산책|걷|운동|일상|활동/.test(text)) return "walk";
  const order: ArticleSceneKind[] = ["walk", "check-label", "care", "stairs"];
  return order[index % order.length];
}

/** 사람 실루엣 (100×100 기준, 서 있는 자세) */
function person(x: number, y: number, size: number, palette: ScenePalette, walking: boolean): SceneNode[] {
  const c = palette.illustration;
  const head = walking
    ? "M50 8a9 9 0 110 18 9 9 0 010-18z"
    : "M50 6a10 10 0 110 20 10 10 0 010-20z";
  const body = walking
    ? "M50 28c9 0 14 6 14 14l-2 18h-24l-2-18c0-8 5-14 14-14z"
    : "M50 28c10 0 15 7 15 16l-2 20H37l-2-20c0-9 5-16 15-16z";
  const legs = walking
    ? "M40 60l-6 32 M60 60l8 32"
    : "M43 60v34 M57 60v34";
  const arms = walking ? "M36 40l-8 18 M64 40l9 14" : "M34 40l-4 20 M66 40l4 20";

  return [
    { kind: "path", d: head, viewport: 100, x, y, size, fill: c.skin },
    { kind: "path", d: body, viewport: 100, x, y, size, fill: c.base },
    { kind: "path", d: legs, viewport: 100, x, y, size, stroke: c.shade, strokeWidth: 7 },
    { kind: "path", d: arms, viewport: 100, x, y, size, stroke: c.shade, strokeWidth: 6 },
  ];
}

/**
 * 본문 비주얼 한 장을 통째로 그린다.
 * 배경 그라디언트 → 배경 도형 → 지면 → 인물·소품 순으로 쌓는다.
 */
export function articleScene(
  kind: ArticleSceneKind,
  region: { x: number; y: number; w: number; h: number },
  palette: ScenePalette,
  category: AiBlogCategory,
): SceneNode[] {
  const { x, y, w, h } = region;
  const c = palette.illustration;
  const nodes: SceneNode[] = [];

  // 배경 — 하늘 그라디언트
  nodes.push({
    kind: "rect",
    x,
    y,
    w,
    h,
    radius: Math.min(w, h) * 0.04,
    gradient: { from: palette.surface, to: palette.surfaceStrong, direction: "vertical" },
  });

  // 배경 원 (부드러운 깊이감)
  nodes.push(
    { kind: "circle", cx: x + w * 0.78, cy: y + h * 0.24, r: h * 0.16, fill: palette.accent, opacity: 0.22 },
    { kind: "circle", cx: x + w * 0.2, cy: y + h * 0.18, r: h * 0.09, fill: palette.secondary, opacity: 0.16 },
    { kind: "circle", cx: x + w * 0.86, cy: y + h * 0.14, r: h * 0.07, fill: palette.primary, opacity: 0.14 },
    { kind: "circle", cx: x + w * 0.62, cy: y + h * 0.1, r: h * 0.045, fill: palette.accent, opacity: 0.3 },
    { kind: "circle", cx: x + w * 0.36, cy: y + h * 0.3, r: h * 0.03, fill: palette.secondary, opacity: 0.24 },
  );

  // 지면
  const groundY = y + h * 0.74;

  // 먼 언덕 — 지면 위 깊이감
  nodes.push(
    {
      kind: "path",
      d: "M0 100 Q22 58 46 74 Q68 88 84 62 Q94 46 100 56 L100 100 Z",
      viewport: 100,
      x,
      y: groundY - h * 0.26,
      size: w,
      fill: palette.secondary,
      opacity: 0.18,
    },
    {
      kind: "path",
      d: "M0 100 Q30 74 54 86 Q78 98 100 78 L100 100 Z",
      viewport: 100,
      x,
      y: groundY - h * 0.16,
      size: w,
      fill: palette.primary,
      opacity: 0.16,
    },
  );
  nodes.push({
    kind: "rect",
    x,
    y: groundY,
    w,
    h: h - (groundY - y),
    fill: palette.secondary,
    opacity: 0.16,
  });
  nodes.push({
    kind: "line",
    x1: x,
    y1: groundY,
    x2: x + w,
    y2: groundY,
    stroke: palette.secondary,
    strokeWidth: Math.max(2, h * 0.006),
    opacity: 0.5,
  });

  const figureSize = h * 0.56;
  const figureX = x + w * 0.5 - figureSize / 2;
  const figureY = groundY - figureSize * 0.92;

  if (kind === "stairs") {
    // 계단
    const steps = 4;
    const stepW = w * 0.12;
    const stepH = h * 0.07;
    for (let i = 0; i < steps; i += 1) {
      nodes.push({
        kind: "rect",
        x: x + w * 0.52 + i * stepW * 0.7,
        y: groundY - stepH * (i + 1),
        w: stepW,
        h: stepH * (i + 1),
        fill: c.prop,
        radius: 4,
      });
    }
    // 난간
    nodes.push({
      kind: "line",
      x1: x + w * 0.52,
      y1: groundY - h * 0.1,
      x2: x + w * 0.52 + steps * stepW * 0.7,
      y2: groundY - h * 0.1 - stepH * steps,
      stroke: c.shade,
      strokeWidth: Math.max(3, h * 0.012),
    });
    nodes.push(...person(x + w * 0.24, groundY - figureSize * 0.95, figureSize, palette, true));
    // 업종 소품 (좌상단) — 무엇에 대한 장면인지 알려준다
    nodes.push(
      ...illustration(illustrationFor(category), x + w * 0.06, y + h * 0.08, h * 0.22, palette),
    );
  } else if (kind === "check-label") {
    // 인물 + 확인하는 문서/라벨
    nodes.push(...person(x + w * 0.22, groundY - figureSize * 0.95, figureSize, palette, false));
    nodes.push(
      ...illustration(
        category === "health" ? "supplement" : "document",
        x + w * 0.56,
        groundY - figureSize * 0.85,
        figureSize * 0.8,
        palette,
      ),
    );
    nodes.push(icon("search", x + w * 0.46, y + h * 0.22, h * 0.12, palette.secondary, 2.2));
  } else if (kind === "care") {
    // 관리 — 대표 일러스트를 크게, 인물은 작게
    nodes.push(
      ...illustration(illustrationFor(category), x + w * 0.34, y + h * 0.16, h * 0.56, palette),
    );
    nodes.push(...person(x + w * 0.08, groundY - figureSize * 0.8, figureSize * 0.8, palette, false));
    nodes.push(icon("leaf", x + w * 0.76, y + h * 0.62, h * 0.12, palette.secondary, 2.2));
  } else {
    // 산책 — 인물 + 나무
    nodes.push(...person(figureX, figureY, figureSize, palette, true));
    nodes.push(
      ...illustration(illustrationFor(category), x + w * 0.06, y + h * 0.1, h * 0.22, palette),
    );
    for (const [tx, scale] of [
      [0.12, 0.7],
      [0.82, 0.9],
    ] as Array<[number, number]>) {
      const treeH = h * 0.3 * scale;
      nodes.push(
        {
          kind: "rect",
          x: x + w * tx,
          y: groundY - treeH * 0.35,
          w: Math.max(6, w * 0.014),
          h: treeH * 0.35,
          fill: c.shade,
        },
        {
          kind: "circle",
          cx: x + w * tx + Math.max(6, w * 0.014) / 2,
          cy: groundY - treeH * 0.55,
          r: treeH * 0.34,
          fill: palette.secondary,
          opacity: 0.75,
        },
      );
    }
  }

  return nodes;
}

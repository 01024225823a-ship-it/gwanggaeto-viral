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

import {
  articleScene,
  icon,
  illustration,
  illustrationFor,
  pickArticleScene,
  pickIcon,
  secondaryIllustrationFor,
} from "@/lib/ai-blog/render/artwork";
import { measureText, wrapText } from "@/lib/ai-blog/render/measure";
import type { RenderScene, ScenePalette, SceneNode, TextAlign } from "@/lib/ai-blog/render/scene";
import { paletteFor } from "@/lib/ai-blog/render/scene";
import type { AiBlogCategory, AiBlogImageAsset, VisualSection } from "@/lib/ai-blog/types";
import { imageTypeLabel } from "@/lib/ai-blog/options";
import { sizeOf } from "@/lib/ai-blog/visual-design";

/**
 * 자산(AiBlogImageAsset) → 렌더 장면.
 *
 * 레이아웃마다 배경 처리·아트·정보 구조가 모두 달라지도록 그린다.
 * AI 그래픽(asset.url)이 있으면 배경으로 깔고 그 위에 한글 텍스트를 얹는다.
 * 없으면 코드로 그린 벡터 일러스트를 쓴다 — 회색 placeholder 는 쓰지 않는다.
 */

interface Ctx {
  w: number;
  h: number;
  pad: number;
  u: number;
  p: ScenePalette;
  category: AiBlogCategory;
  nodes: SceneNode[];
}

/* ------------------------------------------------------------------ */
/* 기본 도형                                                            */
/* ------------------------------------------------------------------ */

type RectOptions = {
  fill?: string;
  gradient?: { from: string; to: string; direction?: "vertical" | "horizontal" | "diagonal" };
  stroke?: string;
  strokeWidth?: number;
  radius?: number;
  opacity?: number;
};

function rect(c: Ctx, x: number, y: number, w: number, h: number, options: RectOptions = {}) {
  c.nodes.push({ kind: "rect", x, y, w, h, ...options });
}

function circle(
  c: Ctx,
  cx: number,
  cy: number,
  r: number,
  options: { fill?: string; stroke?: string; strokeWidth?: number; opacity?: number } = {},
) {
  c.nodes.push({ kind: "circle", cx, cy, r, ...options });
}

function line(
  c: Ctx,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  stroke: string,
  width: number,
  opacity?: number,
) {
  c.nodes.push({ kind: "line", x1, y1, x2, y2, stroke, strokeWidth: width, opacity });
}

interface TextOptions {
  size: number;
  weight?: number;
  color?: string;
  align?: TextAlign;
  maxLines?: number;
  lineHeightRatio?: number;
}

function text(
  c: Ctx,
  value: string,
  x: number,
  y: number,
  width: number,
  options: TextOptions,
): number {
  const size = options.size;
  const weight = options.weight ?? 400;
  const lineHeight = size * (options.lineHeightRatio ?? 1.35);
  const lines = wrapText(value, width, size, weight, options.maxLines ?? 2);
  if (lines.length === 0) return 0;

  const align = options.align ?? "left";
  const anchorX = align === "center" ? x + width / 2 : align === "right" ? x + width : x;

  c.nodes.push({
    kind: "text",
    x: anchorX,
    y: y + size * 0.82,
    lines,
    size,
    weight,
    color: options.color ?? c.p.title,
    align,
    lineHeight,
  });

  return lines.length * lineHeight;
}

/** 항목 아이콘이 들어가는 원형 배지 */
function iconBadge(c: Ctx, cx: number, cy: number, r: number, label: string, tone: "solid" | "soft") {
  circle(c, cx, cy, r, {
    fill: tone === "solid" ? c.p.primary : c.p.surfaceStrong,
  });
  c.nodes.push(
    icon(
      pickIcon(label),
      cx - r * 0.58,
      cy - r * 0.58,
      r * 1.16,
      tone === "solid" ? c.p.onPrimary : c.p.primary,
      2.1,
    ),
  );
}

/* ------------------------------------------------------------------ */
/* 배경                                                                 */
/* ------------------------------------------------------------------ */

/** 상단 컬러 헤더 — 정보형 레이아웃 공통 */
function headerBand(c: Ctx, height: number) {
  rect(c, 0, 0, c.w, height, {
    gradient: { from: c.p.primary, to: c.p.secondary, direction: "diagonal" },
  });
  // 헤더 위 장식 원
  circle(c, c.w * 0.88, height * 0.22, height * 0.34, { fill: c.p.onPrimary, opacity: 0.1 });
  circle(c, c.w * 0.72, height * 0.78, height * 0.2, { fill: c.p.onPrimary, opacity: 0.08 });
}

/** 헤더 오른쪽 대표 일러스트 — 업종을 한눈에 알리는 히어로 아트 */
function headerArt(c: Ctx, headerH: number, size: number) {
  const x = c.w - c.pad * 0.6 - size;
  const y = headerH - size * 0.76;
  // 일러스트가 앉을 밝은 원반 (헤더 그라데이션 위에서도 형태가 살도록)
  circle(c, x + size / 2, y + size / 2, size * 0.58, { fill: c.p.onPrimary, opacity: 0.9 });
  c.nodes.push(...illustration(illustrationFor(c.category), x, y, size, c.p));
}

/** 배경 장식 — 흰 화면에 텍스트만 남지 않도록 */
function backdrop(c: Ctx, from: number) {
  circle(c, -c.w * 0.1, c.h * 0.92, c.w * 0.3, { fill: c.p.secondary, opacity: 0.07 });
  circle(c, c.w * 1.06, from + c.h * 0.1, c.w * 0.22, { fill: c.p.accent, opacity: 0.09 });
}

/* ------------------------------------------------------------------ */
/* 레이아웃                                                             */
/* ------------------------------------------------------------------ */

function visibleSections(asset: AiBlogImageAsset, max: number): VisualSection[] {
  return asset.sections.slice(0, max);
}

/** 표지·대표 이미지 — 큰 제목 + 대표 비주얼 */
function heroLayout(c: Ctx, asset: AiBlogImageAsset) {
  const artTop = c.h * 0.52;

  // 아래쪽 컬러 패널 + 대표 일러스트
  rect(c, 0, artTop, c.w, c.h - artTop, {
    gradient: { from: c.p.primary, to: c.p.secondary, direction: "diagonal" },
  });
  circle(c, c.w * 0.14, artTop + (c.h - artTop) * 0.22, c.w * 0.12, {
    fill: c.p.onPrimary,
    opacity: 0.12,
  });

  const artSize = Math.min(c.w * 0.42, (c.h - artTop) * 0.78);
  c.nodes.push(
    ...illustration(
      illustrationFor(c.category),
      c.w / 2 - artSize / 2,
      artTop + (c.h - artTop) / 2 - artSize / 2,
      artSize,
      c.p,
    ),
  );

  // 상단 제목
  const top = c.pad * 1.6;
  const width = c.w - c.pad * 2;
  rect(c, c.pad, top, c.w * 0.14, 8 * c.u, { fill: c.p.secondary, radius: 4 * c.u });

  let y = top + 32 * c.u;
  y += text(c, asset.title, c.pad, y, width, {
    size: Math.min(78 * c.u, c.h * 0.075),
    weight: 800,
    maxLines: 3,
    lineHeightRatio: 1.24,
  });

  if (asset.subtitle) {
    text(c, asset.subtitle, c.pad, y + 18 * c.u, width, {
      size: 30 * c.u,
      color: c.p.body,
      maxLines: 2,
    });
  }
}

/** 본문 비주얼 — 그림이 주인공 */
function visualLayout(c: Ctx, asset: AiBlogImageAsset) {
  // 장면 설명이 있으면 그것을 우선한다 (제목은 이미지마다 같아서 변별력이 없다)
  const kind = pickArticleScene(asset.scene?.trim() || asset.title, asset.index);
  c.nodes.push(...articleScene(kind, { x: 0, y: 0, w: c.w, h: c.h }, c.p, c.category));

  // 캡션은 아주 짧게, 있을 때만
  const caption = asset.title || asset.subtitle;
  if (caption) {
    const barH = c.h * 0.16;
    rect(c, 0, c.h - barH, c.w, barH, { fill: c.p.primary, opacity: 0.92 });
    text(c, caption, c.pad, c.h - barH + barH * 0.28, c.w - c.pad * 2, {
      size: Math.min(34 * c.u, barH * 0.34),
      weight: 700,
      color: c.p.onPrimary,
      maxLines: 1,
    });
  }
}

/** 중앙 비주얼 + 주변 포인트 */
function radialLayout(c: Ctx, asset: AiBlogImageAsset, top: number, bottom: number) {
  const sections = visibleSections(asset, 4);
  const width = c.w - c.pad * 2;
  const colW = (width - 26 * c.u) / 2;
  const height = bottom - top;
  const rowH = Math.min(168 * c.u, (height - height * 0.34) / 2);
  const centerR = Math.min(150 * c.u, height * 0.17);
  const centerY = top + height / 2;

  const drawItem = (section: VisualSection | undefined, x: number, y: number) => {
    if (!section) return;
    rect(c, x, y, colW, rowH, { fill: c.p.surface, radius: 22 * c.u });
    const r = 26 * c.u;
    iconBadge(c, x + 22 * c.u + r, y + 30 * c.u + r, r, section.title, "solid");

    const tx = x + 22 * c.u;
    const ty = y + 30 * c.u + r * 2 + 14 * c.u;
    const used = text(c, section.title, tx, ty, colW - 44 * c.u, {
      size: 30 * c.u,
      weight: 700,
      maxLines: 1,
    });
    if (section.description) {
      text(c, section.description, tx, ty + used + 2 * c.u, colW - 44 * c.u, {
        size: 22 * c.u,
        color: c.p.body,
        maxLines: 2,
      });
    }
    // 번호 배지
    if (section.marker) {
      const bx = x + colW - 22 * c.u;
      c.nodes.push({
        kind: "text",
        x: bx,
        y: y + 40 * c.u,
        lines: [section.marker],
        size: 24 * c.u,
        weight: 800,
        color: c.p.accent,
        align: "right",
        lineHeight: 24 * c.u,
      });
    }
  };

  const topRowY = centerY - centerR - rowH - 26 * c.u;
  const bottomRowY = centerY + centerR + 26 * c.u;

  // 연결선 먼저 (뒤에 깔리도록)
  const cx = c.w / 2;
  line(c, cx, topRowY + rowH, cx, centerY - centerR, c.p.line, 4 * c.u);
  line(c, cx, centerY + centerR, cx, bottomRowY, c.p.line, 4 * c.u);
  line(c, c.pad + colW * 0.5, topRowY + rowH, cx - centerR * 0.7, centerY - centerR * 0.6, c.p.line, 3 * c.u, 0.7);
  line(c, c.pad + colW * 1.5 + 26 * c.u, bottomRowY, cx + centerR * 0.7, centerY + centerR * 0.6, c.p.line, 3 * c.u, 0.7);

  drawItem(sections[0], c.pad, topRowY);
  drawItem(sections[1], c.pad + colW + 26 * c.u, topRowY);
  drawItem(sections[2], c.pad, bottomRowY);
  drawItem(sections[3], c.pad + colW + 26 * c.u, bottomRowY);

  // 중앙 일러스트
  circle(c, cx, centerY, centerR, { fill: c.p.surfaceStrong });
  circle(c, cx, centerY, centerR * 0.92, { fill: c.p.background });
  c.nodes.push(
    ...illustration(
      illustrationFor(c.category),
      cx - centerR * 0.72,
      centerY - centerR * 0.72,
      centerR * 1.44,
      c.p,
    ),
  );
}

/** 체크리스트 */
function checklistLayout(c: Ctx, asset: AiBlogImageAsset, top: number, bottom: number) {
  const sections = visibleSections(asset, 5);
  const width = c.w - c.pad * 2;
  const gap = 18 * c.u;
  const rowH = Math.min(132 * c.u, (bottom - top - gap * (sections.length - 1)) / Math.max(1, sections.length));

  sections.forEach((section, i) => {
    const y = top + i * (rowH + gap);
    rect(c, c.pad, y, width, rowH, { fill: c.p.surface, radius: 20 * c.u });
    rect(c, c.pad, y, 8 * c.u, rowH, { fill: c.p.secondary, radius: 4 * c.u });

    const box = Math.min(52 * c.u, rowH * 0.46);
    const bx = c.pad + 30 * c.u;
    const by = y + rowH / 2 - box / 2;
    rect(c, bx, by, box, box, { fill: c.p.primary, radius: 12 * c.u });
    c.nodes.push(icon("check", bx + box * 0.2, by + box * 0.2, box * 0.6, c.p.onPrimary, 2.6));

    const tx = bx + box + 26 * c.u;
    const tw = width - (tx - c.pad) - 30 * c.u;
    const used = text(c, section.title, tx, y + rowH * 0.24, tw, {
      size: 32 * c.u,
      weight: 700,
      maxLines: 1,
    });
    if (section.description) {
      text(c, section.description, tx, y + rowH * 0.24 + used + 2 * c.u, tw, {
        size: 23 * c.u,
        color: c.p.body,
        maxLines: 2,
      });
    }
  });
}

/** 화살표 프로세스 */
function processLayout(c: Ctx, asset: AiBlogImageAsset, top: number, bottom: number) {
  const sections = visibleSections(asset, 5);
  const width = c.w - c.pad * 2;
  const arrow = 40 * c.u;
  const rowH = Math.min(
    150 * c.u,
    (bottom - top - arrow * (sections.length - 1)) / Math.max(1, sections.length),
  );

  sections.forEach((section, i) => {
    const y = top + i * (rowH + arrow);
    rect(c, c.pad, y, width, rowH, {
      gradient:
        i === 0
          ? { from: c.p.primary, to: c.p.secondary, direction: "horizontal" }
          : undefined,
      fill: i === 0 ? undefined : c.p.surface,
      radius: 22 * c.u,
    });

    const dark = i === 0;
    const r = Math.min(30 * c.u, rowH * 0.24);
    circle(c, c.pad + 32 * c.u + r, y + rowH / 2, r, {
      fill: dark ? c.p.onPrimary : c.p.primary,
    });
    c.nodes.push({
      kind: "text",
      x: c.pad + 32 * c.u + r,
      y: y + rowH / 2 + r * 0.36,
      lines: [String(i + 1)],
      size: r * 1.05,
      weight: 800,
      color: dark ? c.p.primary : c.p.onPrimary,
      align: "center",
      lineHeight: r,
    });

    const tx = c.pad + 32 * c.u + r * 2 + 24 * c.u;
    const tw = width - (tx - c.pad) - 30 * c.u;
    const used = text(c, section.title, tx, y + rowH * 0.24, tw, {
      size: 30 * c.u,
      weight: 700,
      color: dark ? c.p.onPrimary : c.p.title,
      maxLines: 1,
    });
    if (section.description) {
      text(c, section.description, tx, y + rowH * 0.24 + used + 2 * c.u, tw, {
        size: 23 * c.u,
        color: dark ? c.p.onPrimary : c.p.body,
        maxLines: 2,
      });
    }

    // 오른쪽 끝 아이콘 — 단계의 성격을 도형으로 보여준다
    const iconSize = Math.min(46 * c.u, rowH * 0.42);
    c.nodes.push(
      icon(
        pickIcon(`${section.title} ${section.description ?? ""}`),
        c.pad + width - 34 * c.u - iconSize,
        y + rowH / 2 - iconSize / 2,
        iconSize,
        dark ? c.p.onPrimary : c.p.secondary,
        2.2,
      ),
    );

    if (i < sections.length - 1) {
      c.nodes.push({
        kind: "arrow",
        x: c.w / 2,
        y: y + rowH + arrow * 0.16,
        size: arrow * 0.62,
        fill: c.p.secondary,
      });
    }
  });
}

/** 타임라인 */
function timelineLayout(c: Ctx, asset: AiBlogImageAsset, top: number, bottom: number) {
  const sections = visibleSections(asset, 5);
  const spineX = c.pad + 26 * c.u;
  const gap = 26 * c.u;
  const rowH = Math.min(140 * c.u, (bottom - top - gap * (sections.length - 1)) / Math.max(1, sections.length));

  line(c, spineX, top + 20 * c.u, spineX, bottom - 20 * c.u, c.p.line, 6 * c.u);

  sections.forEach((section, i) => {
    const y = top + i * (rowH + gap);
    circle(c, spineX, y + 34 * c.u, 18 * c.u, { fill: c.p.background, stroke: c.p.primary, strokeWidth: 6 * c.u });
    circle(c, spineX, y + 34 * c.u, 7 * c.u, { fill: c.p.secondary });

    const tx = spineX + 46 * c.u;
    const tw = c.w - c.pad - tx;
    rect(c, tx - 16 * c.u, y, tw + 16 * c.u, rowH, { fill: c.p.surface, radius: 18 * c.u });

    const iconSize = Math.min(44 * c.u, rowH * 0.4);
    c.nodes.push(
      icon(
        pickIcon(`${section.title} ${section.description ?? ""}`),
        c.w - c.pad - 20 * c.u - iconSize,
        y + rowH / 2 - iconSize / 2,
        iconSize,
        c.p.secondary,
        2.2,
      ),
    );

    c.nodes.push({
      kind: "text",
      x: tx,
      y: y + 34 * c.u,
      lines: [section.marker ?? ""],
      size: 21 * c.u,
      weight: 800,
      color: c.p.secondary,
      align: "left",
      lineHeight: 21 * c.u,
    });
    const textW = tw - 36 * c.u - iconSize;
    const used = text(c, section.title, tx, y + 46 * c.u, textW, {
      size: 30 * c.u,
      weight: 700,
      maxLines: 1,
    });
    if (section.description) {
      text(c, section.description, tx, y + 46 * c.u + used + 2 * c.u, textW, {
        size: 22 * c.u,
        color: c.p.body,
        maxLines: 2,
      });
    }
  });
}

/** 좌우 비교 */
function comparisonLayout(c: Ctx, asset: AiBlogImageAsset, top: number, bottom: number) {
  const sections = visibleSections(asset, 6);
  const mid = Math.ceil(sections.length / 2);
  const width = c.w - c.pad * 2;
  const colW = (width - 30 * c.u) / 2;
  const height = bottom - top;

  // 좌우 패널 배경
  rect(c, c.pad, top, colW, height, { fill: c.p.surface, radius: 24 * c.u });
  rect(c, c.pad + colW + 30 * c.u, top, colW, height, {
    fill: c.p.surfaceStrong,
    radius: 24 * c.u,
  });

  // 가운데 VS 원
  const vsR = 34 * c.u;
  circle(c, c.w / 2, top + height / 2, vsR, { fill: c.p.primary });
  c.nodes.push({
    kind: "text",
    x: c.w / 2,
    y: top + height / 2 + vsR * 0.3,
    lines: ["VS"],
    size: vsR * 0.72,
    weight: 800,
    color: c.p.onPrimary,
    align: "center",
    lineHeight: vsR,
  });

  const column = (rows: VisualSection[], x: number, accent: string) => {
    const gap = 16 * c.u;
    const inner = height - 44 * c.u;
    const rowH = Math.min(150 * c.u, (inner - gap * (rows.length - 1)) / Math.max(1, rows.length));
    rows.forEach((section, i) => {
      const y = top + 22 * c.u + i * (rowH + gap);
      const r = 22 * c.u;
      iconBadge(c, x + 24 * c.u + r, y + 24 * c.u + r, r, section.title, "soft");
      const tx = x + 24 * c.u;
      const ty = y + 24 * c.u + r * 2 + 12 * c.u;
      const used = text(c, section.title, tx, ty, colW - 48 * c.u, {
        size: 27 * c.u,
        weight: 700,
        maxLines: 1,
      });
      if (section.description) {
        text(c, section.description, tx, ty + used + 2 * c.u, colW - 48 * c.u, {
          size: 21 * c.u,
          color: c.p.body,
          maxLines: 3,
        });
      }
      line(c, tx, y + rowH - 6 * c.u, tx + 40 * c.u, y + rowH - 6 * c.u, accent, 5 * c.u);
    });
  };

  column(sections.slice(0, mid), c.pad, c.p.secondary);
  column(sections.slice(mid), c.pad + colW + 30 * c.u, c.p.accent);
}

/** 큰 번호 */
function numberedLayout(c: Ctx, asset: AiBlogImageAsset, top: number, bottom: number) {
  const sections = visibleSections(asset, 4);
  const width = c.w - c.pad * 2;
  const gap = 22 * c.u;
  const rowH = Math.min(180 * c.u, (bottom - top - gap * (sections.length - 1)) / Math.max(1, sections.length));

  sections.forEach((section, i) => {
    const y = top + i * (rowH + gap);
    rect(c, c.pad, y, width, rowH, { fill: c.p.surface, radius: 22 * c.u });

    const numSize = Math.min(96 * c.u, rowH * 0.62);
    c.nodes.push({
      kind: "text",
      x: c.pad + 30 * c.u,
      y: y + rowH / 2 + numSize * 0.34,
      lines: [section.marker ?? String(i + 1).padStart(2, "0")],
      size: numSize,
      weight: 800,
      color: c.p.secondary,
      align: "left",
      lineHeight: numSize,
    });

    const tx = c.pad + 30 * c.u + numSize * 1.5;
    const tw = width - (tx - c.pad) - 90 * c.u;
    const used = text(c, section.title, tx, y + rowH * 0.26, tw, {
      size: 32 * c.u,
      weight: 700,
      maxLines: 1,
    });
    if (section.description) {
      text(c, section.description, tx, y + rowH * 0.26 + used + 2 * c.u, tw, {
        size: 23 * c.u,
        color: c.p.body,
        maxLines: 2,
      });
    }

    const r = 26 * c.u;
    iconBadge(c, c.pad + width - 44 * c.u, y + rowH / 2, r, section.title, "soft");
  });
}

/** 균등 분할 */
function gridLayout(c: Ctx, asset: AiBlogImageAsset, top: number, bottom: number) {
  const sections = visibleSections(asset, 4);
  const width = c.w - c.pad * 2;
  const gap = 22 * c.u;
  const cols = sections.length <= 2 ? 1 : 2;
  const rows = Math.ceil(sections.length / cols);
  const cellW = (width - gap * (cols - 1)) / cols;
  const cellH = Math.min(260 * c.u, (bottom - top - gap * (rows - 1)) / Math.max(1, rows));

  sections.forEach((section, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = c.pad + col * (cellW + gap);
    const y = top + row * (cellH + gap);

    rect(c, x, y, cellW, cellH, { fill: c.p.surface, radius: 24 * c.u });
    rect(c, x, y, cellW, 10 * c.u, {
      fill: i % 2 === 0 ? c.p.secondary : c.p.accent,
      radius: 5 * c.u,
    });

    const r = Math.min(34 * c.u, cellH * 0.16);
    iconBadge(c, x + 28 * c.u + r, y + 34 * c.u + r, r, section.title, "solid");

    const tx = x + 26 * c.u;
    const ty = y + 34 * c.u + r * 2 + 16 * c.u;
    const used = text(c, section.title, tx, ty, cellW - 52 * c.u, {
      size: 30 * c.u,
      weight: 700,
      maxLines: 2,
    });
    if (section.description) {
      text(c, section.description, tx, ty + used + 4 * c.u, cellW - 52 * c.u, {
        size: 22 * c.u,
        color: c.p.body,
        maxLines: 3,
      });
    }
  });
}

/** 관계 도식 */
function diagramLayout(c: Ctx, asset: AiBlogImageAsset, top: number, bottom: number) {
  const sections = visibleSections(asset, 4);
  const [head, ...rest] = sections;
  const width = c.w - c.pad * 2;
  const nodeH = Math.min(120 * c.u, (bottom - top) * 0.3);

  if (head) {
    const w = width * 0.66;
    const x = c.pad + (width - w) / 2;
    rect(c, x, top, w, nodeH, {
      gradient: { from: c.p.primary, to: c.p.secondary, direction: "horizontal" },
      radius: 20 * c.u,
    });
    text(c, head.title, x + 20 * c.u, top + nodeH / 2 - 18 * c.u, w - 40 * c.u, {
      size: 32 * c.u,
      weight: 700,
      color: c.p.onPrimary,
      align: "center",
      maxLines: 1,
    });
  }

  if (rest.length > 0) {
    const childY = Math.min(top + nodeH + 110 * c.u, bottom - nodeH);
    line(c, c.w / 2, top + nodeH, c.w / 2, childY - 34 * c.u, c.p.line, 5 * c.u);
    const gap = 20 * c.u;
    const cw = (width - gap * (rest.length - 1)) / rest.length;
    rest.forEach((section, i) => {
      const x = c.pad + i * (cw + gap);
      line(c, c.w / 2, childY - 34 * c.u, x + cw / 2, childY, c.p.line, 4 * c.u, 0.8);
      rect(c, x, childY, cw, nodeH, { fill: c.p.surface, radius: 18 * c.u });
      const r = 20 * c.u;
      iconBadge(c, x + cw / 2, childY + 26 * c.u + r * 0.2, r, section.title, "soft");
      text(c, section.title, x + 12 * c.u, childY + nodeH * 0.6, cw - 24 * c.u, {
        size: 25 * c.u,
        weight: 700,
        align: "center",
        maxLines: 2,
      });
    });
  }
}

/** 정리 + 행동 유도 */
function summaryLayout(c: Ctx, asset: AiBlogImageAsset, top: number, bottom: number) {
  const width = c.w - c.pad * 2;
  let y = top;

  if (asset.keyMessage) {
    y += text(c, asset.keyMessage, c.pad, y, width, {
      size: 44 * c.u,
      weight: 800,
      maxLines: 2,
      lineHeightRatio: 1.3,
    });
    y += 26 * c.u;
  }

  for (const section of visibleSections(asset, 3)) {
    const rowH = 96 * c.u;
    rect(c, c.pad, y, width, rowH, { fill: c.p.surface, radius: 18 * c.u });
    const r = 24 * c.u;
    iconBadge(c, c.pad + 26 * c.u + r, y + rowH / 2, r, section.title, "solid");
    const tx = c.pad + 26 * c.u + r * 2 + 20 * c.u;
    const used = text(c, section.title, tx, y + rowH * 0.24, width - (tx - c.pad) - 24 * c.u, {
      size: 28 * c.u,
      weight: 700,
      maxLines: 1,
    });
    if (section.description) {
      text(c, section.description, tx, y + rowH * 0.24 + used + 2 * c.u, width - (tx - c.pad) - 24 * c.u, {
        size: 21 * c.u,
        color: c.p.body,
        maxLines: 1,
      });
    }
    y += rowH + 16 * c.u;
  }

  // 하단 CTA 밴드 + 일러스트
  const bandH = Math.min(140 * c.u, bottom - y - 10 * c.u);
  if (bandH > 60 * c.u) {
    const bandY = bottom - bandH;
    rect(c, c.pad, bandY, width, bandH, {
      gradient: { from: c.p.primary, to: c.p.secondary, direction: "horizontal" },
      radius: 22 * c.u,
    });
    const artSize = bandH * 0.78;
    c.nodes.push(
      ...illustration(
        secondaryIllustrationFor(c.category),
        c.pad + width - artSize - 24 * c.u,
        bandY + bandH / 2 - artSize / 2,
        artSize,
        c.p,
      ),
    );
    text(c, "저장해두고 하나씩 확인해 보세요", c.pad + 30 * c.u, bandY + bandH / 2 - 18 * c.u, width * 0.6, {
      size: 30 * c.u,
      weight: 700,
      color: c.p.onPrimary,
      maxLines: 2,
    });
  }
}

/* ------------------------------------------------------------------ */
/* 장면 조립                                                            */
/* ------------------------------------------------------------------ */

const HEADER_LAYOUTS = new Set([
  "radial",
  "checklist",
  "process",
  "timeline",
  "comparison",
  "numbered",
  "grid",
  "diagram",
  "summary",
  "mixed",
]);

export function buildScene(asset: AiBlogImageAsset): RenderScene {
  const { width, height } = sizeOf(asset.ratio);
  const p = paletteFor(asset.style);
  const u = width / 1080;
  const pad = 72 * u;

  const c: Ctx = {
    w: width,
    h: height,
    pad,
    u,
    p,
    category: (asset.category ?? "etc") as AiBlogCategory,
    nodes: [],
  };

  // AI 그래픽이 있으면 배경으로 깔고 그 위에 텍스트를 얹는다
  if (asset.url) {
    c.nodes.push({ kind: "image", x: 0, y: 0, w: width, h: height, href: asset.url });
    c.nodes.push({
      kind: "rect",
      x: 0,
      y: 0,
      w: width,
      h: height,
      gradient: { from: "rgba(0,0,0,0)", to: "rgba(0,0,0,0.55)", direction: "vertical" },
    });
  }

  const layout = asset.layout;

  if (layout === "hero") {
    heroLayout(c, asset);
  } else if (layout === "visual") {
    visualLayout(c, asset);
  } else {
    const headerH = Math.min(height * 0.26, Math.max(190 * u, height * 0.16));
    if (HEADER_LAYOUTS.has(layout)) headerBand(c, headerH);
    backdrop(c, headerH);

    // 헤더 히어로 아트 — 레이아웃이 달라도 자리가 같아 시선이 흔들리지 않는다
    const artSize = Math.min(headerH * 0.9, width * 0.2);
    const hasArt = HEADER_LAYOUTS.has(layout);
    if (hasArt) headerArt(c, headerH, artSize);

    // 헤더 안 텍스트 — 아트를 피해 폭을 줄인다
    const width0 = width - pad * 2;
    const headW = hasArt ? width0 - artSize - 26 * u : width0 * 0.86;
    const badgeLabel =
      asset.type === "cardnews"
        ? `${asset.index} / ${asset.totalPages ?? asset.index}`
        : imageTypeLabel(asset.type);
    const badgeSize = 23 * u;
    const badgeW = measureText(badgeLabel, badgeSize, 700) + 36 * u;
    rect(c, pad, pad * 0.55, badgeW, 46 * u, { fill: p.onPrimary, opacity: 0.22, radius: 23 * u });
    c.nodes.push({
      kind: "text",
      x: pad + badgeW / 2,
      y: pad * 0.55 + 30 * u,
      lines: [badgeLabel],
      size: badgeSize,
      weight: 700,
      color: p.onPrimary,
      align: "center",
      lineHeight: badgeSize,
    });

    let y = pad * 0.55 + 46 * u + 20 * u;
    y += text(c, asset.title, pad, y, headW, {
      size: Math.min(46 * u, headerH * 0.22),
      weight: 800,
      color: p.onPrimary,
      maxLines: 2,
      lineHeightRatio: 1.25,
    });
    if (asset.subtitle) {
      text(c, asset.subtitle, pad, y + 6 * u, headW, {
        size: 25 * u,
        color: p.onPrimary,
        maxLines: 1,
      });
    }

    const footH = asset.footnote ? 58 * u : 0;
    const top = headerH + 44 * u;
    const bottom = height - pad - footH;

    switch (layout) {
      case "radial":
        radialLayout(c, asset, top, bottom);
        break;
      case "checklist":
        checklistLayout(c, asset, top, bottom);
        break;
      case "process":
        processLayout(c, asset, top, bottom);
        break;
      case "timeline":
        timelineLayout(c, asset, top, bottom);
        break;
      case "comparison":
        comparisonLayout(c, asset, top, bottom);
        break;
      case "numbered":
        numberedLayout(c, asset, top, bottom);
        break;
      case "diagram":
        diagramLayout(c, asset, top, bottom);
        break;
      case "summary":
        summaryLayout(c, asset, top, bottom);
        break;
      default:
        gridLayout(c, asset, top, bottom);
        break;
    }

    if (asset.footnote) {
      text(c, asset.footnote, pad, height - pad - 28 * u, width - pad * 2, {
        size: 22 * u,
        color: p.muted,
        maxLines: 1,
      });
    }
  }

  return {
    width,
    height,
    background: p.background,
    backgroundGradient: { from: p.background, to: p.backgroundAlt, direction: "vertical" },
    nodes: c.nodes,
  };
}

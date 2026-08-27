import type { InfoTheme } from "@/lib/ai-blog/render/info-theme";
import { infoThemeOf } from "@/lib/ai-blog/render/info-theme";
import { wrapText } from "@/lib/ai-blog/render/measure";
import type { RenderScene, SceneNode, TextAlign } from "@/lib/ai-blog/render/scene";
import type { InfoVisualImage, InfoVisualItem, InfoVisualPlan } from "@/lib/ai-blog/types";

/**
 * 정보 이미지 → 렌더 장면.
 *
 * 미리보기(SVG)와 다운로드(Canvas)가 이 장면 데이터를 함께 쓴다.
 * 좌표는 실제 출력 해상도 기준이라 화면과 저장 파일의 배치가 완전히 같다.
 *
 * 그리는 것은 전부 텍스트·도형·구분선뿐이다.
 *   제목 / 번호 / 표 / 체크박스 / 비교 / 단계·화살표 / 구분선 / 강조 박스
 * 사람 실루엣·배경 일러스트·장면 그림은 그리지 않는다 (요구사항 1·12).
 *
 * 한글 품질을 최우선으로 하므로, 모든 문구는 실제로 그릴 폰트로 폭을 재서
 * 들어갈 때까지 크기를 줄인 뒤 배치한다. 잘려나가는 글자가 생기지 않게 한다.
 */

interface Ctx {
  w: number;
  h: number;
  /** 1080 기준 배율 */
  u: number;
  pad: number;
  t: InfoTheme;
  nodes: SceneNode[];
}

/* ------------------------------------------------------------------ */
/* 기본 도형                                                            */
/* ------------------------------------------------------------------ */

interface BoxOptions {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  radius?: number;
  opacity?: number;
}

function rect(c: Ctx, x: number, y: number, w: number, h: number, options: BoxOptions = {}) {
  c.nodes.push({ kind: "rect", x, y, w, h, ...options });
}

function hline(c: Ctx, x1: number, x2: number, y: number, stroke: string, width: number) {
  c.nodes.push({ kind: "line", x1, y1: y, x2, y2: y, stroke, strokeWidth: width });
}

function vline(c: Ctx, x: number, y1: number, y2: number, stroke: string, width: number) {
  c.nodes.push({ kind: "line", x1: x, y1, x2: x, y2, stroke, strokeWidth: width });
}

function downArrow(c: Ctx, cx: number, y: number, size: number, fill: string) {
  c.nodes.push({ kind: "arrow", x: cx, y, size, fill, direction: "down" });
}

/** 체크 표시 (24×24 좌표계) */
const CHECK_PATH = "M4.5 12.5 L9.5 17.5 L19.5 6.5";

function checkMark(c: Ctx, x: number, y: number, size: number, color: string, weight: number) {
  c.nodes.push({
    kind: "path",
    d: CHECK_PATH,
    viewport: 24,
    x,
    y,
    size,
    stroke: color,
    strokeWidth: weight,
  });
}

/* ------------------------------------------------------------------ */
/* 텍스트                                                               */
/* ------------------------------------------------------------------ */

interface FitOptions {
  max: number;
  min: number;
  weight: number;
  maxLines: number;
  lineHeightRatio?: number;
}

interface FitResult {
  size: number;
  lines: string[];
  lineHeight: number;
  /** 실제로 차지하는 높이 */
  height: number;
}

const EMPTY_FIT: FitResult = { size: 0, lines: [], lineHeight: 0, height: 0 };

/**
 * 정해진 폭·줄 수 안에 들어갈 때까지 글자 크기를 줄인다.
 *
 * 말줄임으로 잘라내기 전에 크기부터 줄이기 때문에,
 * 한국어 제목이 "…" 로 끝나는 일이 거의 생기지 않는다.
 */
function fit(value: string, width: number, options: FitOptions): FitResult {
  const text = value.replace(/\s+/g, " ").trim();
  if (!text || width <= 0) return EMPTY_FIT;

  const ratio = options.lineHeightRatio ?? 1.34;
  const step = Math.max(1, options.max * 0.05);

  for (let size = options.max; size > options.min; size -= step) {
    const lines = wrapText(text, width, size, options.weight, options.maxLines + 2);
    if (lines.length <= options.maxLines) {
      const lineHeight = size * ratio;
      return { size, lines, lineHeight, height: lines.length * lineHeight };
    }
  }

  const size = options.min;
  const lines = wrapText(text, width, size, options.weight, options.maxLines);
  const lineHeight = size * ratio;
  return { size, lines, lineHeight, height: lines.length * lineHeight };
}

/** fit 결과를 y 위치에 그린다 (y 는 글자 블록의 위쪽) */
function put(
  c: Ctx,
  result: FitResult,
  x: number,
  y: number,
  color: string,
  align: TextAlign = "left",
  width = 0,
): number {
  if (result.lines.length === 0) return 0;
  const anchorX = align === "center" ? x + width / 2 : align === "right" ? x + width : x;
  c.nodes.push({
    kind: "text",
    x: anchorX,
    y: y + result.size * 0.82,
    lines: result.lines,
    size: result.size,
    weight: 0,
    color,
    align,
    lineHeight: result.lineHeight,
  });
  return result.height;
}

/** 한 줄짜리 고정 크기 텍스트 (번호·표 헤더처럼 줄바꿈이 없는 것) */
function label(
  c: Ctx,
  value: string,
  x: number,
  baseline: number,
  size: number,
  weight: number,
  color: string,
  align: TextAlign = "left",
) {
  if (!value) return;
  c.nodes.push({
    kind: "text",
    x,
    y: baseline,
    lines: [value],
    size,
    weight,
    color,
    align,
    lineHeight: size,
  });
}

/** put 은 weight 를 fit 에서 못 받으므로 여기서 채워 넣는다 */
function putWeighted(
  c: Ctx,
  result: FitResult,
  weight: number,
  x: number,
  y: number,
  color: string,
  align: TextAlign = "left",
  width = 0,
): number {
  const height = put(c, result, x, y, color, align, width);
  const node = c.nodes[c.nodes.length - 1];
  if (node && node.kind === "text") node.weight = weight;
  return height;
}

/* ------------------------------------------------------------------ */
/* 배치 계산                                                            */
/* ------------------------------------------------------------------ */

interface RowPlan {
  rowH: number;
  gap: number;
  startY: number;
}

/**
 * 항목 n 개를 영역 안에 고르게 배치한다.
 *
 * 세로로 긴 비율(9:16 등)에서 항목이 위쪽에만 몰리지 않도록
 * 남는 공간을 간격에 조금 나눠준 뒤 전체를 가운데로 맞춘다.
 */
function planRows(
  top: number,
  bottom: number,
  count: number,
  options: { min: number; max: number; gap: number; maxGap: number },
): RowPlan {
  const avail = bottom - top;
  if (count <= 0) return { rowH: 0, gap: 0, startY: top };

  let gap = options.gap;
  let rowH = Math.min(options.max, Math.max(options.min, (avail - gap * (count - 1)) / count));
  let used = rowH * count + gap * (count - 1);

  if (used < avail && count > 1) {
    gap = Math.min(options.maxGap, gap + (avail - used) / (count - 1));
    used = rowH * count + gap * (count - 1);
  }
  if (used > avail) {
    rowH = Math.max(options.min * 0.7, (avail - gap * (count - 1)) / count);
    used = rowH * count + gap * (count - 1);
  }

  return { rowH, gap, startY: top + Math.max(0, (avail - used) / 2) };
}

/* ------------------------------------------------------------------ */
/* 헤더                                                                 */
/* ------------------------------------------------------------------ */

/** 제목 영역을 그리고 본문이 시작할 y 를 돌려준다 */
function drawHeader(c: Ctx, plan: InfoVisualPlan): number {
  const { t, u } = c;
  const band = t.header === "band";
  const width = c.w - c.pad * 2;

  const title = fit(plan.title, width, {
    max: Math.min(58 * u, c.h * 0.072),
    min: 32 * u,
    weight: 800,
    maxLines: 2,
    lineHeightRatio: 1.26,
  });
  const sub = plan.subtitle
    ? fit(plan.subtitle, width, { max: 27 * u, min: 20 * u, weight: 500, maxLines: 1 })
    : EMPTY_FIT;

  const barH = 8 * u;
  const topPad = c.pad * (band ? 0.82 : 0.9);
  const afterBar = 26 * u;
  const afterTitle = sub.height > 0 ? 14 * u : 0;
  const blockH = barH + afterBar + title.height + afterTitle + sub.height;

  if (band) {
    const bandH = topPad + blockH + c.pad * 0.72;
    rect(c, 0, 0, c.w, bandH, { fill: t.headerFill });

    let y = topPad;
    rect(c, c.pad, y, 86 * u, barH, { fill: t.headerSub, radius: barH / 2 });
    y += barH + afterBar;
    y += putWeighted(c, title, 800, c.pad, y, t.headerText);
    if (sub.height > 0) putWeighted(c, sub, 500, c.pad, y + afterTitle, t.headerSub);

    return bandH + 52 * u;
  }

  let y = topPad;
  rect(c, c.pad, y, 86 * u, barH, { fill: t.accent, radius: t.radius > 10 ? barH / 2 : 0 });
  y += barH + afterBar;
  y += putWeighted(c, title, 800, c.pad, y, t.headerText);
  if (sub.height > 0) y += afterTitle + putWeighted(c, sub, 500, c.pad, y + afterTitle, t.headerSub);

  const ruleY = y + 34 * u;
  hline(c, c.pad, c.w - c.pad, ruleY, t.borderStrong, 3 * u);
  return ruleY + 46 * u;
}

/* ------------------------------------------------------------------ */
/* 대표 이미지                                                          */
/* ------------------------------------------------------------------ */

/**
 * 대표 이미지 — 큰 제목 + 짧은 서브카피 + 간단한 그래픽 요소.
 * 정보를 나열하지 않는다 (요구사항 5).
 */
function thumbnailLayout(c: Ctx, plan: InfoVisualPlan) {
  const { t, u } = c;
  const band = t.header === "band";

  // 오른쪽 옅은 면 — 텍스트만 떠 있지 않도록 화면에 구조를 준다
  rect(c, c.w * 0.66, 0, c.w * 0.34, c.h, { fill: t.panel, opacity: band ? 0.55 : 1 });
  rect(c, c.w * 0.66, 0, 4 * u, c.h, { fill: t.border });

  // 하단 강조 밴드
  const footH = c.h * 0.11;
  rect(c, 0, c.h - footH, c.w, footH, { fill: band ? t.headerFill : t.accent });

  const width = c.w * 0.66 - c.pad * 1.4;
  const title = fit(plan.title, width, {
    max: Math.min(92 * u, c.h * 0.14),
    min: 44 * u,
    weight: 800,
    maxLines: 3,
    lineHeightRatio: 1.24,
  });
  const sub = plan.subtitle
    ? fit(plan.subtitle, width, { max: 32 * u, min: 22 * u, weight: 500, maxLines: 2 })
    : EMPTY_FIT;

  const barH = 10 * u;
  const gapAfterBar = 34 * u;
  const gapAfterTitle = sub.height > 0 ? 26 * u : 0;
  const blockH = barH + gapAfterBar + title.height + gapAfterTitle + sub.height;

  let y = Math.max(c.pad, (c.h - footH - blockH) / 2);
  rect(c, c.pad, y, 104 * u, barH, { fill: t.accent, radius: t.radius > 10 ? barH / 2 : 0 });
  y += barH + gapAfterBar;
  y += putWeighted(c, title, 800, c.pad, y, t.title);
  if (sub.height > 0) putWeighted(c, sub, 500, c.pad, y + gapAfterTitle, t.body);

  // 오른쪽 면 위 간단한 그래픽 — 사각형 3개로 만든 절제된 마크
  const markX = c.w * 0.66 + (c.w * 0.34 - 132 * u) / 2;
  const markY = c.h * 0.5 - 66 * u;
  const cell = 40 * u;
  const marks: Array<[number, number, string]> = [
    [0, 0, t.accent],
    [1, 0, t.accentSoft],
    [0, 1, t.accentSoft],
    [1, 1, t.secondary],
  ];
  for (const [col, row, fill] of marks) {
    rect(c, markX + col * (cell + 14 * u), markY + row * (cell + 14 * u), cell, cell, {
      fill,
      radius: t.radius > 10 ? cell * 0.32 : 0,
    });
  }
}

/* ------------------------------------------------------------------ */
/* 목록형 — 핵심 요약 / 체크리스트                                      */
/* ------------------------------------------------------------------ */

interface ListRowStyle {
  /** 왼쪽 표식 — 번호 또는 체크박스 */
  marker: "number" | "check";
}

function listLayout(
  c: Ctx,
  items: InfoVisualItem[],
  top: number,
  bottom: number,
  style: ListRowStyle,
) {
  const { t, u } = c;
  const rows = items.slice(0, 6);
  if (rows.length === 0) return;

  const card = t.list === "card";
  const width = c.w - c.pad * 2;
  const { rowH, gap, startY } = planRows(top, bottom, rows.length, {
    min: 104 * u,
    max: 208 * u,
    gap: card ? 20 * u : 0,
    maxGap: card ? 46 * u : 30 * u,
  });

  const innerX = card ? c.pad + 30 * u : c.pad;
  const markerSize = Math.min(58 * u, rowH * 0.42);
  const markerW = style.marker === "number" ? markerSize * 1.5 : markerSize;
  const textX = innerX + markerW + 26 * u;
  const textW = c.w - c.pad - textX - (card ? 30 * u : 0);

  rows.forEach((item, i) => {
    const y = startY + i * (rowH + gap);

    if (card) {
      rect(c, c.pad, y, width, rowH, {
        fill: t.panel,
        radius: t.radius,
        stroke: t.border,
        strokeWidth: 2 * u,
      });
    } else if (i > 0) {
      hline(c, c.pad, c.w - c.pad, y - gap / 2, t.border, 2 * u);
    }

    const labelFit = fit(item.label, textW, {
      max: Math.min(40 * u, rowH * 0.3),
      min: 26 * u,
      weight: 700,
      maxLines: 1,
    });
    const detailFit = item.detail
      ? fit(item.detail, textW, {
          max: Math.min(27 * u, rowH * 0.2),
          min: 19 * u,
          weight: 400,
          maxLines: 2,
        })
      : EMPTY_FIT;

    const textH = labelFit.height + (detailFit.height > 0 ? 8 * u + detailFit.height : 0);
    let ty = y + (rowH - textH) / 2;

    if (style.marker === "number") {
      const numSize = markerSize;
      label(
        c,
        String(i + 1).padStart(2, "0"),
        innerX,
        y + rowH / 2 + numSize * 0.34,
        numSize,
        800,
        t.accent,
      );
    } else {
      const box = markerSize;
      const bx = innerX;
      const by = y + rowH / 2 - box / 2;
      rect(c, bx, by, box, box, {
        fill: t.accentSoft,
        stroke: t.accent,
        strokeWidth: 3 * u,
        radius: t.radius > 10 ? box * 0.3 : 2 * u,
      });
      checkMark(c, bx + box * 0.16, by + box * 0.16, box * 0.68, t.accent, 2.6);
    }

    ty += putWeighted(c, labelFit, 700, textX, ty, t.title);
    if (detailFit.height > 0) putWeighted(c, detailFit, 400, textX, ty + 8 * u, t.body);
  });
}

/* ------------------------------------------------------------------ */
/* 단계 · 프로세스                                                      */
/* ------------------------------------------------------------------ */

function processLayout(c: Ctx, steps: InfoVisualItem[], top: number, bottom: number) {
  const { t, u } = c;
  const rows = steps.slice(0, 5);
  if (rows.length === 0) return;

  const width = c.w - c.pad * 2;
  const arrowGap = 54 * u;
  const { rowH, gap, startY } = planRows(top, bottom, rows.length, {
    min: 110 * u,
    max: 190 * u,
    gap: arrowGap,
    maxGap: arrowGap * 1.8,
  });

  rows.forEach((step, i) => {
    const y = startY + i * (rowH + gap);
    const first = i === 0;

    rect(c, c.pad, y, width, rowH, {
      fill: first ? t.accent : t.panel,
      radius: t.radius,
      stroke: first ? undefined : t.border,
      strokeWidth: first ? undefined : 2 * u,
    });

    const badge = Math.min(64 * u, rowH * 0.46);
    const bx = c.pad + 30 * u;
    const by = y + rowH / 2 - badge / 2;
    rect(c, bx, by, badge, badge, {
      fill: first ? t.onAccent : t.accent,
      radius: t.radius > 10 ? badge / 2 : 3 * u,
    });
    label(
      c,
      String(i + 1).padStart(2, "0"),
      bx + badge / 2,
      by + badge / 2 + badge * 0.19,
      badge * 0.46,
      800,
      first ? t.accent : t.onAccent,
      "center",
    );

    const textX = bx + badge + 26 * u;
    const textW = c.w - c.pad - textX - 30 * u;
    const labelFit = fit(step.label, textW, {
      max: Math.min(38 * u, rowH * 0.29),
      min: 25 * u,
      weight: 700,
      maxLines: 1,
    });
    const detailFit = step.detail
      ? fit(step.detail, textW, {
          max: Math.min(26 * u, rowH * 0.2),
          min: 19 * u,
          weight: 400,
          maxLines: 2,
        })
      : EMPTY_FIT;

    const textH = labelFit.height + (detailFit.height > 0 ? 8 * u + detailFit.height : 0);
    let ty = y + (rowH - textH) / 2;
    ty += putWeighted(c, labelFit, 700, textX, ty, first ? t.onAccent : t.title);
    if (detailFit.height > 0) {
      putWeighted(c, detailFit, 400, textX, ty + 8 * u, first ? t.accentSoft : t.body);
    }

    if (i < rows.length - 1) {
      const arrowSize = Math.min(30 * u, gap * 0.42);
      downArrow(c, c.w / 2, y + rowH + (gap - arrowSize) / 2, arrowSize, t.accent);
    }
  });
}

/* ------------------------------------------------------------------ */
/* 비교                                                                 */
/* ------------------------------------------------------------------ */

function comparisonLayout(c: Ctx, plan: InfoVisualPlan, top: number, bottom: number) {
  const { t, u } = c;
  const data = plan.comparison;
  if (!data) return;

  const width = c.w - c.pad * 2;
  const gap = 28 * u;
  const colW = (width - gap) / 2;
  const height = bottom - top;

  const columns: Array<{ x: number; side: typeof data.left; fill: string; tone: string; strong: boolean }> = [
    { x: c.pad, side: data.left, fill: t.panelAlt, tone: t.muted, strong: false },
    { x: c.pad + colW + gap, side: data.right, fill: t.accentSoft, tone: t.accent, strong: true },
  ];

  for (const column of columns) {
    rect(c, column.x, top, colW, height, {
      fill: column.fill,
      radius: t.radius,
      stroke: column.strong ? t.accent : t.border,
      strokeWidth: column.strong ? 3 * u : 2 * u,
    });

    const innerPad = 28 * u;
    const innerW = colW - innerPad * 2;
    const headFit = fit(column.side.title, innerW, {
      max: 34 * u,
      min: 22 * u,
      weight: 800,
      maxLines: 2,
    });

    let y = top + innerPad + 6 * u;
    y += putWeighted(c, headFit, 800, column.x + innerPad, y, column.strong ? t.accent : t.body);
    y += 18 * u;
    hline(c, column.x + innerPad, column.x + colW - innerPad, y, column.strong ? t.accent : t.borderStrong, 3 * u);
    y += 26 * u;

    const rows = column.side.items.slice(0, 5);
    const bullet = 12 * u;
    const textX = column.x + innerPad + bullet + 16 * u;
    const textW = colW - innerPad * 2 - bullet - 16 * u;
    const spacing = Math.min(38 * u, Math.max(20 * u, (bottom - innerPad - y) / Math.max(1, rows.length) - 44 * u));

    for (const item of rows) {
      const itemFit = fit(item, textW, { max: 27 * u, min: 19 * u, weight: 500, maxLines: 2 });
      if (itemFit.height === 0) continue;
      rect(c, column.x + innerPad, y + itemFit.size * 0.34, bullet, bullet, {
        fill: column.strong ? t.accent : t.muted,
        radius: t.radius > 10 ? bullet / 2 : 0,
      });
      y += putWeighted(c, itemFit, 500, textX, y, column.strong ? t.title : t.body);
      y += spacing;
    }
  }
}

/* ------------------------------------------------------------------ */
/* 표                                                                   */
/* ------------------------------------------------------------------ */

function tableLayout(c: Ctx, plan: InfoVisualPlan, top: number, bottom: number) {
  const { t, u } = c;
  const data = plan.table;
  if (!data) return;

  const width = c.w - c.pad * 2;
  const col1 = width * 0.34;
  const col2 = width - col1;
  const cellPad = 24 * u;
  const rows = data.rows.slice(0, 6);
  const avail = bottom - top;

  // 글자 크기를 줄여가며 표 전체가 영역에 들어가는 크기를 찾는다
  let size = 28 * u;
  let headH = 86 * u;
  let heights: number[] = [];
  for (; size > 17 * u; size -= 1.5 * u) {
    headH = Math.max(70 * u, size * 2.7);
    heights = rows.map((row) => {
      const left = wrapText(row[0], col1 - cellPad * 2, size, 700, 3).length;
      const right = wrapText(row[1], col2 - cellPad * 2, size, 400, 3).length;
      return Math.max(78 * u, Math.max(left, right) * size * 1.44 + 36 * u);
    });
    const total = headH + heights.reduce((sum, h) => sum + h, 0);
    if (total <= avail) break;
  }

  let total = headH + heights.reduce((sum, h) => sum + h, 0);
  // 남는 공간이 많으면 행을 고르게 늘려 표가 허전해 보이지 않게 한다
  if (total < avail && rows.length > 0) {
    const extra = Math.min((avail - total) / rows.length, 44 * u);
    heights = heights.map((h) => h + extra);
    total = headH + heights.reduce((sum, h) => sum + h, 0);
  }

  const startY = top + Math.max(0, (avail - total) / 2);
  const strongHeader = t.id === "report" || t.id === "premium";

  // 바깥 테두리
  rect(c, c.pad, startY, width, total, {
    fill: t.page,
    radius: t.radius,
    stroke: t.borderStrong,
    strokeWidth: 3 * u,
  });

  // 헤더
  rect(c, c.pad, startY, width, headH, {
    fill: strongHeader ? t.accent : t.accentSoft,
    radius: t.radius,
  });
  if (t.radius > 0) {
    // 둥근 모서리가 아래로 이어지지 않도록 헤더 아래쪽을 덮는다
    rect(c, c.pad, startY + headH - t.radius, width, t.radius, {
      fill: strongHeader ? t.accent : t.accentSoft,
    });
  }
  const headColor = strongHeader ? t.onAccent : t.accent;
  const headBaseline = startY + headH / 2 + size * 0.36;
  label(c, data.headers[0], c.pad + cellPad, headBaseline, size, 700, headColor);
  label(c, data.headers[1], c.pad + col1 + cellPad, headBaseline, size, 700, headColor);
  hline(c, c.pad, c.w - c.pad, startY + headH, t.borderStrong, 3 * u);

  // 행
  let y = startY + headH;
  rows.forEach((row, i) => {
    const rowH = heights[i];
    if (t.list === "card" && i % 2 === 1) {
      rect(c, c.pad, y, width, rowH, { fill: t.panelAlt });
    }
    if (i > 0) hline(c, c.pad, c.w - c.pad, y, t.border, 2 * u);

    const leftFit = fit(row[0], col1 - cellPad * 2, {
      max: size,
      min: size * 0.78,
      weight: 700,
      maxLines: 3,
      lineHeightRatio: 1.44,
    });
    const rightFit = fit(row[1], col2 - cellPad * 2, {
      max: size,
      min: size * 0.78,
      weight: 400,
      maxLines: 3,
      lineHeightRatio: 1.44,
    });

    putWeighted(c, leftFit, 700, c.pad + cellPad, y + (rowH - leftFit.height) / 2, t.title);
    putWeighted(c, rightFit, 400, c.pad + col1 + cellPad, y + (rowH - rightFit.height) / 2, t.body);

    y += rowH;
  });

  // 열 구분선
  vline(c, c.pad + col1, startY, startY + total, t.border, 2 * u);
}

/* ------------------------------------------------------------------ */
/* 숫자 강조                                                            */
/* ------------------------------------------------------------------ */

function numberLayout(c: Ctx, plan: InfoVisualPlan, top: number, bottom: number) {
  const { t, u } = c;
  const highlight = plan.highlight;
  const items = plan.items.slice(0, 5);
  const width = c.w - c.pad * 2;
  const avail = bottom - top;

  const heroH = items.length > 0 ? Math.min(avail * 0.46, 460 * u) : avail;
  const numSize = Math.min(c.w * 0.34, heroH * 0.56);

  rect(c, c.pad, top, width, heroH, {
    fill: t.accentSoft,
    radius: t.radius,
    stroke: t.id === "premium" ? t.accent : undefined,
    strokeWidth: t.id === "premium" ? 3 * u : undefined,
  });

  const captionFit = highlight?.caption
    ? fit(highlight.caption, width - 60 * u, {
        max: 34 * u,
        min: 22 * u,
        weight: 600,
        maxLines: 2,
      })
    : EMPTY_FIT;

  const heroBlock = numSize * 0.9 + (captionFit.height > 0 ? 18 * u + captionFit.height : 0);
  let hy = top + Math.max(20 * u, (heroH - heroBlock) / 2);
  label(c, highlight?.value ?? "", c.w / 2, hy + numSize * 0.78, numSize, 800, t.accent, "center");
  hy += numSize * 0.9;
  if (captionFit.height > 0) {
    putWeighted(c, captionFit, 600, c.pad + 30 * u, hy + 18 * u, t.title, "center", width - 60 * u);
  }

  if (items.length === 0) return;

  // 아래 항목 — 번호 + 라벨 한 줄씩
  const listTop = top + heroH + 46 * u;
  const { rowH, gap, startY } = planRows(listTop, bottom, items.length, {
    min: 72 * u,
    max: 130 * u,
    gap: 0,
    maxGap: 24 * u,
  });

  items.forEach((item, i) => {
    const y = startY + i * (rowH + gap);
    if (i > 0) hline(c, c.pad, c.w - c.pad, y - gap / 2, t.border, 2 * u);

    const numW = 56 * u;
    label(c, String(i + 1), c.pad, y + rowH / 2 + rowH * 0.16, Math.min(40 * u, rowH * 0.46), 800, t.accent);

    const textX = c.pad + numW;
    const textW = width - numW;
    const labelFit = fit(item.label, textW, {
      max: Math.min(34 * u, rowH * 0.36),
      min: 22 * u,
      weight: 700,
      maxLines: 1,
    });
    const detailFit = item.detail
      ? fit(item.detail, textW, { max: 23 * u, min: 17 * u, weight: 400, maxLines: 1 })
      : EMPTY_FIT;

    const textH = labelFit.height + (detailFit.height > 0 ? 6 * u + detailFit.height : 0);
    let ty = y + (rowH - textH) / 2;
    ty += putWeighted(c, labelFit, 700, textX, ty, t.title);
    if (detailFit.height > 0) putWeighted(c, detailFit, 400, textX, ty + 6 * u, t.body);
  });
}

/* ------------------------------------------------------------------ */
/* 조립                                                                 */
/* ------------------------------------------------------------------ */

/** 내용이 비어 있을 때 최소한의 안내를 그린다 (빈 이미지 방지) */
function fallbackLayout(c: Ctx, plan: InfoVisualPlan, top: number, bottom: number) {
  const width = c.w - c.pad * 2;
  const purpose = fit(plan.purpose || plan.title, width, {
    max: 36 * c.u,
    min: 22 * c.u,
    weight: 600,
    maxLines: 4,
  });
  putWeighted(c, purpose, 600, c.pad, top + (bottom - top) * 0.3, c.t.body);
}

export function buildInfoScene(image: InfoVisualImage): RenderScene {
  const t = infoThemeOf(image.style);
  const u = image.width / 1080;

  const c: Ctx = {
    w: image.width,
    h: image.height,
    u,
    pad: t.pad * u,
    t,
    nodes: [],
  };

  const plan = image.plan;

  if (plan.type === "thumbnail") {
    thumbnailLayout(c, plan);
    return { width: c.w, height: c.h, background: t.page, nodes: c.nodes };
  }

  const top = drawHeader(c, plan);
  const bottom = c.h - c.pad;

  switch (plan.type) {
    case "summary":
      listLayout(c, plan.items, top, bottom, { marker: "number" });
      break;
    case "checklist":
      listLayout(c, plan.items, top, bottom, { marker: "check" });
      break;
    case "process":
      processLayout(c, plan.process ?? plan.items, top, bottom);
      break;
    case "comparison":
      comparisonLayout(c, plan, top, bottom);
      break;
    case "table":
      tableLayout(c, plan, top, bottom);
      break;
    case "number":
      numberLayout(c, plan, top, bottom);
      break;
    default:
      fallbackLayout(c, plan, top, bottom);
      break;
  }

  if (c.nodes.length === 0) fallbackLayout(c, plan, top, bottom);

  return { width: c.w, height: c.h, background: t.page, nodes: c.nodes };
}

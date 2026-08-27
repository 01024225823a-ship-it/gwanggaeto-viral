import { waitForFonts } from "@/lib/ai-blog/render/measure";
import type { RenderScene, SceneGradient, SceneNode } from "@/lib/ai-blog/render/scene";
import { RENDER_FONT_FAMILY } from "@/lib/ai-blog/render/scene";

/**
 * 렌더 장면 → PNG (다운로드).
 *
 * 미리보기(SVG)와 같은 장면 데이터를 캔버스에 그린다.
 * 좌표가 이미 출력 해상도 기준이므로 축소 캡처가 아니라 원본 크기로 그린다.
 *
 * 한글이 깨지지 않도록 그리기 전에 웹폰트 로딩을 기다린다.
 */

export class SceneExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SceneExportError";
  }
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function makeGradient(
  ctx: CanvasRenderingContext2D,
  gradient: SceneGradient,
  x: number,
  y: number,
  w: number,
  h: number,
): CanvasGradient {
  const [x1, y1, x2, y2] =
    gradient.direction === "horizontal"
      ? [x, y, x + w, y]
      : gradient.direction === "diagonal"
        ? [x, y, x + w, y + h]
        : [x, y, x, y + h];
  const g = ctx.createLinearGradient(x1, y1, x2, y2);
  g.addColorStop(0, gradient.from);
  g.addColorStop(1, gradient.to);
  return g;
}

/** 장면에 들어 있는 AI 그래픽을 먼저 받아둔다 */
async function preloadImages(scene: RenderScene): Promise<Map<string, HTMLImageElement>> {
  const hrefs = new Set(
    scene.nodes.filter((node): node is Extract<SceneNode, { kind: "image" }> => node.kind === "image").map((node) => node.href),
  );
  const loaded = new Map<string, HTMLImageElement>();

  await Promise.all(
    [...hrefs].map(
      (href) =>
        new Promise<void>((resolve) => {
          const image = new Image();
          image.crossOrigin = "anonymous";
          image.onload = () => {
            loaded.set(href, image);
            resolve();
          };
          // 실패해도 나머지는 그린다 (그 자리는 배경색으로 남는다)
          image.onerror = () => resolve();
          image.src = href;
        }),
    ),
  );

  return loaded;
}

function drawNode(
  ctx: CanvasRenderingContext2D,
  node: SceneNode,
  images: Map<string, HTMLImageElement>,
) {
  ctx.save();
  if ("opacity" in node && typeof node.opacity === "number") ctx.globalAlpha = node.opacity;

  if (node.kind === "rect") {
    ctx.setLineDash(node.dash ?? []);
    roundRectPath(ctx, node.x, node.y, node.w, node.h, node.radius ?? 0);
    if (node.gradient) {
      ctx.fillStyle = makeGradient(ctx, node.gradient, node.x, node.y, node.w, node.h);
      ctx.fill();
    } else if (node.fill) {
      ctx.fillStyle = node.fill;
      ctx.fill();
    }
    if (node.stroke) {
      ctx.strokeStyle = node.stroke;
      ctx.lineWidth = node.strokeWidth ?? 1;
      ctx.stroke();
    }
  } else if (node.kind === "circle") {
    ctx.setLineDash(node.dash ?? []);
    ctx.beginPath();
    ctx.arc(node.cx, node.cy, node.r, 0, Math.PI * 2);
    if (node.gradient) {
      ctx.fillStyle = makeGradient(
        ctx,
        node.gradient,
        node.cx - node.r,
        node.cy - node.r,
        node.r * 2,
        node.r * 2,
      );
      ctx.fill();
    } else if (node.fill) {
      ctx.fillStyle = node.fill;
      ctx.fill();
    }
    if (node.stroke) {
      ctx.strokeStyle = node.stroke;
      ctx.lineWidth = node.strokeWidth ?? 1;
      ctx.stroke();
    }
  } else if (node.kind === "line") {
    ctx.setLineDash(node.dash ?? []);
    ctx.strokeStyle = node.stroke;
    ctx.lineWidth = node.strokeWidth;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(node.x1, node.y1);
    ctx.lineTo(node.x2, node.y2);
    ctx.stroke();
  } else if (node.kind === "arrow") {
    ctx.fillStyle = node.fill;
    ctx.beginPath();
    if (node.direction === "right") {
      ctx.moveTo(node.x, node.y - node.size / 2);
      ctx.lineTo(node.x, node.y + node.size / 2);
      ctx.lineTo(node.x + node.size, node.y);
    } else {
      ctx.moveTo(node.x - node.size / 2, node.y);
      ctx.lineTo(node.x + node.size / 2, node.y);
      ctx.lineTo(node.x, node.y + node.size);
    }
    ctx.closePath();
    ctx.fill();
  } else if (node.kind === "path") {
    const scale = node.size / (node.viewport ?? 24);
    ctx.translate(node.x, node.y);
    ctx.scale(scale, scale);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const path = new Path2D(node.d);
    if (node.fill) {
      ctx.fillStyle = node.fill;
      ctx.fill(path);
    }
    if (node.stroke) {
      ctx.strokeStyle = node.stroke;
      ctx.lineWidth = node.strokeWidth ?? 2;
      ctx.stroke(path);
    }
  } else if (node.kind === "image") {
    const image = images.get(node.href);
    if (image) {
      if (node.radius) {
        roundRectPath(ctx, node.x, node.y, node.w, node.h, node.radius);
        ctx.clip();
      }
      // object-fit: cover 와 같은 방식으로 채운다
      const scale = Math.max(node.w / image.width, node.h / image.height);
      const dw = image.width * scale;
      const dh = image.height * scale;
      ctx.drawImage(image, node.x + (node.w - dw) / 2, node.y + (node.h - dh) / 2, dw, dh);
    }
  } else {
    ctx.fillStyle = node.color;
    ctx.font = `${node.weight} ${node.size}px ${RENDER_FONT_FAMILY}`;
    ctx.textAlign = node.align === "center" ? "center" : node.align === "right" ? "right" : "left";
    // SVG 의 기본 기준선(alphabetic)과 맞춘다
    ctx.textBaseline = "alphabetic";
    node.lines.forEach((line, i) => {
      ctx.fillText(line, node.x, node.y + i * node.lineHeight);
    });
  }

  ctx.restore();
}

/** 장면을 PNG Blob 으로 만든다 */
export async function sceneToBlob(scene: RenderScene, mimeType = "image/png"): Promise<Blob> {
  if (typeof document === "undefined") {
    throw new SceneExportError("브라우저에서만 이미지를 만들 수 있습니다.");
  }

  // 폰트가 준비되기 전에 그리면 한글이 폴백 폰트로 나가거나 빠진다
  await waitForFonts();
  const images = await preloadImages(scene);

  const canvas = document.createElement("canvas");
  canvas.width = scene.width;
  canvas.height = scene.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new SceneExportError("이미지를 그릴 수 없는 환경입니다.");

  if (scene.backgroundGradient) {
    ctx.fillStyle = makeGradient(ctx, scene.backgroundGradient, 0, 0, scene.width, scene.height);
  } else {
    ctx.fillStyle = scene.background;
  }
  ctx.fillRect(0, 0, scene.width, scene.height);

  for (const node of scene.nodes) drawNode(ctx, node, images);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, mimeType, 0.95);
  });

  if (!blob) throw new SceneExportError("이미지 파일을 만들지 못했습니다.");
  return blob;
}

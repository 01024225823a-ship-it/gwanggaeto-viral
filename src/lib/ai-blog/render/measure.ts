import { RENDER_FONT_FAMILY } from "@/lib/ai-blog/render/scene";

/**
 * 글자 폭 측정 · 줄바꿈.
 *
 * 미리보기(SVG)와 다운로드(Canvas)가 **같은 줄바꿈**을 그리도록,
 * 줄바꿈은 장면을 만들 때 한 번만 계산해서 결과를 장면에 넣어둔다.
 * 측정은 캔버스 measureText 로 한다 — 실제로 그릴 때와 같은 엔진이라 오차가 없다.
 */

let cachedContext: CanvasRenderingContext2D | null = null;

function measureContext(): CanvasRenderingContext2D | null {
  if (cachedContext) return cachedContext;
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  cachedContext = canvas.getContext("2d");
  return cachedContext;
}

/** 캔버스를 못 쓰는 환경(SSR)에서의 대략적인 폭 추정 */
function estimateWidth(text: string, size: number): number {
  let width = 0;
  for (const char of text) {
    const code = char.charCodeAt(0);
    // 한글·전각은 거의 정사각, 영문·숫자는 절반 남짓
    width += code >= 0x1100 && code <= 0xd7a3 ? size : size * 0.55;
  }
  return width;
}

export function measureText(text: string, size: number, weight: number): number {
  const ctx = measureContext();
  if (!ctx) return estimateWidth(text, size);
  ctx.font = `${weight} ${size}px ${RENDER_FONT_FAMILY}`;
  return ctx.measureText(text).width;
}

/**
 * 폭에 맞춰 줄을 나눈다.
 * 한국어는 어절 단위로 끊고, 한 어절이 너무 길면 글자 단위로 자른다.
 */
export function wrapText(
  text: string,
  maxWidth: number,
  size: number,
  weight: number,
  maxLines = 3,
): string[] {
  const value = text.replace(/\s+/g, " ").trim();
  if (!value) return [];

  const words = value.split(" ");
  const lines: string[] = [];
  let line = "";

  const pushLine = () => {
    if (line) lines.push(line);
    line = "";
  };

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (measureText(candidate, size, weight) <= maxWidth) {
      line = candidate;
      continue;
    }

    pushLine();
    if (lines.length >= maxLines) break;

    // 어절 하나가 한 줄보다 길면 글자 단위로 자른다
    if (measureText(word, size, weight) > maxWidth) {
      let chunk = "";
      for (const char of word) {
        if (measureText(chunk + char, size, weight) > maxWidth) {
          lines.push(chunk);
          chunk = char;
          if (lines.length >= maxLines) break;
        } else {
          chunk += char;
        }
      }
      line = chunk;
    } else {
      line = word;
    }

    if (lines.length >= maxLines) break;
  }

  if (lines.length < maxLines) pushLine();

  const result = lines.slice(0, maxLines);
  // 잘려나간 내용이 있으면 마지막 줄에 말줄임을 붙인다
  const rendered = result.join(" ");
  if (rendered.replace(/\s/g, "").length < value.replace(/\s/g, "").length && result.length > 0) {
    const last = result[result.length - 1];
    let trimmed = last;
    while (trimmed && measureText(`${trimmed}…`, size, weight) > maxWidth) {
      trimmed = trimmed.slice(0, -1);
    }
    result[result.length - 1] = `${trimmed}…`;
  }
  return result;
}

/** 웹폰트가 다 로드된 뒤에 그리도록 기다린다 (다운로드 글자 깨짐 방지) */
export async function waitForFonts(): Promise<void> {
  if (typeof document === "undefined") return;
  try {
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (!fonts) return;
    // 실제로 쓸 굵기를 미리 요청해두면 첫 렌더에서 폴백 폰트로 그려지는 일을 막는다
    await Promise.all([
      fonts.load(`700 64px ${RENDER_FONT_FAMILY}`),
      fonts.load(`400 32px ${RENDER_FONT_FAMILY}`),
    ]).catch(() => undefined);
    await fonts.ready;
  } catch {
    /* 폰트 API 를 못 쓰는 환경은 기본 폰트로 진행한다 */
  }
}
